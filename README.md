# [WIP] GWebGPUEngine

A WebGPU Engine for real-time rendering and GPGPU. [中文](./README.zh-CN.md)

Wiki

- [How to use Compute Pipeline API](https://github.com/antvis/GWebGPUEngine/wiki/Compute-Pipeline-API)
- [How to write Compute Shader with Typescript](https://github.com/antvis/GWebGPUEngine/wiki/%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8-TS-%E8%AF%AD%E6%B3%95%E5%86%99-Compute-Shader)
- [Use case: add 2 vectors](https://github.com/antvis/GWebGPUEngine/wiki/%E5%AE%9E%E7%8E%B0%E5%90%91%E9%87%8F%E5%8A%A0%E6%B3%95)

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
- Use WebGPU by default and fallback to WebGL if not supported.
- We try to port some parallelizable algorithms to GPU side with **ComputeShader** implemented in WebGPU API. These algorithms are written with GLSL syntax now, but we hope using some TS-like languages in the future.
  [stardustjs](https://github.com/stardustjs/stardust/tree/dev/packages/stardust-core/src/compiler) has already done a lot of work.

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
const canvas = document.getElementById('application');

const world = new World(canvas, {
  engineOptions: {
    supportCompute: true,
  },
});

const compute = world.createComputePipeline({
  shader: `
    //...
  `,
  onCompleted: (result) => {
    console.log(result); // [2, 4, 6, 8, 10, 12, 14, 16]
    world.destroy();
  },
});

// bind 2 params to Compute Shader
world.setBinding(compute, 'vectorA', [1, 2, 3, 4, 5, 6, 7, 8]);
world.setBinding(compute, 'vectorB', [1, 2, 3, 4, 5, 6, 7, 8]);
```

Our Compute Shader using Typescript syntax：

```typescript
const vectorA: vec4[];
const vectorB: vec4[];

export function compute(threadId: int) {
  // get data of current thread by threadId
  const a = vectorA[threadId];
  const b = vectorB[threadId];

  // output result
  vectorA[threadId] = a + b;
}
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
