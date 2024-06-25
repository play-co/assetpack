import fs from 'fs-extra';
import { glob } from 'glob';
import { createNewAssetAt, Logger, path, stripTags } from '../core/index.js';
import { packTextures } from './packer/packTextures.js';

import type { Asset, AssetPipe, PluginOptions } from '../core/index.js';
import type { PackTexturesOptions, TexturePackerFormat } from './packer/packTextures.js';

export interface TexturePackerOptions extends PluginOptions<'tps' | 'fix' | 'jpg' >
{
    texturePacker?: Partial<PackTexturesOptions>;
    resolutionOptions?: {
        /** A template for denoting the resolution of the images. */
        template?: string;
        /** An object containing the resolutions that the images will be resized to. */
        resolutions?: Record<string, number>;
        /** A resolution used if the fixed tag is applied. Resolution must match one found in resolutions. */
        fixedResolution?: string;
        /** The maximum size a sprite sheet can be before its split out */
        maximumTextureSize?: number;
    }
}

function checkForTexturePackerShortcutClashes(
    frames: Record<string, unknown>,
    shortcutClash: Record<string, boolean>
)
{
    const clashes: string[] = [];

    for (const i in frames)
    {
        if (!shortcutClash[i])
        {
            shortcutClash[i] = true;
        }
        else
        {
            clashes.push(i);
        }
    }

    if (clashes.length > 0)
    {
        // eslint-disable-next-line max-len
        Logger.warn(`[AssetPack][texturePacker] Texture Packer Shortcut clash detected for between ${clashes.join(', ')}. This means that 'nameStyle' is set to 'short' and different sprite sheets have frames that share the same name. Please either rename the files or set 'nameStyle' in the texture packer options to 'relative'`);
    }
}

export function texturePacker(_options: TexturePackerOptions = {}): AssetPipe<TexturePackerOptions>
{
    const defaultOptions = {
        resolutionOptions: {
            template: '@%%x',
            resolutions: { default: 1, low: 0.5 },
            fixedResolution: 'default',
            maximumTextureSize: 4096,
            ..._options.resolutionOptions,
        },
        texturePacker: {
            padding: 2,
            nameStyle: 'relative',
            ..._options.texturePacker,
        },
        tags: {
            tps: 'tps',
            fix: 'fix',
            jpg: 'jpg',
            ..._options.tags,
        }
    } as TexturePackerOptions;

    let shortcutClash: Record<string, boolean> = {};

    return {
        folder: true,
        name: 'texture-packer',
        defaultOptions,
        test(asset: Asset, options)
        {
            return asset.isFolder && asset.metaData[options.tags.tps as any];
        },

        async start()
        {
            // restart the clashes!
            shortcutClash = {};
        },

        async transform(asset: Asset, options)
        {
            const { resolutionOptions, texturePacker, tags } = options;

            const fixedResolutions: {[x: string]: number} = {};

            // eslint-disable-next-line max-len
            fixedResolutions[resolutionOptions.fixedResolution] = resolutionOptions.resolutions[resolutionOptions.fixedResolution];

            // skip the children so that they do not get processed!
            asset.skipChildren();

            const largestResolution = Math.max(...Object.values(resolutionOptions.resolutions));
            const resolutionHash = asset.allMetaData[tags.fix] ? fixedResolutions : resolutionOptions.resolutions;

            const globPath = `${asset.path}/**/*.{jpg,png,gif}`;
            const files = await glob(globPath);

            if (files.length === 0)
            {
                return [];
            }

            const texturesToPack = await Promise.all(files.map(async (f) =>
            {
                const contents = await fs.readFile(f);

                return { path: stripTags(path.relative(asset.path, f)), contents };
            }));

            const textureFormat = (asset.metaData[tags.jpg] ? 'jpg' : 'png') as TexturePackerFormat;

            const texturePackerOptions = {
                ...texturePacker,
                ...{
                    width: resolutionOptions?.maximumTextureSize,
                    height: resolutionOptions?.maximumTextureSize,
                },
                textureFormat,
            };

            const promises: Promise<void>[] = [];

            const assets: Asset[] = [];

            let checkedForClashes = false;

            Object.values(resolutionHash).sort((a, b) => b - a).forEach((resolution) =>
            {
                const scale = resolution / largestResolution;

                promises.push((async () =>
                {
                    const textureName = texturePackerOptions.textureName ?? stripTags(asset.filename);

                    const out = await packTextures({
                        ...texturePackerOptions,
                        textureName,
                        texturesToPack,
                        scale,
                        resolution,
                    });

                    const outPromises: Promise<void>[] = [];

                    for (let i = 0; i < out.textures.length; i++)
                    {
                        const { buffer, name } = out.textures[i];

                        const textureAsset = createNewAssetAt(asset, name);

                        textureAsset.buffer = buffer;

                        const { json, name: jsonName } = out.jsons[i];

                        const jsonAsset = createNewAssetAt(asset, jsonName);

                        if (!checkedForClashes)
                        {
                            checkedForClashes = true;
                            // check for shortcut clashes..
                            checkForTexturePackerShortcutClashes(json.frames, shortcutClash);
                        }

                        jsonAsset.buffer = Buffer.from(JSON.stringify(json, null, 2));

                        textureAsset.metaData[tags.fix] = true;

                        jsonAsset.transformData.page = i;

                        assets.push(textureAsset, jsonAsset);
                    }

                    await Promise.all(outPromises);
                })());
            });

            await Promise.all(promises);

            return assets;
        },

    };
}
