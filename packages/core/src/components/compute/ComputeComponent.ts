import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { IComputeStrategy } from './IComputeStrategy';

export type ComputeType = 'particle' | 'layout';
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

export class ComputeComponent extends Component<ComputeComponent> {
  public type: ComputeType;

  public strategy: IComputeStrategy;

  public dirty: boolean = true;

  public shaderGLSL: string;

  public stageDescriptor: Pick<GPUComputePipelineDescriptor, 'computeStage'>;

  public pipelineLayout: GPUPipelineLayout;

  public bindings: Array<
    {
      name: string;
      data?: ArrayBufferView;
      buffer?: GPUBuffer;
    } & GPUBindGroupLayoutEntry
  > = [];

  /**
   * particle num to dispatch
   */
  public particleCount: number;

  /**
   * initial data of particles
   */
  public particleData: ArrayBufferView;

  public particleDataConstructor: TypedArrayConstructor;

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
