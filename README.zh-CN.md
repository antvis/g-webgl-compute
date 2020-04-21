# GWebGPUEngine

A WebGPU Engine for real-time rendering and GPGPU.

## 前置条件

安装 [Chrome Canary](https://www.google.com/chrome/canary/) 后，可以开启 `chrome://flags/#enable-unsafe-webgpu`。

目前本项目中的 Shader 基于 [GLSL 4.5](https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.50.pdf) 编写，通过 glslang (wasm) 转成二进制格式 SPIR-V，因此只能在 Chrome Canary 和 Edge Canary 中运行。
而 Safari 使用纯文本 WSL(Web Shading Language)，所以只能在 Safari Technology Preview 中运行。[浏览器实现进度](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)

因此现在网络上的各种 WebGPU 示例，有的只能用 Safari 打开，有的只能用 Chrome / Edge 打开。未来也可能由新着色语言 [Tint](https://docs.google.com/presentation/d/1qHhFq0GJtY_59rNjpiHU--JW4bW4Ji3zWei-gM6cabs/edit#slide=id.p) 统一。

## 示例

- [Fruchterman](https://antv.vision/GWebGPUEngine/?path=/story/gpgpu--fruchterman)
- [Flocking](https://antv.vision/GWebGPUEngine/?path=/story/gpgpu--flocking)

## 特性

- 基于 [ECS 架构](http://entity-systems.wikidot.com/) ，很多 3D 引擎例如 Unity 和 PlayCanvas 也是如此。在使用 TS 实现时还参考了：
  - [Entitas](https://github.com/sschmid/Entitas-CSharp)，基于 C#
  - [perform-ecs](https://github.com/fireveined/perform-ecs/)
  - [WickedEngine](https://github.com/turanszkij/WickedEngine)，基于 C++
- 基于 [inversify](https://github.com/inversify/InversifyJS/), 一个 IoC c 容器
- WebGPU 实现部分参考 [Babylon.js](https://github.com/BabylonJS/Babylon.js/blob/WebGPU/src/Engines/webgpuEngine.ts)
- 尝试移植一些可并行算法到 GPU 侧执行。相比 WebGL，WebGPU 支持 ComputeShader。目前已有很多成功案例：
  - tensorflow.js 除了默认后端 WebGL，也支持 WebGPU 和 WASM。
  - 简单的矩阵并行运算。[DEMO 🔗](https://observablehq.com/@yhyddr/gpu-matrix-compute)
  - 「Get started with GPU Compute on the Web」[🔗](https://developers.google.com/web/updates/2019/08/get-started-with-gpu-compute-on-the-web)
- 终极目标是让前端使用类 TS 语法编写 Shader 代码，降低 CPU -> GPU 算法实现的成本。

## TODO

- 基于 [FrameGraph](https://zhuanlan.zhihu.com/p/36522188) 定义渲染资源和流程
- WSL 兼容
- TS -> GLSL/WSL 转译

## Getting started

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

对于一些可并行的计算密集型任务，例如布局计算和粒子运动特效，可以使用 GPGPU 技术完成。
我们提供了一些内置的计算模型，你可以使用任何渲染技术对于计算结果进行展示（当然也可以用我们的渲染 API）。
```typescript
import { World } from '@antv/g-webgpu';

const world = new World(canvas, {
  engineOptions: {
    supportCompute: true,
  },
});

const compute = this.world.createComputePipeline({
  type: 'layout', // 'layout' | 'particle'
  shader: computeShaderGLSL, // Compute Shader
  particleCount: 1500, // dispatch 数目
  particleData: data, // 初始数据
  maxIteration: 8000, // 迭代次数，到达后结束触发 onCompleted 回调
  onCompleted: (finalParticleData) => {
    // 使用最终计算结果渲染
  },
});

// 传入 ComputeShader 的参数
this.world.addBinding(compute, 'simParams', simParamData, {
  binding: 1,
  type: 'uniform-buffer',
});
```

### 计算模型

目前我们提供了两种计算模型：
* `layout` 针对布局计算场景：
  * 每一帧需要 dispatch 多次，直至达到最大迭代次数，以便尽快完成计算
  * 通常需要设置最大迭代次数，完成后返回最终 GPUBuffer 数据，供用户渲染结果
* `particle` 针对粒子运动特效场景：
  * 每一帧只需要 dispatch 一次
  * 通常不需要设置最大迭代次数

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
