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
}
