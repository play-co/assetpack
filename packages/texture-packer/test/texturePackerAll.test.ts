import { readJSONSync } from 'fs-extra';
import { assetPath, createFolder, getInputDir, getOutputDir } from '../../../shared/test/index';
import { texturePacker } from '../src/texturePacker';
import { texturePackerCacheBuster } from '../src/texturePackerCacheBuster';
import { texturePackerCompress } from '../src/texturePackerCompress';
import { AssetPack } from '@play-co/assetpack-core';
import { cacheBuster } from '@play-co/assetpack-plugin-cache-buster';
import { compress, mipmap } from '@play-co/assetpack-plugin-image';

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

describe('Texture Packer All', () =>
{
    it('should create a sprite sheet mip, compress and cache bust', async () =>
    {
        const testName = 'tp-all';
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
                    jpg: true,
                    webp: true,
                }),
                cacheBuster(),
                texturePackerCacheBuster()
            ]
        });

        await assetpack.run();

        [
            {
                json: `sprites-dvKKlQ@0.5x.webp.json`,
                image: `sprites-g_W8Sw@0.5x.webp`,
            },
            {
                json: `sprites-RCqjNQ.webp.json`,
                image: `sprites-wXEUjA.webp`,
            },
            {
                json: `sprites-1Cv-Yg@0.5x.png.json`,
                image: `sprites-TV3-Lg@0.5x.png`,

            },
            {
                json: `sprites-FYLGeg.png.json`,
                image: `sprites-Ef_oOA.png`,
            }
        ].forEach(({ json, image }) =>
        {
            const jsonData = readJSONSync(`${outputDir}/${json}`);

            expect(jsonData.meta.image).toEqual(image);
        });
    });
});
