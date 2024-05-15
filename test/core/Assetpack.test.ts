import fs from 'fs-extra';
import { existsSync } from 'node:fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { cacheBuster } from '../../src/cache-buster/cacheBuster.js';
import { AssetPack } from '../../src/core/AssetPack.js';
import { getHash } from '../../src/core/index.js';
import { logAssetGraph } from '../../src/core/utils/logAssetGraph.js';
import { pixiManifest } from '../../src/manifest/pixiManifest.js';
import {
    assetPath,
    createAssetPipe,
    createFolder,
    getCacheDir,
    getInputDir,
    getOutputDir
} from '../utils/index.js';

import type { AssetPipe } from '../../src/core/pipes/AssetPipe.js';
import type { MockAssetPipe } from '../utils/index.js';

const pkg = 'core';

describe('Core', () =>
{
    it('should add plugins', () =>
    {
        //
    });

    it('should run plugin function in order', async () =>
    {
        const testName = 'plugin-order';
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

        const plugin = createAssetPipe({
            folder: false,
            test: true,
            start: true,
            finish: true,
            transform: true,
        }) as MockAssetPipe;

        const assetpack = new AssetPack({
            entry: inputDir, cacheLocation: getCacheDir(pkg, testName),
            output: outputDir,
            pipes: [
                plugin as AssetPipe<any>,
            ],
            cache: false,
        });

        await assetpack.run();

        expect(plugin.start.mock.invocationCallOrder[0]).toBeLessThan(plugin.test.mock.invocationCallOrder[0]);
        expect(plugin.test.mock.invocationCallOrder[0]).toBeLessThan(plugin.transform.mock.invocationCallOrder[0]);
        expect(plugin.transform.mock.invocationCallOrder[0]).toBeLessThan(plugin.finish.mock.invocationCallOrder[0]);
    });

    it('should watch for changes', async () =>
    {
        const testName = 'watch-delete';
        const inputDir = `${getInputDir(pkg, testName)}/`;
        const outputDir = getOutputDir(pkg, testName);

        fs.removeSync(inputDir);

        createFolder(
            pkg,
            {
                name: testName,
                files: [{
                    name: 'json.json',
                    content: assetPath('json/json.json'),
                }],
                folders: [],
            });

        const testFile = join(inputDir, 'new-json-file.json');

        const assetpack = new AssetPack({
            entry: inputDir, cacheLocation: getCacheDir(pkg, testName),
            output: outputDir,
            cache: true,
        });

        await assetpack.watch();

        expect(existsSync(join(outputDir, 'json.json'))).toBe(true);

        fs.writeJSONSync(testFile, { nice: 'test' });

        await new Promise((resolve) =>
        {
            setTimeout(resolve, 1500);
        });

        expect(existsSync(join(outputDir, 'new-json-file.json'))).toBe(true);
        expect(existsSync(join(outputDir, 'json.json'))).toBe(true);
        fs.writeJSONSync(join(inputDir, 'json.json'), { nice: 'test' });

        fs.removeSync(testFile);

        await new Promise((resolve) =>
        {
            setTimeout(resolve, 1500);
        });

        await assetpack.stop();

        expect(existsSync(join(outputDir, 'new-json-file.json'))).toBe(false);
        expect(existsSync(join(outputDir, 'json.json'))).toBe(true);
        expect(fs.readJSONSync(join(outputDir, 'json.json'))).toStrictEqual({ nice: 'test' });
    });

    it('should delete previously hashed versions of an asset', { timeout: 10000 }, async () =>
    {
        const testName = 'watch-delete-hash';
        const inputDir = `${getInputDir(pkg, testName)}/`;
        const outputDir = getOutputDir(pkg, testName);

        createFolder(
            pkg,
            {
                name: testName,
                files: [{
                    name: 'json.json',
                    content: assetPath('json/json.json'),
                }],
                folders: [],
            });

        const testFile = join(inputDir, 'json.json');

        const assetpack = new AssetPack({
            entry: inputDir, cacheLocation: getCacheDir(pkg, testName),
            output: outputDir,
            cache: true,
            pipes: [
                cacheBuster(),
                pixiManifest(),
            ]
        });

        await assetpack.watch();

        const origHash = getHash(join(inputDir, 'json.json'));

        expect(existsSync(join(outputDir, `json-${origHash}.json`))).toBe(true);

        fs.writeJSONSync(testFile, { nice: 'test' });

        await new Promise((resolve) =>
        {
            setTimeout(resolve, 1500);
        });

        expect(existsSync(join(outputDir, `json-${origHash}.json`))).toBe(false);
        const newHash = getHash(join(inputDir, 'json.json'));

        expect(existsSync(join(outputDir, `json-${newHash}.json`))).toBe(true);

        fs.removeSync(testFile);

        await new Promise((resolve) =>
        {
            setTimeout(resolve, 1500);
        });

        await assetpack.stop();

        expect(existsSync(join(outputDir, `json-${origHash}.json`))).toBe(false);
        expect(existsSync(join(outputDir, `json-${newHash}.json`))).toBe(false);
        expect(fs.readJSONSync(join(outputDir, 'manifest.json'))).toStrictEqual({
            bundles: [
                {
                    name: 'default',
                    assets: []
                }]
        });
    });

    it('should ignore specified files when watching', async () =>
    {
        const testName = 'watch-ignore';
        const inputDir = getInputDir(pkg, testName);
        const outputDir = getOutputDir(pkg, testName);

        createFolder(
            pkg,
            {
                name: testName,
                files: [],
                folders: [{
                    name: 'scripts',
                    files: [{
                        name: 'json.json',
                        content: assetPath('json/json.json'),
                    }],
                    folders: [],
                }],
            });

        const testFile = join(inputDir, 'scripts/test.json');

        const assetpack = new AssetPack({
            entry: inputDir,
            output: outputDir,
            cache: false,
            ignore: ['**/scripts/**/*'],
        });

        await assetpack.watch();

        fs.writeJSONSync(testFile, { nice: 'test' });

        // wait a second...
        await new Promise((resolve) =>
        {
            setTimeout(resolve, 1500);
        });

        await assetpack.stop();

        expect(existsSync(join(outputDir, 'scripts/json.json'))).toBe(false);
        expect(existsSync(join(outputDir, 'scripts/test.json'))).toBe(false);
    });

    it('should provide the correct options overrides to the plugin', async () =>
    {
        const testName = 'plugin-options-override';
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
                        folders: [
                            {
                                name: 'test',
                                files: [],
                                folders: [],
                            }
                        ],
                    },
                ],
            });

        const plugin = createAssetPipe({
            folder: false,
            test: true,
            start: true,
            finish: true,
            transform: true,
        }) as MockAssetPipe;

        const assetpack = new AssetPack({
            entry: inputDir, cacheLocation: getCacheDir(pkg, testName),
            output: outputDir,
            pipes: [
                plugin as AssetPipe<any>,
            ],
            cache: false,
            assetSettings: [
                {
                    files: ['anything/**'],
                    settings: {
                        json: {
                            test: 'test',
                        },
                    },
                    metaData: [],
                },
            ],
        });

        await assetpack.run();

        const rootAsset = assetpack['_assetWatcher']['_root'].children[0];

        logAssetGraph(rootAsset);

        expect(rootAsset.children[0].settings).toStrictEqual({
            json: {
                test: 'test',
            },
        });

        expect(rootAsset.settings).toBeUndefined();
    });

    it('should not copy to output if transformed', () =>
    {
        //
    });

    it('should ignore specified files in config', () =>
    {
        //
    });

    it('should add tags from file config overrides', () =>
    {
        //
    });

    it('should add ignore tags from file config overrides and not process these files', () =>
    {
        //
    });
});
