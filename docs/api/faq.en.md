---
title: FAQ
order: 10
---

# 运行时编译 Shader 代码时间太长？

在运行时编译用户编写的 TypeScript 代码到目标平台会消耗很多时间。可以使用预编译技术可以让线上项目节约这部分时间。

具体做法可以参考我们的[教程](/zh/docs/tutorial/add2vectors#预编译)。

# 能在 Worker 中使用吗？

在 WebGL 实现中我们使用了 OffscreenCanvas 技术，在 Worker 线程中完成渲染计算，将结果传递给主线程。
目前 WebGPU 尚不支持。

具体做法可以参考我们的[教程](/zh/docs/tutorial/fruchterman#在-webworker-中完成计算（渲染）)。
