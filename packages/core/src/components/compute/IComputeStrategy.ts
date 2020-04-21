import { ComputeComponent } from './ComputeComponent';

export interface IComputeStrategy {
  component: ComputeComponent;

  /**
   * create binding group, buffers
   */
  init(): void;

  /**
   * dispatch with different frequencies
   */
  run(): void;

  /**
   *
   */
  getGPUBuffer(): GPUBuffer;

  /**
   *
   */
  getBindingGroup(): GPUBindGroup;

  /**
   * destroy used GPUBuffer(s)
   */
  destroy(): void;
}
