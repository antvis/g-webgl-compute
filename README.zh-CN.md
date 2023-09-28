# @antv/g-webgl-compute

[![travis ci](https://travis-ci.com/antvis/GWebGPUEngine.svg?branch=master)](https://travis-ci.com/antvis/GWebGPUEngine) [![](https://flat.badgen.net/npm/v/@antv/g-webgpu?icon=npm)](https://www.npmjs.com/package/@antv/g-webgpu) ![最近提交](https://badgen.net/github/last-commit/antvis/GWebGPUEngine)
A WebGPU Engine for real-time rendering and GPGPU.

https://gwebgpu.antv.vision/zh/docs/api/gwebgpu

## GPGPU

对于一些可并行的计算密集型任务，例如布局计算和粒子运动特效，可以使用 GPGPU 技术完成。
我们提供了一些内置的计算模型，你可以使用任何渲染技术对于计算结果进行展示。

```typescript
import { World } from '@antv/g-webgl-compute';

const world = new World({
  engineOptions: {
    supportCompute: true,
  },
});

const compute = world.createComputePipeline({
  shader: `
    //...
  `, // 下一节的 Shader 文本
  dispatch: [1, 1, 1],
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
import { globalInvocationID } from 'g-webgpu';

@numthreads(8, 1, 1)
class Add2Vectors {
  @in @out
  vectorA: float[];

  @in
  vectorB: float[];

  sum(a: float, b: float): float {
    return a + b;
  }

  @main
  compute() {
    // 获取当前线程处理的数据
    const a = this.vectorA[globalInvocationID.x];
    const b = this.vectorB[globalInvocationID.x];

    // 输出当前线程处理完毕的数据，即两个向量相加后的结果
    this.vectorA[globalInvocationID.x] = this.sum(a, b);
  }
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

```bash
yarn start
```
