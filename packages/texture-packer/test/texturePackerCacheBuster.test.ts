import { readJSONSync } from 'fs-extra';
import glob from 'glob-promise';
import { assetPath, createFolder, getInputDir, getOutputDir } from '../../../shared/test/index';
import { texturePacker } from '../src/texturePacker';
import { texturePackerCacheBuster } from '../src/texturePackerCacheBuster';
import { AssetPack } from '@play-co/assetpack-core';
import { cacheBuster } from '@play-co/assetpack-plugin-cache-buster';

import type { File } from 'shared/test';

const pkg = 'texture-packer';

function genFolder(testName: string)
{
    const sprites: File[] = [];

    for (let i = 0; i < 10; i++)
    {
        sprites.push({
            name: `sprite${i}.png`,
            content: assetPath(pkg, `sp-${i + 1}.png`),
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
            entry: inputDir,
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
            const rawJson = readJSONSync(jsonFile);

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
