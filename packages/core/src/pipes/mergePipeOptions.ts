import { merge } from '../utils/merge';

import type { Asset } from '../Asset';
import type { AssetPipe, PluginOptions } from './AssetPipe';

export function mergePipeOptions<T extends PluginOptions<any>>(pipe: AssetPipe<T>, asset: Asset): T
{
    if (!asset.settings) return pipe.defaultOptions;

    return merge.recursive(pipe.defaultOptions, asset.settings);
}
