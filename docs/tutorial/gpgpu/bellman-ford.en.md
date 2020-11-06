---
title: Bellman-Ford 最短路径算法
order: 2
---

⚠️ 由于 WebGL 的 Compute Shader 实现完全不同（不支持所以采用 VS/FS 模拟），因此本文中的示例都仅能在支持 WebGPU 的浏览器中运行。

最终效果可以参考这个[示例](/zh/examples/gpgpu/graph/sssp)。

# 问题背景

最短路径问题是图论研究中的一个经典算法问题，旨在寻找图（由节点和路径组成的）中两节点之间的最短路径。

其中一种算法具体的形式为：确定起点的最短路径问题，简称为 SSSP(Single source shortest path)。

例如下图展示了以 `A` 为起点，到所有点的最短路径：
https://www.lewuathe.com/illustration-of-distributed-bellman-ford-algorithm.html
![](https://gw.alipayobjects.com/mdn/rms_6ae20b/afts/img/A*Z14rR51YAyUAAAAAAAAAAAAAARQnAQ)

除了起点到所有点的路径值，也需要输出上一跳的节点。例如上图中 `E` 点的上一跳为 `D`。

# 串行算法

在图 `G(V, E)` (V 是顶点数目，E 是边的数目)中，Bellman-Ford 算法对所有边进行 `V - 1` 次“松弛”操作。算法复杂度为 `O(V * E)`，优点是支持负权重的边。

其中对于边的“松弛”操作指：有 `s` 到 `uv` 的距离分别为 `d[u]` 和 `d[v]`，如果我们发现从 `s` 途径 `u` 最终到 `v` 的距离更短，就更新 `d[v]`。
（下图来自 https://towardsdatascience.com/bellman-ford-single-source-shortest-path-algorithm-on-gpu-using-cuda-a358da20144b）：

![](https://gw.alipayobjects.com/mdn/rms_6ae20b/afts/img/A*QhvGTp9mt3EAAAAAAAAAAAAAARQnAQ)

串行算法伪代码如下：
![](https://gw.alipayobjects.com/mdn/rms_6ae20b/afts/img/A*rEh_RI-sPtUAAAAAAAAAAAAAARQnAQ)

用 JS 实现也并不困难：https://github.com/trekhleb/javascript-algorithms/tree/master/src/algorithms/graph/bellman-ford。

# 并行算法

## 存储结构

当我们想把一个原本在 CPU 中执行的串行算法移植到 GPU 中执行时，首先要考虑数据结构的存储问题。在 JS 中我们可以任意使用堆上的对象，但在 GPU 的内存模型中只有线性存储，简单来说我们只能使用一维数组（矩阵也可以用一维数组表示）存储。

使用邻接矩阵(adjacency matrix)存储图是最直接的，但对于一个稀疏图来说会造成很大的存储空间浪费。

![邻接矩阵](https://gw.alipayobjects.com/mdn/rms_6ae20b/afts/img/A*72uKSpHHVNQAAAAAAAAAAAAAARQnAQ)

邻接表(adjacency list)则要紧凑的多，整个结构分成两部分，分别存储点和边的数据。在点的部分存储的是边的偏移量，据此找到每个点的所有边，而边的部分存储的是终点的索引。以下图为例，第一个点存储的偏移量为 0，我们就知道第一个点的边应该从偏移量 0 处开始找起，通常还会存储该点拥有的边数目，例如 2，因此 `0 -> 8` 和 `0 -> 6` 这两条边就表示出来了。

![邻接表](https://gw.alipayobjects.com/mdn/rms_6ae20b/afts/img/A*Ln9iSKyPaecAAAAAAAAAAAAAARQnAQ)

在实际存储中又有很多可以优化点，在进一步压缩 GPU 内存的同时，也考虑了对于顺序读的优化：
* 将点和边的数组合成一个
* 充分利用每个向量的 RGBA 四个分量。在节点数据部分，分别存储每个节点的位置（xy）、边的偏移量（offset）和边的数目（length）。在边的数据部分存储的是终点的索引

![](https://user-images.githubusercontent.com/3608471/77870977-65a0d280-7275-11ea-9065-3d3588825cba.png)

这个通用的结构需要根据不同的图算法进行调整，例如在我们的最短路径算法中，并不关心节点的位置，同时在每条边的数据中，除了终点索引还需要存储边的权重（weight）。

## 算法实现

### 邻接表

整个数据结构分成节点和边两部分，其中每个节点使用一个完整的 `vec4`：
* R 分量存储到该节点的最短路径距离，初始状态下，如果当前节点为源节点距离为 0，否则为 `MAX_DISTANCE`(本例中设置成 10000)
* G 分量存储到该节点的最短路径上一跳节点索引，例如源节点为 `A`，当前节点 `C` 的最小路径为 `A -> B -> D -> C`，存储的就是节点 `D` 的索引
* B 分量存储该节点边数据在整个数组中的偏移量
* A 分量存储该节点拥有的边数目

而每一条边只需要使用 `vec4` 的一半存储终点索引和权重。
```
                              +----------------------+-----------------------+
                              |       vertex         |          edge         |
                              |---+---+---+----------|---+---+---+-----------|
                              |v1 |v2 |v3 |  ...     |   |   |   |  ...      |
                              |---|---+---+----------+---+---+---+-----------+
                              |   |                  |   |
<-----------------------------+   +--------------->  v   +--------------------------------------------->

+------------+-----------+-----------+------------+  +------------+-----------+-----------+------------+
|  distance  |predecessor|  offset   | edge length|  |    v2      | v12's weight   v3     |v13's weight|
|            |           |           |            |  |            |           |           |            |
|     R      |     G     |     B     |     A      |  |     R      |     G     |     B     |     A      |
+------------+-----------+-----------+------------+  +------------+-----------+-----------+------------+
```

### 核函数

每个线程组大小为 `[16, 1, 1]`，其中每个线程负责处理一个节点，整个计算程序将运行 `|V| - 1` 次：
```javascript
kernel = world
  .createKernel(precompiledBundle)
  .setDispatch([Math.ceil(vertexNum / 16), 1, 1])
  .setMaxIteration(vertexNum - 1); // relax all edges |V|-1 times
```

在核函数中，我们为每个线程组声明了一个共享内存：
```javascript
@numthreads(16, 1, 1)
class BellmanFord {
  @in @out
  gData: vec4[]; // 储存节点和边数据的邻接表

  @shared(16)
  sData: vec4[]; // 线程组间共享内存
}
```

计算逻辑包含如下步骤：
1. 每个线程需要从全局数组中拷贝自己处理的节点数据到共享内存中
2. 对当前节点的所有边进行“松弛”操作，涉及线程组内同步
3. 完成计算后使用共享内存更新全局数组中当前节点数据（当前的最小距离和前序节点索引）

```javascript
@main
compute() {
  // 当前线程在当前线程组中的索引
  const tid = localInvocationID.x;
  // 当前线程在全局线程组中的索引
  const gid = workGroupID.x * workGroupSize.x + localInvocationID.x;

  if (gid >= VERTEX_COUNT) {
    return;
  }

  // 从全局数组中拷贝数据到共享内存中
  this.sData[tid] = this.gData[gid];
  barrier(); // 线程组间同步

  // 省略具体计算逻辑...

  // 计算完成后更新全局数组
  this.gData[gid].xy = this.sData[tid].xy;
}
```

“松弛”操作如下：
```javascript
const du = this.sData[tid].x;
const dv = this.sData[targetid].x;

if (du + weight < dv) {
  this.sData[targetid].x = du + weight;
  this.sData[targetid].y = tid;
  barrier();
}
```

# 最终效果

[示例](/zh/examples/gpgpu/graph/sssp)运行效果如下：
![](https://gw.alipayobjects.com/mdn/rms_6ae20b/afts/img/A*U_ynS4APYr8AAAAAAAAAAAAAARQnAQ)

# Benchmark

以下[示例](/zh/examples/gpgpu/graph/sssp#perf)测试了一个拥有 1k+ 点和 2k+ 边的图，在 Chrome Canary 中的运行效果，测试数据来自[netscience.out](https://github.com/pan-long/SSSP-on-GPU/blob/master/data/netscience.out)：
![](https://gw.alipayobjects.com/mdn/rms_6ae20b/afts/img/A*PlqfTZn-zboAAAAAAAAAAAAAARQnAQ)

# 参考资料

* [New Approach of Bellman Ford Algorithm on GPU using Compute Unified Design Architecture (CUDA)](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.695.9342&rep=rep1&type=pdf)
* [Accelerating large graph algorithms on the GPU using CUDA](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.102.4206&rep=rep1&type=pdf)
* [Bellman-Ford Single Source Shortest Path Algorithm on GPU using CUDA](https://towardsdatascience.com/bellman-ford-single-source-shortest-path-algorithm-on-gpu-using-cuda-a358da20144b)