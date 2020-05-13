const SPEED_DIVISOR = 800;
const MAX_EDGE_PER_VERTEX;

const u_Data: vec4[];
const u_K;
const u_K2;
const u_Gravity;
const u_Speed;
const u_MaxDisplace;

export function compute(i: int) {
  const currentNode = u_Data[i];
  let dx = 0, dy = 0;

  if (i > THREAD_NUM) {
    u_Data[i] = currentNode;
    return;
  }

  // repulsive
  for (let j = 0; j < THREAD_NUM; j++) {
    if (i != j + 1) {
      const nextNode = u_Data[j];
      const xDist = currentNode.r - nextNode.r;
      const yDist = currentNode.g - nextNode.g;
      const dist = sqrt(xDist * xDist + yDist * yDist) + 0.01;
      if (dist > 0.0) {
        const repulsiveF = u_K2 / dist;
        dx += xDist / dist * repulsiveF;
        dy += yDist / dist * repulsiveF;
      }
    }
  }

  const arr_offset = int(floor(currentNode.b + 0.5));
  const length = int(floor(currentNode.a + 0.5));
  const node_buffer: vec4;
  for (let p = 0; p < MAX_EDGE_PER_VERTEX; p++) {
    if (p >= length) break;
    const arr_idx = arr_offset + p;
    // when arr_idx % 4 == 0 update currentNodedx_buffer
    const buf_offset = arr_idx - arr_idx / 4 * 4;
    if (p == 0 || buf_offset == 0) {
      node_buffer = u_Data[int(arr_idx / 4)];
    }
    const float_j = buf_offset == 0 ? node_buffer.r :
                    buf_offset == 1 ? node_buffer.g :
                    buf_offset == 2 ? node_buffer.b :
                                      node_buffer.a;
    const nextNode = u_Data[int(float_j)];
    const xDist = currentNode.r - nextNode.r;
    const yDist = currentNode.g - nextNode.g;
    const dist = sqrt(xDist * xDist + yDist * yDist) + 0.01;
    const attractiveF = dist * dist / u_K;
    if (dist > 0.0) {
      dx -= xDist / dist * attractiveF;
      dy -= yDist / dist * attractiveF;
    }
  }
  
  // Gravity
  const d = sqrt(currentNode.r * currentNode.r + currentNode.g * currentNode.g);
  const gf = 0.01 * u_K * u_Gravity * d;
  dx -= gf * currentNode.r / d;
  dy -= gf * currentNode.g / d;

  // Speed
  dx *= u_Speed;
  dy *= u_Speed;

  // move
  const distLength = sqrt(dx * dx + dy * dy);
  if (distLength > 0.0) {
    const limitedDist = min(u_MaxDisplace * u_Speed, distLength);

    u_Data[i] = [
      currentNode.r + dx / distLength * limitedDist,
      currentNode.g + dy / distLength * limitedDist,
      currentNode.b,
      currentNode.a
    ];
  }
}
