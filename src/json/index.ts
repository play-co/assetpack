import { checkExt, createNewAssetAt, Logger } from '../core/index.js';

import type { Asset, AssetPipe, PluginOptions } from '../core/index.js';

export type JsonOptions = PluginOptions<'nc'>;

export function json(_options: JsonOptions = {}): AssetPipe
{
    const defaultOptions = {
        tags: {
            nc: 'nc',
            ..._options?.tags
        }

    };

    return {
        name: 'json',
        folder: false,
        defaultOptions,
        test(asset: Asset, options)
        {
            return !asset.metaData[options.tags.nc] && checkExt(asset.path, '.json');
        },
        async transform(asset: Asset)
        {
            try
            {
                const json = JSON.parse(asset.buffer.toString());
                const compressedJsonAsset = createNewAssetAt(asset, asset.filename);

                compressedJsonAsset.buffer = Buffer.from(JSON.stringify(json));

                return [compressedJsonAsset];
            }
            catch (e)
            {
                Logger.warn(`[json] Failed to compress json file: ${asset.path}`);

                return [asset];
            }
        }
    };
}
