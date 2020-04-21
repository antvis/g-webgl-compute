# @antv/g-webgpu-compiler

convert TS-like syntax to GLSL 1.0/4.5, inspired by [stardustjs](https://github.com/stardustjs/stardust/tree/dev/packages/stardust-core/src/compiler).

eg. the following TS-styled import statement will be converted to GLSL code:
```
// before
import { projectionMatrix, modelViewMatrix } from 'g/camera';

// after GLSL 4.5 for WebGPU
layout(set = 0, binding = 0) uniform Camera {
  mat4 projectionMatrix;
  mat4 modelViewMatrix;
} camera;

// after GLSL 1.0 for WebGL
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
```
