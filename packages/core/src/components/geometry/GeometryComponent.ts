import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { AABB } from '../../shape/AABB';

export class GeometryComponent extends Component<GeometryComponent> {
  public dirty: boolean = true;

  public vertices: Float32Array;
  public normals: Float32Array;
  public uvs: Float32Array;
  public indices: Uint32Array;
  public barycentric: Float32Array;

  public verticesBuffer: GPUBuffer;
  public normalsBuffer: GPUBuffer;
  public uvsBuffer: GPUBuffer;
  public indicesBuffer: GPUBuffer;

  public vertexState: GPUVertexStateDescriptor = {
    indexFormat: 'uint32',
    vertexBuffers: [
      {
        arrayStride: 4 * 3,
        stepMode: 'vertex',
        attributes: [
          {
            // position
            shaderLocation: 0,
            offset: 0,
            format: 'float3',
          },
        ],
      },
      {
        arrayStride: 4 * 3,
        stepMode: 'vertex',
        attributes: [
          {
            // normal
            shaderLocation: 1,
            offset: 0,
            format: 'float3',
          },
        ],
      },
      {
        arrayStride: 4 * 2,
        stepMode: 'vertex',
        attributes: [
          {
            // uv
            shaderLocation: 2,
            offset: 0,
            format: 'float2',
          },
        ],
      },
    ],
  };

  public aabb: AABB;

  constructor(data: Partial<NonFunctionProperties<GeometryComponent>>) {
    super(data);

    Object.assign(this, data);
  }
}
