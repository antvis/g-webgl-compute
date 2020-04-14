layout(set = 0, binding = 1) uniform WireframeUniforms {
  float lineWidth;
  vec4 lineColor;
} wireframe;

layout(location = 0) in vec4 fragColor;
layout(location = 1) in vec3 v_Barycentric;

layout(location = 0) out vec4 outColor;

// wireframe
float edgeFactor() {
  vec3 d = fwidth(v_Barycentric);
  vec3 a3 = smoothstep(vec3(0.0), d * wireframe.lineWidth, v_Barycentric);
  return min(min(a3.x, a3.y), a3.z);
}

void main() {
  outColor = mix(fragColor, wireframe.lineColor, (1.0 - edgeFactor()));
}