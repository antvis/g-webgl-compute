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
    let dx = 0, dy = 0;
    for (let j = 0; j < VERTEX_COUNT; j++) {
      if (i != j + 1) {
        const nextNode = this.u_Data[j];
        const xDist = currentNode[0] - nextNode[0];
        const yDist = currentNode[1] - nextNode[1];
        const dist = sqrt(xDist * xDist + yDist * yDist) + 0.01;
        if (dist > 0.0) {
          const repulsiveF = this.u_K2 / dist;
          dx += xDist / dist * repulsiveF;
          dy += yDist / dist * repulsiveF;
        }
      }
    }
    return [dx, dy];
  }

  calcGravity(currentNode: vec4): vec2 {
    const d = sqrt(currentNode[0] * currentNode[0] + currentNode[1] * currentNode[1]);
    const gf = 0.01 * this.u_K * this.u_Gravity * d;
    return [gf * currentNode[0] / d, gf * currentNode[1] / d];
  }

  calcAttractive(currentNode: vec4): vec2 {
    let dx = 0, dy = 0;
    const arr_offset = int(floor(currentNode[2] + 0.5));
    const length = int(floor(currentNode[3] + 0.5));
    const node_buffer: vec4;
    for (let p = 0; p < MAX_EDGE_PER_VERTEX; p++) {
      if (p >= length) break;
      const arr_idx = arr_offset + p;
      // when arr_idx % 4 == 0 update currentNodedx_buffer
      const buf_offset = arr_idx - arr_idx / 4 * 4;
      if (p == 0 || buf_offset == 0) {
        node_buffer = this.u_Data[int(arr_idx / 4)];
      }
      const float_j = buf_offset == 0 ? node_buffer[0] :
                      buf_offset == 1 ? node_buffer[1] :
                      buf_offset == 2 ? node_buffer[2] :
                                        node_buffer[3];
      const nextNode = this.u_Data[int(float_j)];
      const xDist = currentNode[0] - nextNode[0];
      const yDist = currentNode[1] - nextNode[1];
      const dist = sqrt(xDist * xDist + yDist * yDist) + 0.01;
      const attractiveF = dist * dist / this.u_K;
      if (dist > 0.0) {
        dx -= xDist / dist * attractiveF;
        dy -= yDist / dist * attractiveF;
      }
    }
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
    if (distLength > 0.0) {
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
}

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