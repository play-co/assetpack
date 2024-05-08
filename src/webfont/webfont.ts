import { checkExt, createNewAssetAt, path } from '../core/index.js';
import { fonts } from './fonts.js';

import type { Asset, AssetPipe, PluginOptions } from '../core/index.js';

export type WebfontOptions = PluginOptions<'wf'>;

export function webfont(_options?: Partial<WebfontOptions>): AssetPipe<WebfontOptions>
{
    const defaultOptions: WebfontOptions = {
        tags: {
            wf: 'wf',
            ..._options?.tags
        },
    };

    return {
        folder: false,
        name: 'webfont',
        defaultOptions,
        test(asset: Asset, options)
        {
            return asset.allMetaData[options.tags.wf] && checkExt(asset.path, '.otf', '.ttf', '.svg');
        },
        async transform(asset: Asset)
        {
            const ext = path.extname(asset.path);

            let buffer: Buffer | null = null;

            switch (ext)
            {
                case '.otf':
                    buffer = fonts.otf.to.woff2(asset.path);
                    break;
                case '.ttf':
                    buffer = fonts.ttf.to.woff2(asset.path);
                    break;
                case '.svg':
                    buffer = fonts.svg.to.woff2(asset.path);
                    break;
                default:
                    throw new Error(`{Assetpack] Unsupported font type: ${ext}`);
                    break;
            }

            const newFileName = asset.filename.replace(/\.(otf|ttf|svg)$/i, '.woff2');

            const newAsset = createNewAssetAt(asset, newFileName);

            newAsset.buffer = buffer;

            return [newAsset];
        }
    };
}
