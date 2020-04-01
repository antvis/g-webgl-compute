layout(location = 0) out vec4 fragColor;

layout(location = 0) in vec4 data;
layout(location = 1) in vec4 color;

layout(set = 0, binding = 0) uniform Uniforms {
  float opacity;
  float strokeWidth;
  vec4 strokeColor;
  float strokeOpacity;
} uniforms;

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

void main() {
  float antialiasblur = data.z;
  float antialiased_blur = -max(0.0, antialiasblur);
  float r = data.w / (data.w + uniforms.strokeWidth);

  float outer_df = sdCircle(data.xy, 1.0);
  float inner_df = sdCircle(data.xy, r);

  float opacity_t = smoothstep(0.0, antialiased_blur, outer_df);
  
  float color_t = smoothstep(
    antialiased_blur,
    0.0,
    inner_df
  );
  vec4 strokeColor = vec4(1., 0., 0., 1.0);

  fragColor = opacity_t * mix(
    vec4(color.rgb, color.a * uniforms.opacity), strokeColor * uniforms.strokeOpacity, color_t);
}