#ifndef HALF_PI
#define HALF_PI 1.5707963267948966
#endif

#ifndef PI
#define PI 3.141592653589793
#endif

float bounceOut(float t) {
  const float a = 4.0 / 11.0;
  const float b = 8.0 / 11.0;
  const float c = 9.0 / 10.0;

  const float ca = 4356.0 / 361.0;
  const float cb = 35442.0 / 1805.0;
  const float cc = 16061.0 / 1805.0;

  float t2 = t * t;

  return t < a
    ? 7.5625 * t2
    : t < b
      ? 9.075 * t2 - 9.9 * t + 3.4
      : t < c
        ? ca * t2 - cb * t + cc
        : 10.8 * t * t - 20.52 * t + 10.72;
}

float elasticInOut(float t) {
  return t < 0.5
    ? 0.5 * sin(+13.0 * HALF_PI * 2.0 * t) * pow(2.0, 10.0 * (2.0 * t - 1.0))
    : 0.5 * sin(-13.0 * HALF_PI * ((2.0 * t - 1.0) + 1.0)) * pow(2.0, -10.0 * (2.0 * t - 1.0)) + 1.0;
}

float elasticIn(float t) {
  return sin(13.0 * t * HALF_PI) * pow(2.0, 10.0 * (t - 1.0));
}

float linear(float t) {
  return t;
}

attribute vec2 position;
attribute vec2 startOffset;
attribute vec2 endOffset;
attribute vec4 color;
attribute float startSize;
attribute float endSize;
attribute float shape;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

uniform float u_stroke_width;
uniform float u_device_pixel_ratio;
uniform vec2 u_viewport;
uniform float u_time;

varying vec4 v_color;
varying vec4 v_data;
varying float v_radius;

#pragma include "picking"

void main() {
  v_color = color;

  float interpolatedSize = mix(startSize, endSize, linear(u_time));
  // 针对位置偏移进行插值
  vec2 interpolatedOffset = mix(startOffset, endOffset, linear(u_time));

  v_radius = interpolatedSize;

  lowp float antialiasblur = 1.0 / u_device_pixel_ratio / (interpolatedSize + u_stroke_width);

  // construct point coords
  v_data = vec4(position, antialiasblur, shape);

  // projectionMatrix * modelViewMatrix * 
  gl_Position = vec4(position * interpolatedSize * 2.0 / u_viewport + interpolatedOffset, 0.0, 1.0);

  setPickingColor(a_PickingColor);
}