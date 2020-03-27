# [WIP] GWebGPUEngine

A WebGPU Engine for real-time rendering an GPGPU. [中文](./README.zh-CN.md)

[The current implementation status of the WebGPU API spec](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)

## Prerequisite

Please run in Chrome Canary() behind the flag `--enable-unsafe-webgpu`.The `chrome://flags/#enable-unsafe-webgpu` flag must be enabled.

## Features

- Based on [ECS Architecture](http://entity-systems.wikidot.com/) which has been used in many 3D engines like Unity and PlayCanvas, especially inspired by
  - [Entitas](https://github.com/sschmid/Entitas-CSharp)
  - [perform-ecs](https://github.com/fireveined/perform-ecs/)
  - [WickedEngine](https://github.com/turanszkij/WickedEngine).
- Based on [inversify](https://github.com/inversify/InversifyJS/), an IoC container implemented by TS.
- We try to port some parallelizable algorithms to GPU side with **ComputeShader** implemented in WebGPU API. These algorithms are written with GLSL syntax now, but we hope using some TS-like languages in the future.
  StarBust has already done a lot of work.

## Getting started

```typescript
const canvas = document.getElementById('application');
const world = new World(canvas);
```

## Resources

- [WebGPU Design](https://github.com/gpuweb/gpuweb/tree/master/design)
- [WebGPU Samples](https://github.com/austinEng/webgpu-samples)
- [Raw WebGPU](https://alain.xyz/blog/raw-webgpu)
- [WebGPU implementation in Rust](https://github.com/gfx-rs/wgpu)
- [awesome-webgpu](https://github.com/mikbry/awesome-webgpu)
- [Matrix Compute Online Demo](https://observablehq.com/@yhyddr/gpu-matrix-compute)
- [From WebGL to WebGPU](https://www.youtube.com/watch?v=A2FxeEl4nWw)
- [tensorflow.js WebGPU backend](https://github.com/tensorflow/tfjs/tree/master/tfjs-backend-webgpu)
- [get-started-with-gpu-compute-on-the-web](https://developers.google.com/web/updates/2019/08/get-started-with-gpu-compute-on-the-web#shader_programming)

## Contributing

Bootstrap with Yarn Workspace.

```bash
yarn install
```

Watch all the packages:

```bash
yarn watch
```

Run Storybook on `http://localhost:6006/`:

```bash
yarn storybook
```
