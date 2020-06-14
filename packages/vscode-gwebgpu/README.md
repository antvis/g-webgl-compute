# g-for-gwebgpu README

It's hard for frontend engineers to write compute shaders in GPGPU scenarios.
So we create a TypeScript-liked language in our [GWebGPU](https://gwebgpu.antv.vision) project.

For more information, refer to our docs: [https://gwebgpu.antv.vision/zh/docs/api/syntax](https://gwebgpu.antv.vision/zh/docs/api/syntax).

It's an example to add 2 vectors writing with our syntax.
```typescript
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
    const a = this.vectorA[globalInvocationID.x];
    const b = this.vectorB[globalInvocationID.x];
    this.vectorA[globalInvocationID.x] = this.sum(a, b);
  }
}
```

## Features

* syntax highlight with TextMate grammars

### 0.0.1

* syntax highlight with TextMate grammars
