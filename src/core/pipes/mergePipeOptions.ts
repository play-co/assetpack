import { merge } from '../utils/merge.js';

import type { Asset } from '../Asset.js';
import type { AssetPipe, PluginOptions } from './AssetPipe.js';

export function mergePipeOptions<T extends PluginOptions<any>>(pipe: AssetPipe<T>, asset: Asset): T
{
    if (!asset.settings) return pipe.defaultOptions;

    return merge.recursive(pipe.defaultOptions, asset.settings);
}
