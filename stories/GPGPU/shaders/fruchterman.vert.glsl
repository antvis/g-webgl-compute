layout(location = 0) in vec4 a_particlePos;
layout(location = 1) in vec2 a_extrude;
layout(location = 2) in vec4 a_color;
layout(location = 3) in float a_size;

layout(location = 0) out vec4 data;
layout(location = 1) out vec4 color;

layout(set = 0, binding = 0) uniform Builtin {
  mat4 projectionMatrix;
  mat4 modelViewMatrix;
} builtin;

layout(set = 0, binding = 1) uniform Uniforms {
  float opacity;
  float strokeWidth;
  vec4 strokeColor;
  float strokeOpacity;
} uniforms;

void main() {
  float radius = a_size;
  vec2 offset = a_extrude * (radius + uniforms.strokeWidth) / 600;

  gl_Position = builtin.projectionMatrix
    * builtin.modelViewMatrix
    * vec4(a_particlePos.xy + offset, 0, 1);

  // anti-alias
  float antialiasblur = 1.0 / (radius + uniforms.strokeWidth) * 4.0;

  // construct point coords
  data = vec4(a_extrude, antialiasblur, radius);
  color = a_color;
}