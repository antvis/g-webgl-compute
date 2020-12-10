varying vec4 fragColor;

#pragma include "uv.frag.declaration"
#pragma include "map.frag.declaration"

void main() {
  vec4 diffuseColor = fragColor;

  #pragma include "map.frag.main"

  gl_FragColor = diffuseColor;
}