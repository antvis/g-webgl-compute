import { vec3 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { Component, createEntity, Entity, IDENTIFIER } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { EMPTY } from '../../Entity';
import { AABB } from '../../shape/AABB';
import { Mask } from '../../shape/Frustum';
import { Plane } from '../../shape/Plane';
import { ExecuteSystem } from '../../System';
import { generateAABBFromVertices } from '../../utils/aabb';
import { WebGPUEngine } from '../../WebGPUEngine';
import { HierarchyComponent } from '../scenegraph/HierarchyComponent';
import { NameComponent } from '../scenegraph/NameComponent';
import { GeometryComponent } from './GeometryComponent';

const primitiveUv1Padding = 4.0 / 64;
const primitiveUv1PaddingScale = 1.0 - primitiveUv1Padding * 2;

export interface IBoxGeometryParams {
  halfExtents: vec3;
  widthSegments: number;
  heightSegments: number;
  depthSegments: number;
}

@injectable()
export class GeometrySystem extends ExecuteSystem {
  public name = IDENTIFIER.GeometrySystem;

  @inject(IDENTIFIER.GeometryComponentManager)
  private readonly geometry: ComponentManager<GeometryComponent>;

  public async execute(engine: WebGPUEngine) {
    this.geometry.forEach((entity, component) => {
      // build buffers for each geometry
      if (component.dirty) {
        component.verticesBuffer = engine.createVertexBuffer(
          component.vertices,
        );
        component.normalsBuffer = engine.createVertexBuffer(component.normals);
        component.uvsBuffer = engine.createVertexBuffer(component.uvs);
        component.indicesBuffer = engine.createIndexBuffer(component.indices);
        component.dirty = false;
      }
    });
  }

  public createGeometry() {
    const entity = createEntity();
    this.geometry.create(entity);
    return entity;
  }

  /**
   * ported from PlayCanvas
   * @param params BoxGeometryParams
   * @return entity
   */
  public createBox(params: Partial<IBoxGeometryParams> = {}) {
    const ws = params.widthSegments || 1;
    const hs = params.heightSegments || 1;
    const ds = params.depthSegments || 1;
    const [hex, hey, hez] =
      params.halfExtents || vec3.fromValues(0.5, 0.5, 0.5);

    const corners = [
      vec3.fromValues(-hex, -hey, hez),
      vec3.fromValues(hex, -hey, hez),
      vec3.fromValues(hex, hey, hez),
      vec3.fromValues(-hex, hey, hez),
      vec3.fromValues(hex, -hey, -hez),
      vec3.fromValues(-hex, -hey, -hez),
      vec3.fromValues(-hex, hey, -hez),
      vec3.fromValues(hex, hey, -hez),
    ];

    const faceAxes = [
      [0, 1, 3], // FRONT
      [4, 5, 7], // BACK
      [3, 2, 6], // TOP
      [1, 0, 4], // BOTTOM
      [1, 4, 2], // RIGHT
      [5, 0, 6], // LEFT
    ];

    const faceNormals = [
      [0, 0, 1], // FRONT
      [0, 0, -1], // BACK
      [0, 1, 0], // TOP
      [0, -1, 0], // BOTTOM
      [1, 0, 0], // RIGHT
      [-1, 0, 0], // LEFT
    ];

    const sides = {
      FRONT: 0,
      BACK: 1,
      TOP: 2,
      BOTTOM: 3,
      RIGHT: 4,
      LEFT: 5,
    };

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const uvs1: number[] = [];
    const indices: number[] = [];
    let vcounter = 0;

    const generateFace = (
      side: number,
      uSegments: number,
      vSegments: number,
    ) => {
      let u;
      let v;
      let i;
      let j;

      for (i = 0; i <= uSegments; i++) {
        for (j = 0; j <= vSegments; j++) {
          const temp1 = vec3.create();
          const temp2 = vec3.create();
          const temp3 = vec3.create();
          const r = vec3.create();
          vec3.lerp(
            temp1,
            corners[faceAxes[side][0]],
            corners[faceAxes[side][1]],
            i / uSegments,
          );
          vec3.lerp(
            temp2,
            corners[faceAxes[side][0]],
            corners[faceAxes[side][2]],
            j / vSegments,
          );
          vec3.sub(temp3, temp2, corners[faceAxes[side][0]]);
          vec3.add(r, temp1, temp3);
          u = i / uSegments;
          v = j / vSegments;

          positions.push(r[0], r[1], r[2]);
          normals.push(
            faceNormals[side][0],
            faceNormals[side][1],
            faceNormals[side][2],
          );
          uvs.push(u, v);
          // pack as 3x2
          // 1/3 will be empty, but it's either that or stretched pixels
          // TODO: generate non-rectangular lightMaps, so we could use space without stretching
          u /= 3;
          v /= 3;
          u = u * primitiveUv1PaddingScale + primitiveUv1Padding;
          v = v * primitiveUv1PaddingScale + primitiveUv1Padding;
          u += (side % 3) / 3;
          v += Math.floor(side / 3) / 3;
          uvs1.push(u, v);

          if (i < uSegments && j < vSegments) {
            indices.push(vcounter + vSegments + 1, vcounter + 1, vcounter);
            indices.push(
              vcounter + vSegments + 1,
              vcounter + vSegments + 2,
              vcounter + 1,
            );
          }

          vcounter++;
        }
      }
    };

    generateFace(sides.FRONT, ws, hs);
    generateFace(sides.BACK, ws, hs);
    generateFace(sides.TOP, ws, ds);
    generateFace(sides.BOTTOM, ws, ds);
    generateFace(sides.RIGHT, ds, hs);
    generateFace(sides.LEFT, ds, hs);

    // generate AABB
    const aabb = generateAABBFromVertices(positions);

    const entity = createEntity();
    this.geometry.create(entity, {
      vertices: Float32Array.from(positions),
      normals: Float32Array.from(normals),
      uvs: Float32Array.from(uvs),
      indices: Uint32Array.from(indices),
      aabb,
    });

    // TODO: barycentric & tangent
    return entity;
  }
}
