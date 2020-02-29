# GWebGPUEngine

A WebGPU Engine for real-time rendering an GPGPU.

## 前置条件

安装 [Chrome Canary](https://www.google.com/chrome/canary/) 后，可以开启 `chrome://flags/#enable-unsafe-webgpu`。

目前本项目中的 Shader 基于 [GLSL 4.5](https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.50.pdf) 编写，通过 glslang (wasm) 转成二进制格式 SPIR-V，因此只能在 Chrome Canary 和 Edge Canary 中运行。
而 Safari 使用纯文本 WSL(Web Shading Language)，所以只能在 Safari Technology Preview 中运行。[浏览器实现进度](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)

因此现在网络上的各种 WebGPU 示例，有的只能用 Safari 打开，有的只能用 Chrome / Edge 打开。未来也可能由新着色语言 [Tint](https://docs.google.com/presentation/d/1qHhFq0GJtY_59rNjpiHU--JW4bW4Ji3zWei-gM6cabs/edit#slide=id.p) 统一。

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
const world = new World(canvas);
```

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
