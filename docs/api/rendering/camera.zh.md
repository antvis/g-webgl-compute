---
title: Camera
order: 3
---

相机（Camera）描述了我们观察世界的角度。

- 支持两种投影模式：正交投影（Orthographic）和透视投影（Perspective），默认使用后者。
- 支持两种相机移动模式：固定摄像机（Tracking）和固定视点（Orbiting），默认使用后者。
- 支持自定义相机动画，创建/保存当前相机状态作为一个 Landmark，可在多个 Landmark 间平滑切换。

### 投影模式

正交投影（左图）常用于 CAD 软件和策略类游戏（模拟人生）中。
而透视投影（右图）遵循我们认知中的“近大远小”。
![](https://www.scratchapixel.com/images/upload/perspective-matrix/projectionsexample.png)

### 移动模式

![](https://gw.alipayobjects.com/mdn/rms_6ae20b/afts/img/A*vNDVQ5tE4G0AAAAAAAAAAAAAARQnAQ)

### 相机动作

![](http://learnwebgl.brown37.net/_images/camera_motion.png)

### camera.setPerspective(near: number, far: number, fov: number, aspect: number): Camera

功能描述：设置相机投影模式为透视投影 `Camera.ProjectionMode.PERSPECTIVE`

参数：

- `near` `number` 近平面
- `far` `number` 远平面
- `fov` `number` 角度
- `aspect` `number` 宽高比

使用示例：

```ts
const camera = world
  .createCamera()
  .setPerspective(0.1, 5, 75, canvas.width / canvas.height);
```
