import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { AABB } from '../../shape/AABB';
import { IBuffer } from '../renderer/IBuffer';
import { IElements } from '../renderer/IElements';
import { BufferData } from '../renderer/IRendererService';

export class GeometryComponent extends Component<GeometryComponent> {
  public dirty: boolean = true;

  public attributes: Array<
    {
      dirty: boolean;
      name: string;
      data?: BufferData;
      buffer?: IBuffer;
      // 结合 Compute Pipeline 时，需要在运行时获取 PingPong buffer
      bufferGetter?: () => IBuffer;
    } & GPUVertexBufferLayoutDescriptor
  > = [];

  public indices: Uint32Array | null;
  public indicesBuffer: IElements | null;

  public vertexCount: number;

  // instanced count
  public maxInstancedCount: number;

  public aabb: AABB;

  constructor(data: Partial<NonFunctionProperties<GeometryComponent>>) {
    super(data);

    Object.assign(this, data);
  }
}
