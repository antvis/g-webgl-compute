import { vec3 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { createEntity, Entity } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { generateAABBFromVertices } from '../../utils/aabb';
import { gl } from '../renderer/gl';
import { IBuffer } from '../renderer/IBuffer';
import { BufferData, IRendererService } from '../renderer/IRendererService';
import { GeometryComponent } from './GeometryComponent';
import { IBoxGeometryParams } from './interface';

const primitiveUv1Padding = 4.0 / 64;
const primitiveUv1PaddingScale = 1.0 - primitiveUv1Padding * 2;

@injectable()
export class GeometrySystem implements ISystem {
  @inject(IDENTIFIER.GeometryComponentManager)
  private readonly geometry: ComponentManager<GeometryComponent>;

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  public async execute() {
    this.geometry.forEach((entity, component) => {
      // build buffers for each geometry
      if (component.dirty) {
        component.attributes.forEach((attribute) => {
          if (attribute.dirty && attribute.data) {
            if (!attribute.buffer) {
              attribute.buffer = this.engine.createBuffer({
                data: attribute.data,
                type: gl.FLOAT,
              });
            } else {
              attribute.buffer?.subData({
                data: attribute.data,
                // TODO: support offset in subdata
                offset: 0,
              });
            }
            attribute.dirty = false;
          }
        });

        // create index buffer if needed
        if (component.indices) {
          if (!component.indicesBuffer) {
            component.indicesBuffer = this.engine.createElements({
              data: component.indices,
              count: component.indices.length,
              type: gl.UNSIGNED_INT,
              usage: gl.STATIC_DRAW,
            });
          } else {
            component.indicesBuffer.subData({
              data: component.indices,
              offset: 0,
            });
          }
        }
        component.dirty = false;
      }
    });
  }

  public tearDown() {
    this.geometry.forEach((_, geometry) => {
      if (geometry.indicesBuffer) {
        geometry.indicesBuffer.destroy();
      }

      geometry.attributes.forEach((attribute) => {
        if (attribute.buffer) {
          attribute.buffer.destroy();
        }
      });
    });
    this.geometry.clear();
  }

  /**
   * @see https://threejs.org/docs/#api/en/core/BufferGeometry
   */
  public createBufferGeometry(
    { vertexCount }: { vertexCount: number } = { vertexCount: 3 },
  ) {
    const entity = createEntity();
    return this.geometry.create(entity, {
      vertexCount,
    });
  }

  /**
   * @see https://threejs.org/docs/#api/en/core/InstancedBufferGeometry
   */
  public createInstancedBufferGeometry({
    maxInstancedCount,
    vertexCount,
  }: {
    maxInstancedCount: number;
    vertexCount: number;
  }) {
    const entity = createEntity();
    return this.geometry.create(entity, {
      maxInstancedCount,
      vertexCount,
    });
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
    return this.geometry.create(entity, {
      indices: Uint32Array.from(indices),
      aabb,
      attributes: [
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
        // {
        //   dirty: true,
        //   name: 'normal',
        //   data: Float32Array.from(normals),
        //   arrayStride: 4 * 3,
        //   stepMode: 'vertex',
        //   attributes: [
        //     {
        //       shaderLocation: 1,
        //       offset: 0,
        //       format: 'float3',
        //     },
        //   ],
        // },
        // {
        //   dirty: true,
        //   name: 'uv',
        //   data: Float32Array.from(uvs),
        //   arrayStride: 4 * 2,
        //   stepMode: 'vertex',
        //   attributes: [
        //     {
        //       shaderLocation: 2,
        //       offset: 0,
        //       format: 'float2',
        //     },
        //   ],
        // },
      ],
    });

    // TODO: barycentric & tangent
  }
}
