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
    } & GPUVertexBufferLayoutDescriptor
  > = [];

  public indices: Uint32Array | null;
  public indicesBuffer: GPUBuffer | null;

  // instanced count
  public maxInstancedCount: number;

  public aabb: AABB;

  constructor(data: Partial<NonFunctionProperties<GeometryComponent>>) {
    super(data);

    Object.assign(this, data);
  }
}
