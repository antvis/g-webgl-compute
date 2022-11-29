# @antv/g-webgpu

```typescript
import { World } from '@antv/g-webgpu';

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
