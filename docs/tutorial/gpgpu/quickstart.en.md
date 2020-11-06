---
title: Quick Start
order: 0
redirect_from:
  - /en/docs/tutorial
---

# GWebGPU

![GWebGPU 版本号](https://badgen.net/npm/v/@antv/g-webgpu)

## Use CDN

```html
<script src="https://unpkg.com/@antv/g-webgpu"></script>
```

We expose a global object `window.GWebGPU`：
```typescript
const world = window.GWebGPU.World.create({
  engineOptions: {
    supportCompute: true,
  },
});
const kernel = world.createKernel(precompiledBundle);
```

## Use @antv/g-webgpu

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

## Install VS Code Extension

[Install VS Code Extension](/en/docs/api/vscode-extension)

## Write your first parallel task

[Add 2 vectors](/en/docs/tutorial/gpgpu/add2vectors)
