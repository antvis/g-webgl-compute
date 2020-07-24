layout(set = 0, binding = 0) uniform Uniforms {
  vec4 color;
  mat4 projectionMatrix;
  mat4 modelViewMatrix;
} uniforms;

layout(location = 0) in vec3 position;
// layout(location = 1) in vec3 barycentric;

layout(location = 0) out vec4 fragColor;
// layout(location = 1) out vec3 v_Barycentric;

void main() {
  gl_Position = uniforms.projectionMatrix * uniforms.modelViewMatrix * vec4(position, 1.0);
  fragColor = uniforms.color;
  // v_Barycentric = barycentric;
}