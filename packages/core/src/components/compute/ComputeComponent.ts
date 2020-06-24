import { GLSLContext, Target } from '@antv/g-webgpu-compiler';
import { Component, Entity } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { IComputeStrategy } from './IComputeStrategy';
import { ComputeType } from './interface';

export class ComputeComponent extends Component<ComputeComponent> {
  public type: ComputeType = 'layout';

  public strategy: IComputeStrategy;

  public dirty: boolean = true;

  public rawShaderCode: string;

  public precompiled: boolean = false;
  public compiledBundle: {
    shaders: {
      [Target.WebGL]: string;
      [Target.WebGPU]: string;
      [Target.WHLSL]: string;
    };
    context: GLSLContext;
  };

  public stageDescriptor: Pick<GPUComputePipelineDescriptor, 'computeStage'>;

  public pipelineLayout: GPUPipelineLayout;

  public bindings: Array<{
    name: string;
    data?: ArrayBufferView | number[] | number;
    buffer?: GPUBuffer;
    referer?: {
      entity: Entity;
      bindingName: string;
    };
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
  public onCompleted?:
    | ((
        particleData:
          | Float32Array
          | Float64Array
          | Int8Array
          | Uint8Array
          | Uint8ClampedArray
          | Int16Array
          | Uint16Array
          | Int32Array
          | Uint32Array,
      ) => void)
    | null;

  /**
   * when every iteration finished, send back final particles' data
   */
  public onIterationCompleted?: ((iteration: number) => Promise<void>) | null;

  constructor(data: Partial<NonFunctionProperties<ComputeComponent>>) {
    super(data);

    Object.assign(this, data);
  }
}
