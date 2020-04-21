layout(location = 0) in vec4 a_particlePos;

layout(set = 0, binding = 0) uniform Builtin {
  mat4 projectionMatrix;
  mat4 modelViewMatrix;
} builtin;

void main() {
  gl_Position = builtin.projectionMatrix
    * builtin.modelViewMatrix
    * vec4(a_particlePos.xy, 0, 1);
}