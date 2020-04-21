# [WIP] GWebGPUEngine

A WebGPU Engine for real-time rendering and GPGPU. [中文](./README.zh-CN.md)

Online Demo: [https://antv.vision/GWebGPUEngine/?path=/story/gpgpu--flocking](https://antv.vision/GWebGPUEngine/?path=/story/gpgpu--flocking)

[The current implementation status of the WebGPU API spec](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)

## Prerequisite

Please run in Chrome Canary() behind the flag `--enable-unsafe-webgpu`.The `chrome://flags/#enable-unsafe-webgpu` flag must be enabled.

## Demos

- [Fruchterman](https://antv.vision/GWebGPUEngine/?path=/story/gpgpu--fruchterman)
- [Flocking](https://antv.vision/GWebGPUEngine/?path=/story/gpgpu--flocking)

## Features

- Based on [ECS Architecture](http://entity-systems.wikidot.com/) which has been used in many 3D engines like Unity and PlayCanvas, especially inspired by
  - [Entitas](https://github.com/sschmid/Entitas-CSharp)
  - [perform-ecs](https://github.com/fireveined/perform-ecs/)
  - [WickedEngine](https://github.com/turanszkij/WickedEngine).
- Based on [inversify](https://github.com/inversify/InversifyJS/), an IoC container implemented by TS.
- We try to port some parallelizable algorithms to GPU side with **ComputeShader** implemented in WebGPU API. These algorithms are written with GLSL syntax now, but we hope using some TS-like languages in the future.
  StarBust has already done a lot of work.

## Getting started

rendering with Three.js-styled API:

```typescript
const canvas = document.getElementById('application');

// create a world
const world = new World(canvas);

// create a camera
const camera = world.createCamera({
  aspect: Math.abs(canvas.width / canvas.height),
  angle: 72,
  far: 100,
  near: 1,
});
world.getCamera(camera).setPosition(0, 5, 5);

// create a scene
const scene = world.createScene({ camera });

// create geometry, material and attach them to mesh
const boxGeometry = world.createBoxGeometry({
  halfExtents: vec3.fromValues(1, 1, 1),
});
const material = world.createBasicMaterial();
const mesh = world.createMesh({
  geometry: boxGeometry,
  material,
});

// add meshes to current scene
world.add(scene, mesh);
```

## GPGPU

You can try to solve some compute-intensive tasks like layout & particle effects with GPGPU technique.
Use any rendering techniques(d3, g, Three.js or ours' rendering API if you like) when calculation is completed.

```typescript
import { World } from '@antv/g-webgpu';

const world = new World(canvas, {
  engineOptions: {
    supportCompute: true,
  },
});

const compute = this.world.createComputePipeline({
  type: 'layout', // 'layout' | 'particle'
  shader: computeShaderGLSL, // your compute shader code
  particleCount: numParticles, // particle num, dispatch once for each particle
  particleData: data, // initial data
  maxIteration: MAX_ITERATION, // break loop with iteration
  onCompleted: (finalParticleData) => {
    // rendering with final calculated data
  },
});

// add params used in ComputeShader
this.world.addBinding(compute, 'simParams', simParamData, {
  binding: 1,
  type: 'uniform-buffer',
});
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
