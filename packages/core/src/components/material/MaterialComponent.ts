import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { IUniformBinding } from './interface';

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

  public colorStates?: Pick<GPURenderPipelineDescriptor, 'colorStates'>;

  public depthStencilState?: GPUDepthStencilStateDescriptor;

  public rasterizationState?: GPURasterizationStateDescriptor;

  constructor(data: Partial<NonFunctionProperties<MaterialComponent>>) {
    super(data);

    Object.assign(this, data);
  }
}
