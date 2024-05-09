import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';
import { assetPath, createFolder, getCacheDir, getInputDir, getOutputDir } from '../../shared/test/index.js';
import { AssetPack } from '../../src/core/index.js';
import { compress } from '../../src/image/index.js';
import { texturePacker, texturePackerCompress } from '../../src/texture-packer/index.js';

import type { File } from '../../shared/test/index.js';

const pkg = 'texture-packer';

function genFolder(testName: string)
{
    const sprites: File[] = [];

    for (let i = 0; i < 10; i++)
    {
        sprites.push({
            name: `sprite${i}.png`,
            content: assetPath(`image/sp-${i + 1}.png`),
        });
    }
    createFolder(
        pkg,
        {
            name: testName,
            files: [],
            folders: [
                {
                    name: 'sprites{tps}',
                    files: sprites,
                    folders: [],
                },
            ],
        });
}

describe('Texture Packer Compression', () =>
{
    it('should create a sprite sheet', async () =>
    {
        const testName = 'tp-compression';
        const inputDir = getInputDir(pkg, testName);
        const outputDir = getOutputDir(pkg, testName);

        genFolder(testName);

        const compressOpt = {
            png: true,
            jpg: true,
            webp: true,
        };

        const assetpack = new AssetPack({
            entry: inputDir, cacheLocation: getCacheDir(pkg, testName),
            output: outputDir,
            cache: false,
            pipes: [
                texturePacker({
                    resolutionOptions: {
                        resolutions: { default: 1 },
                    },
                }),
                compress(compressOpt),
                texturePackerCompress(compressOpt),
            ]
        });

        await assetpack.run();

        const sheetPng = fs.readJSONSync(`${outputDir}/sprites.png.json`);
        const sheetWebp = fs.readJSONSync(`${outputDir}/sprites.webp.json`);

        expect(sheetPng.meta.image).toEqual(`sprites.png`);
        expect(sheetWebp.meta.image).toEqual(`sprites.webp`);
    });
});
