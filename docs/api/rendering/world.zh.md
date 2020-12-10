---
title: World
order: 0
---

`World` 和 `canvas` 一一对应，通过静态方法 `World.create` 完成实例化。通过它，我们可以创建例如渲染器、场景、相机、材质、光源等对象。

```ts
// highlight-start
World.create(cfg: WorldOptions) => World
// highlight-end

const world = World.create({
  canvas: $canvas,
});
const renderer = world.createRenderer();
```

### WorldOptions.canvas

<description> _HTMLCanvasElement_ **required** </description>

图的 DOM 容器，可以传入该 DOM 的 id 或者直接传入容器的 HTML 节点对象。

### world.createRenderer()

功能描述：创建一个 Renderer

使用示例：

```ts
const renderer = world.createRenderer();
```

### world.createScene()

功能描述：创建一个 Scene

使用示例：

```ts
const scene = world.createScene();
```

### world.createCamera()

功能描述：创建一个 Camera

使用示例：

```ts
const camera = world.createCamera();
```

### world.createView()

功能描述：创建一个 View

使用示例：

```ts
const view = world.createView();
```

### world.createGeometry(type: Geometry, options)

功能描述：创建一个 Geometry

使用示例：

```ts
const boxGeometry = world.createGeometry(Geometry.BOX, {
    halfExtents: [1, 1, 1],
});
```

### world.createMaterial(type: Material)

功能描述：创建一个 Material

使用示例：

```ts
const material = world.createMaterial(Material.BASIC);
```

### world.createRenderable()

功能描述：创建一个 Renderable

使用示例：

```ts
const grid = world.createRenderable(Renderable.GRID);
```

### world.destroy()

功能描述：销毁

使用示例：

```ts
world.destroy();
```