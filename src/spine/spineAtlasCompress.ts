import { checkExt, createNewAssetAt, swapExt } from '../core/index.js';
import { AtlasView } from './AtlasView.js';

import type { Asset, AssetPipe, PluginOptions } from '../core/index.js';
import type { CompressOptions } from '../image/index.js';

export type SpineAtlasCompressOptions = PluginOptions<'nc'> & Omit<CompressOptions, 'jpg'>;

export function spineAtlasCompress(_options?: SpineAtlasCompressOptions): AssetPipe<SpineAtlasCompressOptions>
{
    const defaultOptions = {
        ...{
            png: true,
            webp: true,
            avif: false,
        },
        ..._options,
        tags: {
            nc: 'nc',
            ..._options?.tags
        }
    };

    return {
        name: 'spine-atlas-compress',
        defaultOptions,
        test(asset: Asset, options)
        {
            return !asset.allMetaData[options.tags.nc]
                && checkExt(asset.path, '.atlas');
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
