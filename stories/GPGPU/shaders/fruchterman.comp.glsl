// @see https://github.com/antvis/G6/blob/master/src/layout/fruchterman.ts
// @see https://github.com/nblintao/ParaGraphL/blob/master/sigma.layout.paragraphl.js
// @see https://github.com/l-l/UnityNetworkGraph/blob/master/Assets/Shaders/GraphCS.compute

#define SPEED_DIVISOR 800.0

layout(std140, set = 0, binding = 0) buffer NodesEdges {
  vec4 nodesEdges[];
} nodesEdges;

layout(std140, set = 0, binding = 1) uniform SimParams {
  float k2;
  float k;
  float maxEdgePerVetex;
  float gravity;
  float speed;
  float maxDisplace;
} params;

void main() {
  uint index = gl_GlobalInvocationID.x;
  if (index >= PARTICLE_NUM) { return; }

  vec4 currentNode = nodesEdges.nodesEdges[index];
  float dx = 0.0, dy = 0.0;

  // repulsive
  for (int i = 0; i < PARTICLE_NUM; ++i) {
    if (i == index) { continue; }
    vec4 node = nodesEdges.nodesEdges[i];

    float vecX = currentNode.r - node.r;
    float vecY = currentNode.g - node.g;
    float vecLengthSqr = sqrt(vecX * vecX + vecY * vecY) + 0.01;
    if (vecLengthSqr > 0.0) {
      float repulsiveF = params.k2 / vecLengthSqr;
      dx += vecX / vecLengthSqr * repulsiveF;
      dy += vecY / vecLengthSqr * repulsiveF;
    }
  }

  // attractive
  int arr_offset = int(floor(currentNode.b + 0.5));
  int length = int(floor(currentNode.a + 0.5));
  vec4 node_buffer;
  for (int p = 0; p < params.maxEdgePerVetex; p++) {
    if (p >= length) break;
    int arr_idx = arr_offset + p;
    // when arr_idx % 4 == 0 update node_idx_buffer
    int buf_offset = arr_idx - arr_idx / 4 * 4;
    if (p == 0 || buf_offset == 0) {
      node_buffer = nodesEdges.nodesEdges[int(floor(arr_idx / 4 + 0.5))];
    }
    float float_j = buf_offset == 0 ? node_buffer.r :
                    buf_offset == 1 ? node_buffer.g :
                    buf_offset == 2 ? node_buffer.b :
                                      node_buffer.a;
    uint jIndex= uint(floor(float_j + 0.5));
    vec4 node_j = nodesEdges.nodesEdges[jIndex];
    
    float vecX = currentNode.r - node_j.r;
    float vecY = currentNode.g - node_j.g;
    float vecLength = sqrt(vecX * vecX + vecY * vecY) + 0.01;
    float attractiveF = (vecLength * vecLength) / params.k;
    if (vecLength > 0.0) {
      dx -= (vecX / vecLength) * attractiveF;
      dy -= (vecY / vecLength) * attractiveF;
    }
  }

  // gravity
  float gf = 0.01 * params.k * params.gravity;
  dx -= gf * currentNode.r;
  dy -= gf * currentNode.g;

  // speed
  dx *= params.speed;
  dy *= params.speed;

  // move
  float distLength = sqrt(dx * dx + dy * dy);
  if (distLength > 0.0) {
    float limitedDist = min(params.maxDisplace * params.speed, distLength);

    nodesEdges.nodesEdges[index].r += dx / distLength * limitedDist;
    nodesEdges.nodesEdges[index].g += dy / distLength * limitedDist;
  }
}