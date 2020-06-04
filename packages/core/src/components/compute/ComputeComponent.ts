import { GLSLContext, Target } from '@antv/g-webgpu-compiler';
import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { IComputeStrategy } from './IComputeStrategy';

type ComputeType = 'particle' | 'layout';
type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Uint8ClampedArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

class ComputeComponent extends Component<ComputeComponent> {
  public type: ComputeType = 'layout';

  public strategy: IComputeStrategy;

  public dirty: boolean = true;

  public rawShaderCode: string;

  public precompiled: boolean = false;
  public compiledBundle: {
    shaders: {
      [Target.WebGL]: string;
      [Target.WebGPU]: string;
    };
    context: GLSLContext;
  };

  public stageDescriptor: Pick<GPUComputePipelineDescriptor, 'computeStage'>;

  public pipelineLayout: GPUPipelineLayout;

  public bindings: Array<{
    name: string;
    data?: ArrayBufferView | number[] | number;
    buffer?: GPUBuffer;
  }> = [];

  /**
   * size of thread grid
   */
  public dispatch: [number, number, number];

  public particleBuffers: GPUBuffer[] = new Array(2);
  public particleBindGroups = new Array(2);

  /**
   * current iteration, start from 0
   */
  public iteration: number = 0;

  /**
   * max iteration, the pipeline will finish when iteration exceed this max value
   */
  public maxIteration: number;

  /**
   * if this pipeline finished
   */
  public finished: boolean = false;

  /**
   * when finished, send back final particles' data
   */
  public onCompleted?: ((particleData: ArrayBufferView) => void) | null;

  constructor(data: Partial<NonFunctionProperties<ComputeComponent>>) {
    super(data);

    Object.assign(this, data);
  }
}

export { ComputeType, ComputeComponent };
