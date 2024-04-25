import type { AssetPackConfig } from '../config';
import objectHash from 'object-hash';

export function generateCacheName(options: AssetPackConfig)
{
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pipes, cache, ...configWithoutPlugins } = options;

    const optionsToHash: any = {
        ...configWithoutPlugins,
    };

    // get pipes
    pipes?.flat().forEach((pipe) =>
    {
        optionsToHash[pipe.name] = pipe.defaultOptions;
    });

    // make a hash..
    return objectHash(optionsToHash);
}
