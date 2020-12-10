import { generateAABBFromVertices } from '@antv/g-webgpu-core';
import { vec3 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { Geometry } from '.';

export interface IPlaneGeometryParams {
  halfExtents: vec3;
  widthSegments: number;
  lengthSegments: number;
}

@injectable()
/**
 * borrow from playcanvas
 */
export class Plane extends Geometry<Partial<IPlaneGeometryParams>> {
  protected onEntityCreated() {
    const {
      halfExtents = [0.5, 0.5],
      widthSegments = 5,
      lengthSegments = 5,
    } = this.config;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let vcounter = 0;

    for (let i = 0; i <= widthSegments; i++) {
      for (let j = 0; j <= lengthSegments; j++) {
        const x = -halfExtents[0] + (2.0 * halfExtents[0] * i) / widthSegments;
        const y = 0.0;
        const z = -(
          -halfExtents[1] +
          (2.0 * halfExtents[1] * j) / lengthSegments
        );
        const u = i / widthSegments;
        const v = j / lengthSegments;

        positions.push(x, y, z);
        normals.push(0.0, 1.0, 0.0);
        uvs.push(u, v);

        if (i < widthSegments && j < lengthSegments) {
          indices.push(vcounter + lengthSegments + 1, vcounter + 1, vcounter);
          indices.push(
            vcounter + lengthSegments + 1,
            vcounter + lengthSegments + 2,
            vcounter + 1,
          );
        }

        vcounter++;
      }
    }

    // generate AABB
    const aabb = generateAABBFromVertices(positions);

    const component = this.getComponent();
    component.indices = Uint32Array.from(indices);
    component.aabb = aabb;
    component.vertexCount = vcounter;
    component.attributes = [
      {
        dirty: true,
        name: 'position',
        data: Float32Array.from(positions),
        arrayStride: 4 * 3,
        stepMode: 'vertex',
        attributes: [
          {
            shaderLocation: 0,
            offset: 0,
            format: 'float3',
          },
        ],
      },
      {
        dirty: true,
        name: 'normal',
        data: Float32Array.from(normals),
        arrayStride: 4 * 3,
        stepMode: 'vertex',
        attributes: [
          {
            shaderLocation: 1,
            offset: 0,
            format: 'float3',
          },
        ],
      },
      {
        dirty: true,
        name: 'uv',
        data: Float32Array.from(uvs),
        arrayStride: 4 * 2,
        stepMode: 'vertex',
        attributes: [
          {
            shaderLocation: 2,
            offset: 0,
            format: 'float2',
          },
        ],
      },
    ];

    // TODO: barycentric & tangent
  }
}
