---
title: 计算管线 API
order: 2
---

### 前置条件

- ⚠️ WebGL 中需要浏览器支持 `OES_texture_float` [扩展](https://developer.mozilla.org/en-US/docs/Web/API/OES_texture_float)
- ⚠️ WebGPU 需要使用 Chrome/Edge Canary 运行，Safari Preview 由于使用 WSL 暂不支持

### 开启 GPGPU 支持

和 `RenderPipeline` 一样，我们需要先创建 `World` 并开启 GPGPU 支持：

```typescript
const world = new World(canvas, {
  engineOptions: {
    supportCompute: true,
  },
});
```

### 创建 ComputePipeline

```typescript
const compute = world.createComputePipeline({
  shader: '',
  precompiled: true,
  dispatch: [1, 1, 1],
  maxIteration: 1,
  onComplete: (result) => {},
});
```

参数说明如下：

- `shader`: `string` **required** 符合 TS 语法的 Shader 文本。预编译模式下为编译后的 JSON 字符串。
- `precompiled`: `boolean` **optional** 是否开启预编译模式。能大幅减少运行时编译耗时。
- `dispatch`: `[number, number, number]` **required** 线程网格尺寸。
- `maxIteration`: `number` **optional** 执行迭代数。默认为 1，即运行一次后结束。在布局算法中需要迭代很多次后达到稳定，此时可传入。
- `onCompleted`: `function` **optional** 完成计算后回调。参数包含计算完成的数组数据。

由于我们使用了 ECS 架构，返回值为 Entity 即实体 ID，后续可使用该 ID 进行数据绑定操作。

### 绑定数据

ComputePipeline 创建完毕后，我们可以传入数据：

```typescript
world.setBinding(compute, 'u_Data', nodesEdgesArray);
```

参数说明如下：

- `Entity`: `number` **required** 实体 ID
- `BindingName`: 绑定数据名称，需要与 Shader 中全局作用域声明的运行时常量、变量保持一致
- `Data`: `number|number[]|TypedArray`: 绑定数据

无返回值。

### 获取预编译结果

```typescript
const compiledBundle = world.getPrecompiledBundle(compute);
```

参数说明如下：

- `Entity`: `number` **required** 实体 ID

返回值为 JSON 字符串。由于预编译无法获知运行时环境，因此我们会同时输出支持 WebGL 和 WebGPU 的 Shader 代码和上下文：

```
{"shaders":{"WebGPU":"\\n      #define SPEED_DIVISOR 800\\n      \\n        layout(std140, set = 0,
```
