attribute vec3 a_Position;

varying vec3 v_Position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

void main() {
  v_Position = a_Position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(a_Position, 1.);
}