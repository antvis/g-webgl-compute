import { vec3 } from 'gl-matrix';
export interface IBoxGeometryParams {
  halfExtents: vec3;
  widthSegments: number;
  heightSegments: number;
  depthSegments: number;
}
