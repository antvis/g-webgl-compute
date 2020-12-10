attribute vec3 position;
attribute vec3 normal;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec4 color;

varying vec4 fragColor;

#pragma include "uv.vert.declaration"

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  fragColor = color;

  #pragma include "uv.vert.main"
}