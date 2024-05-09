import fs from 'fs-extra';
import { glob } from 'glob';
import { describe, expect, it } from 'vitest';
import { assetPath, createFolder, getCacheDir, getInputDir, getOutputDir } from '../../shared/test/index.js';
import { cacheBuster } from '../../src/cache-buster/index.js';
import { AssetPack } from '../../src/core/index.js';
import { compress, mipmap } from '../../src/image/index.js';
import { texturePacker } from '../../src/texture-packer/texturePacker.js';
import { texturePackerCacheBuster } from '../../src/texture-packer/texturePackerCacheBuster.js';
import { texturePackerCompress } from '../../src/texture-packer/texturePackerCompress.js';

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

describe('Texture Packer All', () =>
{
    it('should create a sprite sheet mip, compress and cache bust', async () =>
    {
        const testName = 'tp-all';
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
                        resolutions: { default: 1, low: 0.5 },
                    },
                }),
                mipmap({
                    resolutions: { default: 1, low: 0.5 },
                }),
                compress({
                    png: true,
                    jpg: true,
                    webp: true,
                }),
                texturePackerCompress({
                    png: true,
                    webp: true,
                }),
                cacheBuster(),
                texturePackerCacheBuster()
            ]
        });

        await assetpack.run();

        const globPath = `${outputDir}/*.{json,png,webp}`;
        const files = await glob(globPath);

        // need two sets of files
        expect(files.length).toBe(8);
        expect(files.filter((file) => file.endsWith('.json')).length).toBe(4);
        expect(files.filter((file) => file.endsWith('.png')).length).toBe(2);
        expect(files.filter((file) => file.endsWith('.webp')).length).toBe(2);
        expect(files.filter((file) => file.endsWith('.jpg')).length).toBe(0);

        const jsonFiles = files.filter((file) => file.endsWith('.json'));
        const pngFiles = files.filter((file) => file.endsWith('.png'));
        const webpFiles = files.filter((file) => file.endsWith('.webp'));

        // check that the files are correct
        jsonFiles.forEach((jsonFile) =>
        {
            const rawJson = fs.readJSONSync(jsonFile);
            const isHalfSize = jsonFile.includes('@0.5x');
            const isWebp = jsonFile.includes('.webp');
            const isPng = jsonFile.includes('.png');

            const checkFiles = (fileList: string[], isHalfSize: boolean, isFileType: boolean) =>
            {
                fileList.forEach((file) =>
                {
                    // remove the outputDir
                    file = file.replace(`${outputDir}/`, '');
                    const isFileHalfSize = file.includes('@0.5x');
                    const isFileFileType = file.includes(isWebp ? '.webp' : '.png');
                    const shouldExist = isHalfSize === isFileHalfSize && isFileType === isFileFileType;

                    shouldExist ? expect(rawJson.meta.image).toEqual(file) : expect(rawJson.meta.image).not.toEqual(file);
                });
            };

            if (isHalfSize)
            {
                if (isWebp)
                {
                    checkFiles(webpFiles, true, true);
                }
                else if (isPng)
                {
                    checkFiles(pngFiles, true, true);
                }
            }
            else
                if (isWebp)
                {
                    checkFiles(webpFiles, false, true);
                }
                else if (isPng)
                {
                    checkFiles(pngFiles, false, true);
                }
        });
    });
});
