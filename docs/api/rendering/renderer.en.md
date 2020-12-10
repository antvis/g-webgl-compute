---
title: Renderer
order: 1
---

`Renderer` 负责渲染一个或多个 `View`。通常我们有两种方式调用渲染方法：
1. 使用 rAF 逐帧渲染
2. 按需渲染

### renderer.render(...views: View[])

功能描述：渲染一个或多个 `View`

使用示例：

```ts
// 使用 rAF 逐帧渲染
const renderer = world.createRenderer();
const render = () => {
    renderer.render(view);
    frameId = window.requestAnimationFrame(render);
};
render();
```