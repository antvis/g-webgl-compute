---
title: Unitchart
order: 6
---

布局语法来自 ATOM: A grammar for unit visualizations
* ATOM 语法：https://intuinno.github.io/unit/#/
* 中文翻译：http://vis.pku.edu.cn/blog/atom_grammar/#more-9377

原论文中给出了布局的描述语法，但并未涉及布局间切换的动画，我们使用了 GWebGPU 的渲染能力：
* 使用 instanced array 完成所有 mark 的高性能渲染
* 布局切换时在 Shader 中完成每个 mark 位置和大小的插值，目前为线性插值
* 支持拾取，基于 PixelPicking

后续可完善的方向包括：
* 支持更多可配置的插值函数、mark 类型
* 更多布局，扩展至 3D
* 渲染图例和坐标轴
* 支持分面，例如 https://sanddance.js.org/app/
* 配合滚动，实现 scrollytelling https://medium.com/nightingale/from-storytelling-to-scrollytelling-a-short-introduction-and-beyond-fbda32066964

本例数据是泰坦尼克号生还者和遇难者数据，每一条形如 `Class: First, Age: Adult, Sex: Male, Survived: Yes`。
黄色代表生还，蓝色代表遇难。
