---
title: 快速上手
order: 0
redirect_from:
  - /zh/docs/tutorial
---

# GWebGPU

![GWebGPU 版本号](https://badgen.net/npm/v/@antv/g-webgpu)

## CDN 使用

```html
<script src="https://unpkg.com/@antv/g-webgpu"></script>
```

我们会暴露 `GWebGPU` 全局对象：
```typescript
const world = window.GWebGPU.World.create({
  engineOptions: {
    supportCompute: true,
  },
});
const kernel = world.createKernel(precompiledBundle);
```

## 使用 @antv/g-webgpu

```bash
npm install --save @antv/g-webgpu
```

```typescript
import { World } from '@antv/g-webgpu';

const world = World.create({
  engineOptions: {
    supportCompute: true,
  },
});
const kernel = world.createKernel(precompiledBundle);
```

## 安装 VS Code 扩展

[安装 VS Code 扩展](/zh/docs/api/vscode-extension)，获得更好的编程体验。

## 开始编写第一个并行计算任务

[两个向量相加](/zh/docs/tutorial/gpgpu/gpgpu/add2vectors)
