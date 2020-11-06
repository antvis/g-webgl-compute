varying vec3 v_Position;
varying vec4 v_Color;

uniform float sineTime;
uniform float time;

void main() {
  vec4 color = v_Color;
	color.r += sin(v_Position.x * 10.0 + time) * 0.5;
  gl_FragColor = color;
}
