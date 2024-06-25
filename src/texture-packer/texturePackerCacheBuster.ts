import fs from 'fs-extra';
import { checkExt, findAssets } from '../core/index.js';

import type { Asset, AssetPipe, PluginOptions } from '../core/index.js';

export type TexturePackerCacheBustOptions = PluginOptions<'tps'>;

/**
 * This should be used after the cache buster plugin in the pipes.
 * As it relies on the cache buster plugin to have already cache busted all files.
 * This corrects the sprite sheet files to point to the new cache busted textures.
 * At the same time it updates the hash of the files.
 *
 * As this pipe needs to know about all the textures in the texture files most of the work is done
 * in the finish method.
 *
 * Kind of like applying a patch at the end of the transform process.
 *
 * @param _options
 * @returns
 */
export function texturePackerCacheBuster(
    _options: TexturePackerCacheBustOptions = {}
): AssetPipe<TexturePackerCacheBustOptions>
{
    const defaultOptions = {
        tags: {
            tps: 'tps',
            ..._options.tags,
        },
    };

    const textureJsonFilesToFix: Asset[] = [];

    return {
        folder: false,
        name: 'texture-packer-cache-buster',
        defaultOptions,
        test(asset: Asset, options)
        {
            return asset.allMetaData[options.tags.tps] && checkExt(asset.path, '.json');
        },

        async transform(asset: Asset, _options)
        {
            textureJsonFilesToFix.push(asset);

            return [asset];
        },

        async finish(asset: Asset)
        {
            // first we retrieve the final transformed children - so the atlas files that have been copied
            // to the output folder.
            const jsonAssets = textureJsonFilesToFix.map((asset) => asset.getFinalTransformedChildren()[0]);

            // loop through all the json files back to front
            for (let i = jsonAssets.length - 1; i >= 0; i--)
            {
                // we are going to replace the textures in the atlas file with the new cache busted textures
                // as we do this, the hash of the atlas file will change, so we need to update the path
                // and also remove the original file.
                const jsonAsset = jsonAssets[i];
                const originalHash = jsonAsset.hash;
                const originalPath = jsonAsset.path;

                const json = JSON.parse(jsonAsset.buffer.toString());

                const texture = json.meta.image;

                const textureAssets = findAssets((asset) =>
                    asset.filename === texture, asset, true);

                // last transformed child is the renamed texture
                const cacheBustedTexture = textureAssets[0].getFinalTransformedChildren()[0];

                json.meta.image = cacheBustedTexture.filename;

                if (json.meta.related_multi_packs)
                {
                    json.meta.related_multi_packs = (json.meta.related_multi_packs as string[]).map((pack) =>
                    {
                        const foundAssets = findAssets((asset) =>
                            asset.filename === pack, asset, true);

                        return foundAssets[0].getFinalTransformedChildren()[0].filename;
                    });
                }

                jsonAsset.buffer = Buffer.from(JSON.stringify(json));
                jsonAsset.path = jsonAsset.path.replace(originalHash, jsonAsset.hash);
                fs.removeSync(originalPath);

                // rewrite..
                fs.writeFileSync(jsonAsset.path, jsonAsset.buffer);
            }

            textureJsonFilesToFix.length = 0;
        }
    };
}
