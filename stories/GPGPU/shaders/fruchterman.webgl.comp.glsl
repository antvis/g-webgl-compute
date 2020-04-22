// GLSL 1.0 used as Fragment Shader in WebGL
// @see https://github.com/antvis/G6/blob/master/src/layout/fruchterman.ts
// @see https://github.com/nblintao/ParaGraphL/blob/master/sigma.layout.paragraphl.js
// @see https://github.com/l-l/UnityNetworkGraph/blob/master/Assets/Shaders/GraphCS.compute

#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

#define SPEED_DIVISOR 800.0
#define MAX_EDGE_PER_VERTEX 50

uniform sampler2D u_Data;

uniform float u_TexSize;
uniform float u_K;
uniform float u_K2;
uniform int u_MaxEdgePerVetex;
uniform float u_Gravity;
uniform float u_Speed;
uniform float u_MaxDisplace;

varying vec2 v_TexCoord;

void main() {
  int i = int(floor(v_TexCoord.s * u_TexSize + 0.5));
  vec4 node_i = texture2D(u_Data, vec2(v_TexCoord.s, 1));
  float dx = 0.0, dy = 0.0;
  gl_FragColor = node_i;

  if (i > PARTICLE_NUM) { return; }

  // repulsive
  for (int j = 0; j < PARTICLE_NUM; j++) {
    if (i != j + 1) {
      vec4 node_j = texture2D(u_Data, vec2((float(j) + 0.5) / u_TexSize , 1));
      float xDist = node_i.r - node_j.r;
      float yDist = node_i.g - node_j.g;
      float dist = sqrt(xDist * xDist + yDist * yDist) + 0.01;
      if (dist > 0.0) {
        float repulsiveF = u_K2 / dist;
        dx += xDist / dist * repulsiveF;
        dy += yDist / dist * repulsiveF;
      }
    }
  }
  int arr_offset = int(floor(node_i.b + 0.5));
  int length = int(floor(node_i.a + 0.5));
  vec4 node_buffer;
  for (int p = 0; p < MAX_EDGE_PER_VERTEX; p++) {
    if (p >= length) break;
    int arr_idx = arr_offset + p;
    // when arr_idx % 4 == 0 update node_idx_buffer
    int buf_offset = arr_idx - arr_idx / 4 * 4;
    if (p == 0 || buf_offset == 0) {
      node_buffer = texture2D(u_Data, vec2((float(arr_idx / 4) + 0.5) /
                                          u_TexSize , 1));
    }
    float float_j = buf_offset == 0 ? node_buffer.r :
                    buf_offset == 1 ? node_buffer.g :
                    buf_offset == 2 ? node_buffer.b :
                                      node_buffer.a;
    vec4 node_j = texture2D(u_Data, vec2((float_j + 0.5) /
                                    u_TexSize, 1));
    float xDist = node_i.r - node_j.r;
    float yDist = node_i.g - node_j.g;
    float dist = sqrt(xDist * xDist + yDist * yDist) + 0.01;
    float attractiveF = dist * dist / u_K;
    if (dist > 0.0) {
      dx -= xDist / dist * attractiveF;
      dy -= yDist / dist * attractiveF;
    }
  }
  // Gravity
  float d = sqrt(node_i.r * node_i.r + node_i.g * node_i.g);
  float gf = 0.01 * u_K * u_Gravity * d;
  dx -= gf * node_i.r / d;
  dy -= gf * node_i.g / d;

  // Speed
  dx *= u_Speed;
  dy *= u_Speed;

  // move
  float distLength = sqrt(dx * dx + dy * dy);
  if (distLength > 0.0) {
    float limitedDist = min(u_MaxDisplace * u_Speed, distLength);
  
    gl_FragColor.r += dx / distLength * limitedDist;
    gl_FragColor.g += dy / distLength * limitedDist;
  }
}