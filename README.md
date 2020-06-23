# [WIP] GWebGPUEngine

[![travis ci](https://travis-ci.com/antvis/GWebGPUEngine.svg?branch=master)](https://travis-ci.com/antvis/GWebGPUEngine) [![](https://flat.badgen.net/npm/v/@antv/g-webgpu?icon=npm)](https://www.npmjs.com/package/@antv/g-webgpu) ![最近提交](https://badgen.net/github/last-commit/antvis/GWebGPUEngine)

A WebGPU Engine for real-time rendering and GPGPU. [中文](./README.zh-CN.md)

https://gwebgpu.antv.vision/zh/docs/api/gwebgpu

## GPGPU

You can try to solve some compute-intensive tasks like layout & particle effects with GPGPU technique.
Use any rendering techniques(d3, g, Three.js or ours' rendering API if you like) when calculation is completed.

```typescript
const world = new World({
  engineOptions: {
    supportCompute: true,
  },
});

const compute = world.createComputePipeline({
  shader: `
    //...
  `,
  dispatch: [1, 1, 1],
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
