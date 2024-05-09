import { describe, expect, it } from 'vitest';
import { createAssetPipe, createFolder, getCacheDir, getInputDir, getOutputDir } from '../../shared/test/index.js';
import { AssetPack } from '../../src/core/AssetPack.js';
import { extractTagsFromFileName } from '../../src/core/utils/extractTagsFromFileName.js';
import { generateCacheName } from '../../src/core/utils/generateCacheName.js';

import type { Asset } from '../../src/core/Asset.js';
import type { AssetPipe } from '../../src/core/index.js';

describe('Utils', () =>
{
    const pkg = 'core';

    it('should get path and file tags', async () =>
    {
        expect(true).toBe(true);
    });

    it('should extract tags from file name', async () =>
    {
        expect(extractTagsFromFileName('test')).toEqual({});
        expect(extractTagsFromFileName('test.json')).toEqual({});
        expect(extractTagsFromFileName('test{tag}.json')).toEqual({ tag: true });
        expect(extractTagsFromFileName('test{tag1}{tag2}.json')).toEqual({ tag1: true, tag2: true });
        expect(extractTagsFromFileName('test{tag1}{tag2=1}.json')).toEqual({ tag1: true, tag2: 1 });
        expect(extractTagsFromFileName('test{tag1=hi}.json')).toEqual({ tag1: 'hi' });
        expect(extractTagsFromFileName('test{tag1}{tag2=1&2}.json')).toEqual({ tag1: true, tag2: [1, 2] });
    });

    it('should allow for tags to be overridden', async () =>
    {
        const testName = 'tag-override';
        const inputDir = getInputDir(pkg, testName);
        const outputDir = getOutputDir(pkg, testName);

        createFolder(
            pkg,
            {
                name: testName,
                files: [],
                folders: [
                    {
                        name: 'anything',
                        files: [],
                        folders: [],
                    },
                ],
            });

        let counter = 0;
        const plugin = createAssetPipe({
            folder: true,
            test: ((asset: Asset, _options: any) =>
            {
                counter++;
                if (counter === 1) return false;

                expect(asset.allMetaData).toEqual({
                    override: [1, 2]
                });

                return true;
            }) as any,
            start: true,
            finish: true,
            transform: true,
        }) as AssetPipe<any>;

        const assetpack = new AssetPack({
            entry: inputDir, cacheLocation: getCacheDir(pkg, testName),
            output: outputDir,
            pipes: [
                plugin// as Plugin<any>
            ],
            cache: false,
            assetSettings: [
                {
                    files: ['**'],
                    metaData: {
                        override: [1, 2]
                    },
                },
            ]
        });

        await assetpack.run();
    });

    it('should create a unique cache name', async () =>
    {
        const cacheName = generateCacheName({
            entry: 'test',
            output: 'out',
            pipes: [
                {
                    name: 'test',
                    defaultOptions: { hi: 'there' }
                },
            ],
        });

        expect(cacheName).toEqual('9782a5400ded95c60849cf955508938b7efdc8a0');

        // change the settings:

        const cacheName2 = generateCacheName({
            entry: 'test',
            output: 'out',
            pipes: [
                {
                    name: 'test-2',
                    defaultOptions: { hi: 'there' }
                },
            ],
        });

        expect(cacheName2).toEqual('abdf0d02db2c221346e31f61331e5880deff6f4e');

        // change the settings:

        const cacheName3 = generateCacheName({
            entry: 'test',
            output: 'out',
            pipes: [
                {
                    name: 'test-2',
                    defaultOptions: { hi: 'bye!' }
                },
            ],
        });

        expect(cacheName3).toEqual('ab900fa81d7121ea46bd2eafe9e826633c1c48a0');
    });
});
