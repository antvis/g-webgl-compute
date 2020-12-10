import {
  AABB,
  generateAABBFromVertices,
  GeometryComponent,
} from '@antv/g-webgpu-core';
import { vec3 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { isNumber, isTypedArray } from 'lodash';
import { Geometry } from '.';
import { merge } from '../utils/typedarray';

export interface IMergedGeometryParams {
  geometries: GeometryComponent[];
}

@injectable()
/**
 * merge many geometries into one, use a batch of draw calls
 */
export class Merged extends Geometry<Partial<IMergedGeometryParams>> {
  protected onEntityCreated() {
    const { geometries = [] } = this.config;

    const mergedComponent = this.getComponent();
    mergedComponent.aabb = new AABB();

    const mergedAttributes: GeometryComponent['attributes'] = [];
    const mergedIndices: number[] = [];
    let indexOffset = 0;
    geometries.forEach((geometry) => {
      const { aabb, indices, vertexCount, attributes } = geometry;

      // merge aabb
      mergedComponent.aabb.add(aabb);
      mergedComponent.vertexCount += vertexCount;

      // merge indices
      if (indices) {
        mergedIndices.push(...indices.map((index) => index + indexOffset));
      }
      indexOffset += vertexCount;

      // merge attributes
      attributes.forEach((attribute, i) => {
        if (!mergedAttributes[i]) {
          mergedAttributes[i] = attribute;
          mergedAttributes[i].dirty = true;
        } else {
          if (attribute.data) {
            if (isNumber(attribute.data)) {
              // @ts-ignore
              mergedAttributes[i].push(attribute.data);
            } else if (isTypedArray(attribute.data)) {
              // @ts-ignore
              mergedAttributes[i].data = merge(
                // @ts-ignore
                mergedAttributes[i].data,
                attribute.data,
              );
            } else {
              // @ts-ignore
              mergedAttributes[i].data = mergedAttributes[i].data.concat(
                attribute.data,
              );
            }
          }
        }
      });
    });

    mergedComponent.attributes = mergedAttributes;
    mergedComponent.indices = Uint32Array.from(mergedIndices);
    mergedComponent.dirty = true;
  }
}
