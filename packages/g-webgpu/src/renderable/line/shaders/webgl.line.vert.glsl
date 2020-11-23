attribute vec2 a_pos;
attribute vec4 a_color;
attribute float a_line_miter;
attribute vec2 a_line_normal;
attribute float a_counters;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float u_thickness;
uniform vec2 u_viewport;

varying vec4 v_color;
varying vec2 v_normal;
varying float v_counters;

void main() {
  v_color = a_color;
  v_counters = a_counters;

  vec3 normal = normalize(vec3(a_line_normal, 0.0));

  vec4 offset = vec4(normal * u_thickness / 2.0 * a_line_miter, 0.0);

  v_normal = vec2(normal * sign(a_line_miter));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(a_pos, 0.0, 1.0) + offset;
}
