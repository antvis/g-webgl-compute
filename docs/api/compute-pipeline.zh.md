---
title: 计算管线 API
order: 2
---

### 前置条件

- ⚠️ WebGL 中需要浏览器支持 `OES_texture_float` [扩展](https://developer.mozilla.org/en-US/docs/Web/API/OES_texture_float)。可以在 https://webglreport.com/ 中查看本机是否支持该扩展
- ⚠️ WebGPU 需要使用 Chrome/Edge Canary 运行，Safari Preview 由于使用 [WHLSL](https://webkit.org/blog/8482/web-high-level-shading-language/) 暂不支持，待后续完善 compiler 后支持

如果希望体验 WebGPU 的运行效果，或者使用一些 WebGPU 特有的特性（共享内存与同步），请先下载 Chrome/Edge Canary，开启 `chrome://flags/#enable-unsafe-webgpu`。

### 开启 GPGPU 支持

和 `RenderPipeline` 一样，我们需要先创建 `World` 并开启 GPGPU 支持：

```typescript
const world = new World(canvas, {
  engineOptions: {
    supportCompute: true,
  },
  onInit: (engine) => {
    console.log(engine.isFloatSupported());
  },
});
```

我们在 WebGL 的实现中使用了 OES_texture_float 扩展进行浮点数纹理的读写。但是该扩展存在一定兼容性问题，尤其是在移动端 和 Safari 中：http://webglstats.com/webgl/extension/OES_texture_float

为此在 `onInit` 回调中可以通过 `isFloatSupported` 查询当前浏览器的支持情况，如果发现不支持可以及时中断下面计算管线的创建，切换成 CPU 版本的算法。

未来我们会尝试在不支持该扩展的浏览器中做兼容，详见：https://github.com/antvis/GWebGPUEngine/issues/26。

### 创建 ComputePipeline

```typescript
const compute = world.createComputePipeline({
  shader: '',
  precompiled: true,
  dispatch: [1, 1, 1],
  maxIteration: 1,
  onCompleted: (result) => {},
  onIterationCompleted: (iteration: number) => {},
});
```

参数说明如下：

- `shader`: `string` **required** 符合 TS 语法的 Shader 文本。预编译模式下为编译后的 JSON 字符串。
- `precompiled`: `boolean` **optional** 是否开启预编译模式。能大幅减少运行时编译耗时。
- `dispatch`: `[number, number, number]` **required** 线程网格尺寸。
- `maxIteration`: `number` **optional** 执行迭代数。默认为 1，即运行一次后结束。在布局算法中需要迭代很多次后达到稳定，此时可传入。
- `onCompleted`: `function` **optional** 完成计算后回调。参数包含计算完成的数组数据。
- `onIterationCompleted`: `function` **optional** 每次迭代完成计算后回调。参数仅包含当前迭代次数，不包含当前迭代计算完成的数组数据。

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
