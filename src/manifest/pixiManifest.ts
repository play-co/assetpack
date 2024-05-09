import fs from 'fs-extra';
import {
    type Asset,
    type AssetPipe,
    path,
    type PipeSystem,
    stripTags
} from '../core/index.js';

export interface PixiBundle
{
    name: string;
    assets: PixiManifestEntry[];
}

export interface PixiManifest
{
    bundles: PixiBundle[];
}

export interface PixiManifestEntry
{
    alias: string | string[];
    src: string | string[];
    data?: {
        // tags: Tags;
        [x: string]: any;
    };
}

export interface PixiManifestOptions
{
    output?: string;
    createShortcuts?: boolean;
    trimExtensions?: boolean;
    includeMetaData?: boolean;
}

export function pixiManifest(_options: PixiManifestOptions = {}): AssetPipe<PixiManifestOptions>
{
    const defaultOptions = {
        output: 'manifest.json',
        createShortcuts: false,
        trimExtensions: false,
        includeMetaData: true,
        ..._options
    };

    return {
        name: 'pixi-manifest',
        defaultOptions,
        finish: async (asset: Asset, options, pipeSystem: PipeSystem) =>
        {
            const newFileName = path.dirname(options.output) === '.'
                ? path.joinSafe(pipeSystem.outputPath, options.output) : options.output;

            const defaultBundle: PixiBundle = {
                name: 'default',
                assets: []
            };

            const manifest: PixiManifest = {
                bundles: [defaultBundle]
            };

            collectAssets(asset, options, pipeSystem.outputPath, pipeSystem.entryPath, manifest.bundles, defaultBundle);
            filterUniqueNames(manifest);
            await fs.writeJSON(newFileName, manifest, { spaces: 2 });
        }
    };
}

function filterUniqueNames(manifest: PixiManifest)
{
    const nameMap = new Map<PixiManifestEntry, string[]>();

    manifest.bundles.forEach((bundle) =>
        bundle.assets.forEach((asset) => nameMap.set(asset, asset.alias as string[])));

    const arrays = Array.from(nameMap.values());
    const sets = arrays.map((arr) => new Set(arr));
    const uniqueArrays = arrays.map((arr, i) => arr.filter((x) => sets.every((set, j) => j === i || !set.has(x))));

    manifest.bundles.forEach((bundle) =>
    {
        bundle.assets.forEach((asset) =>
        {
            const names = nameMap.get(asset) as string[];

            asset.alias = uniqueArrays.find((arr) => arr.every((x) => names.includes(x))) as string[];
        });
    });
}

function collectAssets(
    asset: Asset,
    options: PixiManifestOptions,
    outputPath = '',
    entryPath = '',
    bundles: PixiBundle[],
    bundle: PixiBundle,
)
{
    if (asset.skip) return;

    let localBundle = bundle;

    if (asset.metaData.m || asset.metaData.manifest)
    {
        localBundle = {
            name: stripTags(asset.filename),
            assets: []
        };

        bundles.push(localBundle);
    }

    const bundleAssets = localBundle.assets;

    const finalAssets = asset.getFinalTransformedChildren();

    if (asset.transformChildren.length > 0)
    {
        bundleAssets.push({
            alias: getShortNames(stripTags(path.relative(entryPath, asset.path)), options),
            src: finalAssets
                .map((finalAsset) => path.relative(outputPath, finalAsset.path))
                .sort((a, b) => b.localeCompare(a)),
            data:  options.includeMetaData ? {
                tags: asset.allMetaData
            } : undefined
        });
    }

    asset.children.forEach((child) =>
    {
        collectAssets(child, options, outputPath, entryPath, bundles, localBundle);
    });

    // for all assets.. check for atlas and remove them from the bundle..
}

function getShortNames(name: string, options: PixiManifestOptions)
{
    const createShortcuts = options.createShortcuts;
    const trimExtensions = options.trimExtensions;

    const allNames = [];

    allNames.push(name);
    /* eslint-disable @typescript-eslint/no-unused-expressions */
    trimExtensions && allNames.push(path.trimExt(name));
    createShortcuts && allNames.push(path.basename(name));
    createShortcuts && trimExtensions && allNames.push(path.trimExt(path.basename(name)));
    /* eslint-enable @typescript-eslint/no-unused-expressions */

    return allNames;
}