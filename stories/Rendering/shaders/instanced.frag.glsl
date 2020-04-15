layout(location = 0) out vec4 fragColor;

layout(location = 0) in vec3 v_Position;
layout(location = 1) in vec4 v_Color;

layout(std140, set = 0, binding = 1) uniform SimParams {
  float sineTime;
  float time;
} params;

void main() {
  vec4 color = v_Color;
	color.r += sin(v_Position.x * 10.0 + params.time) * 0.5;
  fragColor = color;
}
