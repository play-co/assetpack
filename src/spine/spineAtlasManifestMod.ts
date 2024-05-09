import fs from 'fs-extra';
import { type Asset, type AssetPipe, findAssets, path } from '../core/index.js';
import { AtlasView } from './AtlasView.js';

export interface SpineManifestOptions
{
    output?: string;
}

/**
 * This pipe will modify the manifest generated by 'pixiManifest'. It will look for any images found in the atlas
 * files and remove them from the manifest. As the atlas files will be responsible for loading the textures.
 *
 * Once done, it rewrites the manifest.
 *
 * This should be added after the `pixiManifest` pipe.
 *
 * ensure that the same output path is passed to the pipe as the `pixiManifest` pipe. Otherwise
 * the manifest will not be found.
 *
 * As this pipe needs to know about all the textures in the texture files most of the work is done
 * in the finish method.
 *
 * Kind of like applying a patch at the end of the manifest process.
 *
 * @param _options
 * @returns
 */
export function spineAtlasManifestMod(_options: SpineManifestOptions = {}): AssetPipe<SpineManifestOptions>
{
    const defaultOptions = {
        output: 'manifest.json',
        ..._options
    };

    return {
        folder: false,
        name: 'spine-atlas-manifest',
        defaultOptions,

        async finish(asset: Asset, options, pipeSystem)
        {
            const atlasAssets = findAssets((asset) =>
                asset.extension === '.atlas' && asset.transformChildren.length === 0, asset, true);

            const manifestLocation = options.output;

            const newFileName = path.dirname(manifestLocation) === '.'
                ? path.joinSafe(pipeSystem.outputPath, manifestLocation) : manifestLocation;

            const manifest = fs.readJsonSync(newFileName);

            atlasAssets.forEach((atlasAsset) =>
            {
                const atlasView = new AtlasView(atlasAsset.buffer);

                atlasView.getTextures().forEach((texture) =>
                {
                    // relative path to the output folder
                    const texturePath = path.relative(pipeSystem.outputPath, path.joinSafe(atlasAsset.directory, texture));

                    findAndRemoveManifestAsset(manifest, texturePath);
                });
            });

            fs.writeJSONSync(newFileName, manifest, { spaces: 2 });
        }
    };
}

function findAndRemoveManifestAsset(manifest: any, assetPath: string)
{
    for (let i = 0; i < manifest.bundles.length; i++)
    {
        const assets = manifest.bundles[i].assets;

        const manifestAsset = assets.find((asset: {src: string[]}) =>

            asset.src.includes(assetPath)
        );

        if (manifestAsset)
        {
            assets.splice(assets.indexOf(manifestAsset), 1);
            break;
        }
    }
}