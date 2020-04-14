import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';

export interface IUniformBinding {
  uniforms: IUniform[];
  buffer?: GPUBuffer;
  length: number;
}

export interface IUniform {
  dirty: boolean;
  data: unknown;
  binding: number;
  name: string;
  format: string;
  offset?: number;
  length?: number;
}

export class MaterialComponent extends Component<MaterialComponent> {
  public vertexShaderGLSL: string;

  public fragmentShaderGLSL: string;

  public dirty = true;

  public stageDescriptor: Pick<
    GPURenderPipelineDescriptor,
    'vertexStage' | 'fragmentStage'
  >;

  public primitiveTopology: GPUPrimitiveTopology = 'triangle-list';

  public uniforms: IUniformBinding[] = [];

  public uniformsBindGroupLayout: GPUBindGroupLayout;

  public pipelineLayout: GPUPipelineLayout;

  public uniformBindGroup: GPUBindGroup;

  constructor(data: Partial<NonFunctionProperties<MaterialComponent>>) {
    super(data);

    Object.assign(this, data);
  }
}
