# GWebGPUEngine

A WebGPU Engine for real-time rendering and GPGPU.

Wiki

- [如何使用 Compute Pipeline API](https://github.com/antvis/GWebGPUEngine/wiki/Compute-Pipeline-API)
- [如何用 Typescript 写 Compute Shader](https://github.com/antvis/GWebGPUEngine/wiki/%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8-TS-%E8%AF%AD%E6%B3%95%E5%86%99-Compute-Shader)
- [示例：向量加法](https://github.com/antvis/GWebGPUEngine/wiki/%E5%AE%9E%E7%8E%B0%E5%90%91%E9%87%8F%E5%8A%A0%E6%B3%95)

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
- WebGPU 实现部分参考 [Babylon.js](https://github.com/BabylonJS/Babylon.js/blob/WebGPU/src/Engines/webgpuEngine.ts)，默认使用 WebGPU，如果发现浏览器不支持自动降级到 WebGL。
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
// 获取 HTMLCanvasElement
const canvas = document.getElementById('application');

const world = new World(canvas, {
  engineOptions: {
    supportCompute: true,
  },
});

const compute = world.createComputePipeline({
  shader: `
    //...
  `, // 下一节的 Shader 文本
  onCompleted: (result) => {
    console.log(result); // [2, 4, 6, 8, 10, 12, 14, 16]
    world.destroy(); // 计算完成后销毁相关 GPU 资源
  },
});

// 绑定输入到 Compute Shader 中的两个参数
world.setBinding(compute, 'vectorA', [1, 2, 3, 4, 5, 6, 7, 8]);
world.setBinding(compute, 'vectorB', [1, 2, 3, 4, 5, 6, 7, 8]);
```

使用 TS 编写 Shader：

```typescript
const vectorA: vec4[];
const vectorB: vec4[];

export function compute(threadId: int) {
  // 获取当前线程处理的数据
  const a = vectorA[threadId];
  const b = vectorB[threadId];

  // 输出当前线程处理完毕的数据，即两个向量相加后的结果
  vectorA[threadId] = a + b;
  // 也可以写成 vectorB[threadId] = a + b;
  // 但要记住，受限于 WebGL 的实现我们只能输出一份数据
}
```

### 计算模型

目前我们提供了两种计算模型：

- `layout` 针对布局计算场景：
  - 每一帧需要 dispatch 多次，直至达到最大迭代次数，以便尽快完成计算
  - 通常需要设置最大迭代次数，完成后返回最终 GPUBuffer 数据，供用户渲染结果
  - [Flocking DEMO](https://antv.vision/GWebGPUEngine/?path=/story/gpgpu--flocking)
- `particle` 针对粒子运动特效场景：
  - 每一帧只需要 dispatch 一次
  - 通常不需要设置最大迭代次数
  - [Fruchterman DEMO](https://antv.vision/GWebGPUEngine/?path=/story/gpgpu--fruchtermanrenderwithg)

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
