import { generateAABBFromVertices } from '@antv/g-webgpu-core';
import { vec3 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { Geometry } from '.';

export interface ISphereGeometryParams {
  radius: number;
  latitudeBands: number;
  longitudeBands: number;
}

@injectable()
/**
 * borrow from playcanvas
 */
export class Sphere extends Geometry<Partial<ISphereGeometryParams>> {
  protected onEntityCreated() {
    const {
      radius = 0.5,
      latitudeBands = 16,
      longitudeBands = 16,
    } = this.config;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let lat = 0; lat <= latitudeBands; lat++) {
      const theta = (lat * Math.PI) / latitudeBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= longitudeBands; lon++) {
        // Sweep the sphere from the positive Z axis to match a 3DS Max sphere
        const phi = (lon * 2 * Math.PI) / longitudeBands - Math.PI / 2.0;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;
        const u = 1.0 - lon / longitudeBands;
        const v = 1.0 - lat / latitudeBands;

        positions.push(x * radius, y * radius, z * radius);
        normals.push(x, y, z);
        uvs.push(u, v);
      }
    }

    for (let lat = 0; lat < latitudeBands; ++lat) {
      for (let lon = 0; lon < longitudeBands; ++lon) {
        const first = lat * (longitudeBands + 1) + lon;
        const second = first + longitudeBands + 1;

        indices.push(first + 1, second, first);
        indices.push(first + 1, second + 1, second);
      }
    }

    // generate AABB
    const aabb = generateAABBFromVertices(positions);

    const component = this.getComponent();
    component.indices = Uint32Array.from(indices);
    component.aabb = aabb;
    component.vertexCount = positions.length / 3;
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
