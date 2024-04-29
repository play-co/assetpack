import { AtlasView } from './AtlasView';
import { checkExt, createNewAssetAt, swapExt } from '@play-co/assetpack-core';

import type { Asset, AssetPipe, PluginOptions } from '@play-co/assetpack-core';
import type { CompressOptions } from '@play-co/assetpack-plugin-image';

export type SpineAtlasCompressOptions = PluginOptions<'nc' | 'spine'> & CompressOptions;

export function spineAtlasCompress(_options?: SpineAtlasCompressOptions): AssetPipe<SpineAtlasCompressOptions>
{
    const defaultOptions = {
        ..._options,
        tags: {
            nc: 'nc',
            spine: 'spine',
            ..._options?.tags
        }
    };

    return {
        name: 'spine-atlas-compress',
        defaultOptions,
        test(asset: Asset, options)
        {
            return !asset.allMetaData[options.tags.nc]
                && checkExt(asset.path, '.atlas')
                && asset.metaData[options.tags.spine];
        },
        async transform(asset: Asset, options)
        {
            const formats = [];

            if (options.avif)formats.push('avif');
            if (options.png)formats.push('png');
            if (options.webp)formats.push('webp');

            const atlas = new AtlasView(asset.buffer);

            const textures = atlas.getTextures();

            const assets = formats.map((format) =>
            {
                const extension = `.${format}`;

                const newAtlas = new AtlasView(asset.buffer);

                const newFileName = swapExt(asset.filename, `${extension}.atlas`);

                textures.forEach((texture) =>
                {
                    newAtlas.replaceTexture(texture, swapExt(texture, extension));
                });

                const newAsset = createNewAssetAt(asset, newFileName);

                newAsset.buffer = newAtlas.buffer;

                return newAsset;
            });

            return assets;
        },
    };
}
