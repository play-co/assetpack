import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';
import { assetPath, createFolder, getCacheDir, getInputDir, getOutputDir } from '../../shared/test/index.js';
import { AssetPack } from '../../src/core/index.js';
import { pixiManifest } from '../../src/manifest/index.js';
import { texturePacker } from '../../src/texture-packer/index.js';
import { texturePackerManifestMod } from '../../src/texture-packer/texturePackerManifestMod.js';

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
        const testName = 'tp-manifest';
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
                pixiManifest(),
                texturePackerManifestMod(),
            ]
        });

        await assetpack.run();

        const manifest = fs.readJSONSync(`${outputDir}/manifest.json`);

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
            entry: inputDir, cacheLocation: getCacheDir(pkg, testName),
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

        const manifest = fs.readJSONSync(`${outputDir}/manifest.json`);

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
