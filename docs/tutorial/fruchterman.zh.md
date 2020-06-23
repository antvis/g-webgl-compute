---
title: Fruchterman 布局算法
order: 2
---

最终效果可以参考这个[示例](/zh/examples/tutorial/fruchterman)。

相比向量加法，这是一个有些复杂的算法，强烈推荐先阅读我们的[语法介绍](/zh/docs/api/syntax)。

# 问题背景

在 G6 中有该布局算法的 CPU 版实现：https://g6.antv.vision/zh/examples/net/furchtermanLayout#fruchtermanWebWorker

尽管节点数目并不多（本例中为 200+），但每个节点需要和其他节点进行大量计算，并且需要进行一定次数的迭代才能达到稳定（本例中为 8000 次）。 因此性能主要在计算而非渲染上。

在本文中，我们将尝试把这部分节点位置计算放在 GPU 侧，渲染仍使用 G6 原有的 Canvas 2D/SVG 技术。

# 算法

如果不熟悉该布局算法，可以参考 G6 的[原版 TS 实现](https://github.com/antvis/G6/blob/master/src/layout/fruchterman.ts)。简单来说在每一次迭代中，每一个节点的位置都需要和其他节点或者边计算斥力和引力，再加上重力完成该轮迭代后自身位置的更新，然后重复多次迭代。

下图来自 https://nblintao.github.io/ParaGraphL/
![](https://user-images.githubusercontent.com/3608471/77870416-f4aceb00-7273-11ea-82ad-3b297bd136f1.png)


# 数据结构设计

在 https://nblintao.github.io/ParaGraphL/ 的实现中，就充分考虑到了 GPU 内存的顺序读，同时尽可能压缩（例如每一个 Edge 的 rgba 分量都存储了临接节点的 index）：
![](https://user-images.githubusercontent.com/3608471/77870977-65a0d280-7275-11ea-9065-3d3588825cba.png)

以斥力计算（[G6 的实现](https://github.com/antvis/G6/blob/master/src/layout/fruchterman.ts#L209)）为例，需要遍历除自身外的全部其他节点，这全部都是顺序读操作。
同样的，在计算吸引力时，遍历一个节点的所有边也都是顺序读。
随机读只会出现在获取端点坐标时才会出现。

# 创建计算管线

这里有三点需要说明：

* 我们希望每一个线程组负责计算一个节点的位置，因此我们设置一个一维的线程网格，长度等于节点数目 `dispatch: [numParticles, 1, 1]`。
* 和之前向量加法的例子不同，布局计算需要运行多次达到稳定状态，这里我们设置 8000 次。
* 由于 Shader 中我们需要遍历所有节点和每个节点的所有边，因此涉及到循环长度，受限于 Shader 语法对于循环长度的严格限制（必须为常量或常量表达式），这里我们传入运行时计算的常量，即节点数和所有节点包含的最大边数目。参考 [常量](/zh/docs/api/syntax#常量)

```typescript
const compute = world.createComputePipeline({
  shader: gCode,
  dispatch: [numParticles, 1, 1], // 线程数等同节点数目
  maxIteration: MAX_ITERATION, // 8000 次迭代
  onCompleted: (finalParticleData) => {
    // 使用 g-canvas 渲染，数据中包含了最终的节点位置
  }
});

// 省略其他变量设置
world.setBinding(
  compute,
  'MAX_EDGE_PER_VERTEX',
  maxEdgePerVetex,
);
world.setBinding(compute, 'VERTEX_COUNT', numParticles);
```

# 实现

下面的代码应该很容易理解，尤其对于 G6 的开发者：
```typescript
import { globalInvocationID } from 'g-webgpu';

const SPEED_DIVISOR = 800;
const MAX_EDGE_PER_VERTEX;
const VERTEX_COUNT;

// 每个线程组仅包含一个线程
@numthreads(1, 1, 1)
class Fruchterman {
  @in @out
  u_Data: vec4[];

  @in
  u_K: float;

  @in
  u_K2: float;

  @in
  u_Gravity: float;

  @in
  u_Speed: float;

  @in
  u_MaxDisplace: float;

  calcRepulsive(i: int, currentNode: vec4): vec2 {
    // 省略遍历所有节点计算过程
    return [dx, dy];
  }

  calcGravity(currentNode: vec4): vec2 {
    const d = sqrt(currentNode[0] * currentNode[0] + currentNode[1] * currentNode[1]);
    const gf = 0.01 * this.u_K * this.u_Gravity * d;
    return [gf * currentNode[0] / d, gf * currentNode[1] / d];
  }

  calcAttractive(currentNode: vec4): vec2 {
    // 省略遍历当前节点所有边的计算过程
    return [dx, dy];
  }

  @main
  compute() {
    const i = globalInvocationID.x;
    const currentNode = this.u_Data[i];
    let dx = 0, dy = 0;

    if (i > VERTEX_COUNT) {
      this.u_Data[i] = currentNode;
      return;
    }

    // repulsive
    const repulsive = this.calcRepulsive(i, currentNode);
    dx += repulsive[0];
    dy += repulsive[1];

    // attractive
    const attractive = this.calcAttractive(currentNode);
    dx += attractive[0];
    dy += attractive[1];

    // gravity
    const gravity = this.calcGravity(currentNode);
    dx -= gravity[0];
    dy -= gravity[1];

    // speed
    dx *= this.u_Speed;
    dy *= this.u_Speed;

    // move
    const distLength = sqrt(dx * dx + dy * dy);
    const limitedDist = min(this.u_MaxDisplace * this.u_Speed, distLength);
    
    // 设置当前节点的最终位置
    this.u_Data[i] = [
      currentNode[0] + dx / distLength * limitedDist,
      currentNode[1] + dy / distLength * limitedDist,
      currentNode[2],
      currentNode[3]
    ];
  }
}

```

# 在 WebWorker 中完成计算（渲染）

运行[示例](/zh/examples/tutorial/fruchterman)时我们会发现，在计算完成前，页面会处于“卡住”的状态，显然我们的主线程太忙碌无法响应其他 UI 交互了。

那主线程在忙什么呢？一方面需要编译 TS 代码到 Shader 代码，另一方面需要在计算管线（WebGL 使用渲染管线，[详见](/zh/docs/api/implements)）中完成 8000 次计算（渲染）。虽然前者可以通过[预编译](/zh/docs/tutorial/add2vectors#预编译)解决，但如果我们能将这两部分工作都放在 WebWorker 中进行，就可以最大程度解放主线程。

这里我们需要引入 OffscreenCanvas 技术，从名字中可以看出，这是一种离屏渲染技术，可以在 WebWorker 中完成渲染，将结果同步给主线程。目前 WebGPU 尚不支持在 OffscreenCanvas 中渲染/计算（相关 [ISSUE](https://github.com/gpuweb/gpuweb/issues/403)），但 WebGL 中可以使用。事实上 Babylon.js 已经支持开发者[在 Worker 中创建引擎完成渲染](https://doc.babylonjs.com/how_to/using_offscreen_canvas)，我们在实现中也参考了这种用法，并没有内置 Worker 实现，而是将选择权交给开发者。

目前 GWebGPU 已经支持在 WebWorker 中运行，开发者要做的有三件事：
1. 在主线程中创建 WebWorker，创建 OffscreenCanvas
2. 在 WebWorker 中调用 GWebGPU 的[计算管线 API](/zh/docs/api/compute-pipeline) 完成计算，将计算结果传回主线程
3. 在主线程中使用计算结果

下面我们来看一下具体的做法。

## 创建 WebWorker

创建 WebWorker 的过程有两点需要注意：
1. 使用 [transferControlToOffscreen](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen) 将 Canvas 的控制权由主线程交给 Worker 线程
2. 通常我们会通过 `postMessage` 的第一个参数向 Worker 传参，但由于 OffscreenCanvas 是 [Transferable](https://developer.mozilla.org/en-US/docs/Web/API/Transferable) 的，因此这里需要使用到第二个参数

```typescript
// 主线程代码
import Worker from 'fruchterman.worker.ts';

// 创建 Worker
const worker = new Worker();

const canvas = document.createElement('canvas');
// 将 Canvas 控制权转交给 OffscreenCanvas
const offscreen = canvas.transferControlToOffscreen();

// 传递 OffscreenCanvas 给 worker，特别注意这里 postMessage 的第二个参数
worker.postMessage({ canvas: offscreen }, [offscreen]);
```

为了更方便地创建 WebWorker，推荐使用 Webpack 生态的 [worker-loader](https://github.com/webpack-contrib/worker-loader)，而目前 [workerize-loader](https://github.com/developit/workerize-loader/) 还不支持 `postMessage` 第二个参数 `transferable` [ISSUE](https://github.com/developit/workerize-loader/issues/51)，因此无法使用。

## 在 WebWorker 中计算

在 WebWorker 中的用法和之前我们在主线程的几乎一致，区别有两点：
1. 创建 `World` 时传入 `canvas` 参数，来自主线程的 OffscreenCanvas
2. 将计算结果以及其他数据通过 `postMessage` 传递给主线程

```typescript
// fruchterman.worker.ts
self.onmessage = async (evt) => {
  const canvas = evt.data.canvas;
  const world = new World({
    canvas, // 1. 传入 canvas 参数
    engineOptions: {
      supportCompute: true,
    },
  });

  const compute = world.createComputePipeline({
    // 省略传入 Shader 代码等参数
    onCompleted: (nodes) => {
      // 2. 传递计算结果和其他数据给主线程
      self.postMessage({
        nodes,
        edges,
      });
      world.destroy();
    },
  });

  // 省略传递 u_Data 等参数过程
};
```

## 在主线程中使用计算结果

在主线程中监听 `message` 事件，从事件对象附带的数据中获取计算结果，在主线程中完成后续操作，例如使用 Canvas 2D/SVG 绘制点、线等：
```typescript
worker.addEventListener('message', (e: MessageEvent) => {
  const { nodes, edges } = e.data;
  // 使用 worker 计算的结果渲染
  renderCircles(nodes);
  renderLines(edges);
});
```

# Benchmarks

以下都在 Chrome Canary 中运行，WebGPU 需要在支持的浏览器中打开，参考 [前置条件](/zh/docs/api/compute-pipeline#前置条件)。

| 实现方案 | 计算时间 | DEMO |
| ------------- | ------------- | ------------- |
| CPU(WebWorker)  | 80s  | [DEMO](https://g6.antv.vision/zh/examples/net/furchtermanLayout#fruchtermanWebWorker) |
| 运行时编译 + 计算 WebGL  | 5.05s  | [DEMO](/zh/examples/tutorial/fruchterman) |
| 运行时编译 + 计算 WebGPU  | 2.5s  | [DEMO](/zh/examples/tutorial/fruchterman) |
| 预编译 + 计算 WebGL  | 4.3s  | [DEMO](/zh/examples/tutorial/fruchterman#precompiled) |
| 预编译 + 计算 WebGPU  | 1.6s  | [DEMO](/zh/examples/tutorial/fruchterman#precompiled) |