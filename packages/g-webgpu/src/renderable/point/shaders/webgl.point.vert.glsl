attribute vec2 position;
attribute vec4 color;
attribute float shape;
attribute vec2 offset;
attribute float size;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

uniform float u_stroke_width;
uniform float u_device_pixel_ratio;
uniform vec2 u_viewport;

varying vec4 v_color;
varying vec4 v_data;
varying float v_radius;

#pragma include "picking"

void main() {
  v_color = color;
  v_radius = size;

  lowp float antialiasblur = 1.0 / u_device_pixel_ratio * (size + u_stroke_width);

  // construct point coords
  v_data = vec4(position, antialiasblur, shape);

  gl_Position = projectionMatrix * modelViewMatrix
    * vec4(position * size + offset, 0.0, 1.0);

  setPickingColor(a_PickingColor);
}