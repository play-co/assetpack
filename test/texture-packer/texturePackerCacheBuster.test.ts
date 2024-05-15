import fs from 'fs-extra';
import { glob } from 'glob';
import { describe, expect, it } from 'vitest';
import { cacheBuster } from '../../src/cache-buster/index.js';
import { AssetPack } from '../../src/core/index.js';
import { texturePacker } from '../../src/texture-packer/texturePacker.js';
import { texturePackerCacheBuster } from '../../src/texture-packer/texturePackerCacheBuster.js';
import { createTPSFolder } from '../utils/createTPSFolder.js';
import { getCacheDir, getInputDir, getOutputDir } from '../utils/index.js';

const pkg = 'texture-packer';

describe('Texture Packer Cache Buster', () =>
{
    it('should create a sprite sheet and correctly update json', async () =>
    {
        const testName = 'tp-cache-bust';
        const inputDir = getInputDir(pkg, testName);
        const outputDir = getOutputDir(pkg, testName);

        createTPSFolder(testName, pkg);

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
