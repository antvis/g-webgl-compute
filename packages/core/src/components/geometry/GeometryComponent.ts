import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { AABB } from '../../shape/AABB';

export class GeometryComponent extends Component<GeometryComponent> {
  public dirty: boolean = true;

  public attributes: Array<
    {
      name: string;
      data?: ArrayBufferView;
      buffer?: GPUBuffer;
      // 结合 Compute Pipeline 时，需要在运行时获取 PingPong buffer
      bufferGetter?: () => GPUBuffer;
    } & GPUVertexBufferLayoutDescriptor
  > = [];

  public indices: Uint32Array | null;
  public indicesBuffer: GPUBuffer | null;

  public vertexCount: number;

  // instanced count
  public maxInstancedCount: number;

  public aabb: AABB;

  constructor(data: Partial<NonFunctionProperties<GeometryComponent>>) {
    super(data);

    Object.assign(this, data);
  }
}
