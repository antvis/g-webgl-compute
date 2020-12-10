---
title: 几何体
order: 3
---

* `Geometry.BOX` 立方体
    * `halfExtents` `[number, number, number]` 默认值为 `[0.5, 0.5, 0.5]`
    * `widthSegments` `number` 默认值为 `1`
    * `heightSegments` `number` 默认值为 `1`
    * `depthSegments` `number` 默认值为 `1`
* `Geometry.SPHERE` 球体
    * `radius` 半径，`number` 默认值为 `0.5`
    * `latitudeBands` `number` 默认值为 `16`
    * `longitudeBands` `number` 默认值为 `16`
* `Geometry.PLANE` 平面
    * `halfExtents` `[number, number]` 默认值为 `[0.5, 0.5]`
    * `widthSegments` `number` 默认值为 `5`
    * `lengthSegments` `number` 默认值为 `5`