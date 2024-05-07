import { readFileSync } from 'fs-extra';
import glob from 'glob-promise';
import { assetPath, createFolder, getInputDir, getOutputDir } from '../../../shared/test';
import { spineAtlasCacheBuster } from '../src/spineAtlasCacheBuster';
import { AssetPack } from '@play-co/assetpack-core';
import { cacheBuster } from '@play-co/assetpack-plugin-cache-buster';

const pkg = 'spine';

describe('Spine Atlas Cache Buster', () =>
{
    it('should modify the atlas to include the correct file names when cache busting applied', async () =>
    {
        const testName = 'spine-atlas-cache-bust';
        const inputDir = getInputDir(pkg, testName);
        const outputDir = getOutputDir(pkg, testName);

        createFolder(
            pkg,
            {
                name: testName,
                files: [
                    {
                        name: 'dragon{spine}.atlas',
                        content: assetPath(pkg, 'dragon.atlas'),
                    },
                    {
                        name: 'dragon.png',
                        content: assetPath(pkg, 'dragon.png'),
                    },
                    {
                        name: 'dragon2.png',
                        content: assetPath(pkg, 'dragon2.png'),
                    },
                ],
                folders: [],
            });

        const assetpack = new AssetPack({
            entry: inputDir,
            output: outputDir,
            cache: false,
            pipes: [
                cacheBuster(),
                spineAtlasCacheBuster(),
            ]
        });

        await assetpack.run();

        const globPath = `${outputDir}/*.{atlas,png}`;
        const files = await glob(globPath);

        // need two sets of files
        expect(files.length).toBe(3);
        expect(files.filter((file) => file.endsWith('.atlas')).length).toBe(1);
        expect(files.filter((file) => file.endsWith('.png')).length).toBe(2);

        const atlasFiles = files.filter((file) => file.endsWith('.atlas'));
        const pngFiles = files.filter((file) => file.endsWith('.png'));

        // check that the files are correct
        atlasFiles.forEach((atlasFile) =>
        {
            const rawAtlas = readFileSync(atlasFile);

            const checkFiles = (fileList: string[]) =>
            {
                fileList.forEach((file) =>
                {
                    // remove the outputDir
                    file = file.replace(`${outputDir}/`, '');

                    expect(rawAtlas.includes(file)).toBe(true);
                });
            };

            checkFiles(pngFiles);
        });
    });
});
