import { mat3, mat4, vec3, vec4 } from 'gl-matrix';
import { isNumber } from 'lodash';

export function getAngle(angle: number | undefined) {
  if (angle === undefined) {
    return 0;
  } else if (angle > 360 || angle < -360) {
    return angle % 360;
  }
  return angle;
}

export function createVec3(x: number | vec3 | vec4, y?: number, z?: number) {
  if (isNumber(x)) {
    return vec3.fromValues(x, y as number, z as number);
  }

  if ((x as vec3).length === 3) {
    return vec3.clone(x as vec3);
  }

  return vec3.fromValues(x[0], x[1], x[2]);
}

export function getRotationScale(matrix: mat4, result: mat3) {
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[4];
  result[4] = matrix[5];
  result[5] = matrix[6];
  result[6] = matrix[8];
  result[7] = matrix[9];
  result[8] = matrix[10];
  return result;
}
