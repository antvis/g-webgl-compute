---
title: View
order: 2
---

一个 `View` 承载了场景（Scene）和相机（Camera），描述了我们观察世界的范围和角度：
* 它是一个矩形，超出范围的场景对象将被裁剪不展示
* 每个 `View` 有独立的交互事件，互不影响
* 当我们想把世界（World）划分成多个独立渲染的场景（分屏渲染）时，应该首选多个 `View` 而不是创建多个世界

```ts
// 创建
const view = world
    .createView()
    .setCamera(camera) // 设置相机
    .setScene(scene); // 设置场景

// 渲染
renderer.render(view);
```

### view.setCamera(camera: Camera): View

功能描述：设置相机

使用示例：

```ts
// 创建
const view = world
    .createView()
// highlight-start
    .setCamera(camera) // 设置相机
// highlight-end
    .setScene(scene); // 设置场景
```

### view.setScene(scene: Scene): View

功能描述：设置场景

使用示例：

```ts
// 创建
const view = world
    .createView()
    .setCamera(camera) // 设置相机
// highlight-start
    .setScene(scene); // 设置场景
// highlight-end
```

### view.setViewport(params: { x: number; y: number; width: number; height: number }): View

功能描述：设置视口位置和尺寸，通常在两种场景下使用：

1. 响应 `resize` 事件，重新设置尺寸
2. 单 canvas 下多个 View 共存，实现分屏渲染效果，[示例](/zh/examples/rendering/interaction#multi-view)

使用示例：

```ts
const dpr = window.devicePixelRatio;
const width = canvas.clientWidth * dpr;
const height = canvas.clientHeight * dpr;

view.setViewport({
    x: 0,
    y: 0,
    width,
    height,
});
```