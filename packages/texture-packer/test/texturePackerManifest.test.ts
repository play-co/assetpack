import { readJSONSync } from 'fs-extra';
import { assetPath, createFolder, getInputDir, getOutputDir } from '../../../shared/test/index';
import { texturePackerManifestMod } from '../src/texturePackerManifestMod';
import { AssetPack } from '@play-co/assetpack-core';
import { pixiManifest } from '@play-co/assetpack-plugin-manifest';
import { texturePacker } from '@play-co/assetpack-plugin-texture-packer';

import type { File } from '../../../shared/test/index';

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

describe('Texture Packer Compression', () =>
{
    it('should create a sprite sheet', async () =>
    {
        const testName = 'tp-manifest';
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
                pixiManifest(),
                texturePackerManifestMod(),
            ]
        });

        await assetpack.run();

        const manifest = readJSONSync(`${outputDir}/manifest.json`);

        expect(manifest.bundles[0].assets[0]).toEqual({

            alias: [
                'sprites'
            ],
            src: [
                'sprites.json'
            ],
            data: {
                tags: {
                    tps: true
                }
            }

        });
    });

    it('should create a multi page sprite sheet', async () =>
    {
        const testName = 'tp-manifest-multi-page';
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
                        maximumTextureSize: 512
                    },
                }),
                pixiManifest(),
                texturePackerManifestMod(),
            ]
        });

        await assetpack.run();

        const manifest = readJSONSync(`${outputDir}/manifest.json`);

        expect(manifest.bundles[0].assets).toEqual([
            {
                alias: [
                    'sprites-0'
                ],
                src: [
                    'sprites-0.json'
                ],
                data: {
                    tags: {
                        tps: true
                    }
                }
            },
            {
                alias: [
                    'sprites-1'
                ],
                src: [
                    'sprites-1.json'
                ],
                data: {
                    tags: {
                        tps: true
                    }
                }
            }
        ]);
    });
});
