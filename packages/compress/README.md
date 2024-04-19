# @assetpack/plugin-compress

AssetPack plugin for compressing images into different formats.

## Installation

```sh
npm install --save-dev @assetpack/plugin-compress
```

## Basic Usage

```js
import { compress } from "@assetpack/plugin-compress";

export default {
  ...
  plugins: {
    ...
    compress: compress(),
  },
};
```

## Options

### compressJpg

- `tags` - An object containing the tags to use for the plugin. Defaults to `{ nc: "nc" }`.
  - `nc` - The tag used to denote that the image should not be compressed. Can be placed on a folder or file.
- jpg: Any settings supported by [sharp](https://sharp.pixelplumbing.com/api-output#jpeg)
- png: Any settings supported by [sharp](https://sharp.pixelplumbing.com/api-output#png)
- webp: Any settings supported by [sharp](https://sharp.pixelplumbing.com/api-output#webp)
- avif: Any settings supported by [sharp](https://sharp.pixelplumbing.com/api-output#avif)
