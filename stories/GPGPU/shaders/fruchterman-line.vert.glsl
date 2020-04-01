layout(location = 0) in vec4 a_particlePos;

void main() {
  gl_Position = vec4(a_particlePos.xy, 0, 1);
}