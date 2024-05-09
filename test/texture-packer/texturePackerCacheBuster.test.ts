import fs from 'fs-extra';
import { glob } from 'glob';
import { describe, expect, it } from 'vitest';
import { assetPath, createFolder, getCacheDir, getInputDir, getOutputDir } from '../../shared/test/index.js';
import { cacheBuster } from '../../src/cache-buster/index.js';
import { AssetPack } from '../../src/core/index.js';
import { texturePacker } from '../../src/texture-packer/texturePacker.js';
import { texturePackerCacheBuster } from '../../src/texture-packer/texturePackerCacheBuster.js';

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

describe('Texture Packer Cache Buster', () =>
{
    it('should create a sprite sheet and correctly update json', async () =>
    {
        const testName = 'tp-cache-bust';
        const inputDir = getInputDir(pkg, testName);
        const outputDir = getOutputDir(pkg, testName);

        genFolder(testName);

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
                cacheBuster(),
                texturePackerCacheBuster()
            ]
        });

        await assetpack.run();

        const globPath = `${outputDir}/*.{json,png}`;
        const files = await glob(globPath);
        // need two sets of files

        expect(files.length).toBe(2);
        expect(files.filter((file) => file.endsWith('.json')).length).toBe(1);
        expect(files.filter((file) => file.endsWith('.png')).length).toBe(1);

        const jsonFiles = files.filter((file) => file.endsWith('.json'));
        const pngFiles = files.filter((file) => file.endsWith('.png'));

        // check that the files are correct
        jsonFiles.forEach((jsonFile) =>
        {
            const rawJson = fs.readJSONSync(jsonFile);

            const checkFiles = (fileList: string[]) =>
            {
                fileList.forEach((file) =>
                {
                    // remove the outputDir
                    file = file.replace(`${outputDir}/`, '');

                    expect(rawJson.meta.image).toEqual(file);
                });
            };

            checkFiles(pngFiles);
        });
    });
});
