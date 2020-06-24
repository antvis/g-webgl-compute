export interface IMaterialParams {
  colorStates: Pick<GPURenderPipelineDescriptor, 'colorStates'>;
  primitiveTopology:
    | 'point-list'
    | 'line-list'
    | 'line-strip'
    | 'triangle-list'
    | 'triangle-strip'
    | undefined;
  depthStencilState: GPUDepthStencilStateDescriptor;
  rasterizationState: GPURasterizationStateDescriptor;
}

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
