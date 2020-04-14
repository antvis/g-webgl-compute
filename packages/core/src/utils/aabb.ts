import { vec3 } from 'gl-matrix';
import { AABB } from '../shape/AABB';

/**
 * generate AABB with positions
 * @param positions [x1,y1,z1, x2,y2,z2]
 */
export function generateAABBFromVertices(positions: number[]): AABB {
  const aabb = new AABB();
  const min = vec3.fromValues(positions[0], positions[1], positions[2]);
  const max = vec3.fromValues(positions[0], positions[1], positions[2]);

  for (let i = 3; i < positions.length; ) {
    const x = positions[i++];
    const y = positions[i++];
    const z = positions[i++];
    if (x < min[0]) {
      min[0] = x;
    }
    if (y < min[1]) {
      min[1] = y;
    }
    if (z < min[2]) {
      min[2] = z;
    }
    if (x > max[0]) {
      max[0] = x;
    }
    if (y > max[1]) {
      max[1] = y;
    }
    if (z > max[2]) {
      max[2] = z;
    }
  }

  aabb.setMinMax(min, max);
  return aabb;
}
