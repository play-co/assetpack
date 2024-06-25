import { checkExt, createNewAssetAt, swapExt } from '../core/index.js';

import type { Asset, AssetPipe, PluginOptions } from '../core/index.js';
import type { CompressOptions } from '../image/compress.js';

export type TexturePackerCompressOptions = PluginOptions<'tps' | 'nc'> & Omit<CompressOptions, 'jpg'>;

export function texturePackerCompress(
    _options?: TexturePackerCompressOptions,
): AssetPipe<TexturePackerCompressOptions>
{
    const defaultOptions = {
        ...{
            png: true,
            webp: true,
            avif: false,
        },
        ..._options,
        tags: {
            tps: 'tps',
            nc: 'nc',
            ..._options?.tags,
        },
    };

    return {
        name: 'texture-packer-compress',
        defaultOptions,
        test(asset: Asset, options)
        {
            return (
                asset.allMetaData[options.tags.tps]
                && !asset.allMetaData[options.tags.nc]
                && checkExt(asset.path, '.json')
            );
        },
        async transform(asset: Asset, options)
        {
            const formats = [];

            if (options.avif) formats.push('avif');
            if (options.png) formats.push('png');
            if (options.webp) formats.push('webp');

            const json = JSON.parse(asset.buffer.toString());

            const assets = formats.map((format) =>
            {
                const extension = `.${format}`;

                const newFileName = swapExt(asset.filename, `${extension}.json`);

                json.meta.image = swapExt(json.meta.image, extension);

                const newAsset = createNewAssetAt(asset, newFileName);
                const newJson = JSON.parse(JSON.stringify(json));

                if (newJson.meta.related_multi_packs)
                {
                    newJson.meta.related_multi_packs = (newJson.meta.related_multi_packs as string[]).map((pack) =>
                        swapExt(pack, `${extension}.json`),
                    );
                }

                newAsset.buffer = Buffer.from(JSON.stringify(newJson, null, 2));

                if (!newJson.meta.related_multi_packs)
                {
                    newAsset.metaData.mIgnore = true;
                }

                return newAsset;
            });

            return assets;
        },
    };
}
