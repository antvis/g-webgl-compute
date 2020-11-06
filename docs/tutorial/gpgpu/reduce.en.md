---
title: Reduce 求和
order: 3
---

⚠️ 由于 WebGL 的 Compute Shader 实现完全不同（不支持所以采用 VS/FS 模拟），因此本文中的示例都仅能在支持 WebGPU 的浏览器中运行。

最终效果可以参考这个[示例](/zh/examples/tutorial/reduce)。

Reduce & Scan 都是经典的并行算法。在 tensorflow.js 中也有基于 WebGL 和 WebGPU 后端[不同的实现](https://github.com/tensorflow/tfjs/blob/master/tfjs-backend-webgpu/src/kernels/reduce_webgpu.ts#L63-L83)。

本文将参考「DirectCompute Optimizations and Best Practices」[🔗](http://on-demand.gputechconf.com/gtc/2010/presentations/S12312-DirectCompute-Pre-Conference-Tutorial.pdf)，从一个基础的 Reduce 求和实现出发，逐步改进算法。

相比之前简单向量加法的例子，在本文中开发者也将接触到一些新的概念和语法：

* 如何使用 TS 装饰器语法 `@shared` 声明线程组内共享变量
* 如何使用 `barrier` 进行线程间共享内存同步

强烈推荐先阅读[线程、共享内存与同步](/zh/docs/api/workgroup)。

## 算法背景

首先来看 Reduce 的定义：给一组数据，一个满足结合律的二元操作符 ⊕（我们的例子中为加法），那么 Reduce 可以表示为：
![image](https://user-images.githubusercontent.com/3608471/82658262-44e37080-9c59-11ea-8717-48d0b9fd3ddb.png)

不难发现这里是可以线程级并行的，例如下图中我们安排 16 个线程处理一个长度为 16 的数组，最终由 0 号线程将最终结果输出到共享内存的第一个元素中。

![image](https://user-images.githubusercontent.com/3608471/82658629-e8348580-9c59-11ea-860d-76b6f8f6bfc3.png)

## 基础版本

计算任务：计算 1024 * 1024 * 10 个元素的累加。

我们分配 1024 * 10 个线程组，每个线程组中包含 1024 个线程。即一个线程负责一个元素的运算。
```typescript
const kernel = world
  .createKernel(precompiledBundle) // 下面详细介绍
  .setDispatch([1024 * 10, 1, 1]) // 分配 1024 * 10 个线程组，每个线程组中包含 1024 个线程
```

有了以上的预备知识，我们可以着手实现一版基础算法了：
1. 从全局内存( gData )中将数据装载到共享内存( sData )内。
2. 进行同步( barrier )，确保对于线程组内的所有线程，共享内存数据都是最新的。
3. 在共享内存中进行累加，每个线程完成后都需要进行同步。
4. 最后所有线程计算完成后，在第一个线程中把共享内存中第一个元素写入全局输出内存中。

```typescript
import { workGroupSize, workGroupID, localInvocationID } from 'g-webgpu';

@numthreads(1024, 1, 1)
class Reduce {
  @in
  gData: float[]; // 输入

  @out(10240)
  oData: float[]; // 输出

  @shared(1024)
  sData: float[];

  @main
  compute() {
    const tid = localInvocationID.x;
    const i = workGroupID.x * workGroupSize.x + localInvocationID.x;

    this.sData[tid] = this.gData[i]; // 1
    barrier(); // 2

    for (let s = 1; s < workGroupSize.x; s*=2) {
      if (tid % (s * 2) == 0) {
        this.sData[tid] += this.sData[tid + s]; // 3
      }
      barrier();
    }
    if (tid == 0) {
      this.oData[workGroupID.x] = this.sData[0]; // 4
    }
  }
}
```

耗时 1888.53 ms

## 改进 2.0

以上的实现存在两个明显的问题：
1. 取模运算很慢
2. warp divergence 很低，即大部分线程都闲置了

![image](https://user-images.githubusercontent.com/3608471/82659818-e2d83a80-9c5b-11ea-9f82-24fda9772840.png)

```typescript
import { workGroupSize, workGroupID, localInvocationID } from 'g-webgpu';

@numthreads(1024, 1, 1)
class Reduce {
  @in
  gData: float[];

  @out(10240)
  oData: float[];

  @shared(1024)
  sData: float[];

  @main
  compute() {
    const tid = localInvocationID.x;
    const i = workGroupID.x * workGroupSize.x + localInvocationID.x;

    this.sData[tid] = this.gData[i];
    barrier();

    for (let s = 1; s < workGroupSize.x; s*=2) {
      const index = 2 * s * tid;
      if (index < workGroupSize.x) {
        this.sData[index] += this.sData[index + s];
      }
      barrier();
    }
    if (tid == 0) {
      this.oData[workGroupID.x] = this.sData[0];
    }
  }
}
```

耗时 1710.31 ms。

## 改进 3.0

线程组中的共享内存由很多定长的 bank 组成，每个 bank 中又分成了多个 word。如果一个线程组内的不同线程访问了同一个 bank 中的不同 word，就会造成 bank conflict 现象。
![](https://user-images.githubusercontent.com/3608471/82880024-66ea3500-9f70-11ea-9013-a9d477980152.png)

我们可以在每个迭代里增加步长而非减小步长，这样在多个线程里就不会同时访问了同一个 bank 里的不同 word。在我们的例子中，size 为 1024 的线程组中第一次迭代中第一个线程负责累加 0 和 512 号元素，第二次迭代负责累加 0 和 256 号元素。

![image](https://user-images.githubusercontent.com/3608471/82879753-fd6a2680-9f6f-11ea-8721-9ce44bc71268.png)

```typescript
import { workGroupSize, workGroupID, localInvocationID } from 'g-webgpu';

@numthreads(1024, 1, 1)
class Reduce {
  @in
  gData: float[];

  @out(10240)
  oData: float[];

  @shared(1024)
  sData: float[];

  @main
  compute() {
    const tid = localInvocationID.x;
    const i = workGroupID.x * workGroupSize.x + localInvocationID.x;

    this.sData[tid] = this.gData[i];
    barrier();

    for (let s = workGroupSize.x / 2; s > 0; s >>= 1) {
      if (tid < s) {
        this.sData[tid] += this.sData[tid + s];
      }
      barrier();
    }
    if (tid == 0) {
      this.oData[workGroupID.x] = this.sData[0];
    }
  }
}
```

耗时 1640.08 ms。

## 改进 4.0

以上 for 循环中 s 初始值就是 `workGroupSize.x` 的一半，这意味着一半的线程处于闲置状态。
我们可以缩减一半的线程组（10240 -> 5120），然后在循环开始前就完成一次累加：
```typescript
import { workGroupSize, workGroupID, localInvocationID } from 'g-webgpu';

@numthreads(1024, 1, 1)
class Reduce {
  @in
  gData: float[];

  @out(5120)
  oData: float[];

  @shared(1024)
  sData: float[];

  @main
  compute() {
    const tid = localInvocationID.x;
    const i = workGroupID.x * workGroupSize.x * 2 + localInvocationID.x;

    this.sData[tid] = this.gData[i] + this.gData[i + workGroupSize.x];
    barrier();

    for (let s = workGroupSize.x / 2; s > 0; s >>= 1) {
      if (tid < s) {
        this.sData[tid] += this.sData[tid + s];
      }
      barrier();
    }
    if (tid == 0) {
      this.oData[workGroupID.x] = this.sData[0];
    }
  }
}
```

耗时 1657.80 ms。

## [WIP]改进 5.0

unroll 计算结果有误。

```typescript
import { workGroupSize, workGroupID, localInvocationID } from 'g-webgpu';

@numthreads(1024, 1, 1)
class Reduce {
  @in
  gData: float[];

  @out(5120)
  oData: float[];

  @shared(1024)
  sData: float[];

  @main
  compute() {
    const tid = localInvocationID.x;
    const i = workGroupID.x * workGroupSize.x * 2 + localInvocationID.x;

    this.sData[tid] = this.gData[i] + this.gData[i + workGroupSize.x];
    barrier();

    for (let s = workGroupSize.x / 2; s > 32; s >>= 1) {
      if (tid < s) {
        this.sData[tid] += this.sData[tid + s];
      }
      barrier();
    }
    if (tid < 32) {
      this.sData[tid] += this.sData[tid + 32];
      this.sData[tid] += this.sData[tid + 16];
      this.sData[tid] += this.sData[tid + 8];
      this.sData[tid] += this.sData[tid + 4];
      this.sData[tid] += this.sData[tid + 2];
      this.sData[tid] += this.sData[tid + 1];
    }
    if (tid == 0) {
      this.oData[workGroupID.x] = this.sData[0];
    }
  }
}
```

## 参考资料

* 「DirectCompute Optimizations and Best Practices」[🔗](http://on-demand.gputechconf.com/gtc/2010/presentations/S12312-DirectCompute-Pre-Conference-Tutorial.pdf)
* 「Nvidia Reduce & Scan」[🔗](https://moderngpu.github.io/scan.html)
* 「Compute Shader 中的 Parallel Reduction 和 Parallel Scan」[🔗](https://zhuanlan.zhihu.com/p/113532940)