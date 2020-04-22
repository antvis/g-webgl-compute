import { inject, injectable } from 'inversify';
import { IRenderEngine } from '../..';
import { IDENTIFIER } from '../../identifier';
import { ComputeComponent } from './ComputeComponent';
import { IComputeStrategy } from './IComputeStrategy';

/**
 * 适合布局计算场景：
 * 1. 每一帧需要 dispatch 多次，以便尽快完成计算
 * 2. 只需要一个 GPUBuffer 存储初始节点和边数据
 * 3. 通常需要设置最大迭代次数，完成后返回最终 GPUBuffer 数据，供用户渲染结果
 */
@injectable()
export class LayoutComputeStrategy implements IComputeStrategy {
  public component: ComputeComponent;

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRenderEngine;

  public init() {
    const component = this.component;

    if (this.engine.supportWebGPU) {
      // create particleBuffers
      component.particleBuffers = [
        this.engine.createVertexBuffer(component.particleData, 128),
      ];

      // create GPUBuffers for uniform & storeage buffers
      component.bindings.forEach((binding) => {
        if (binding.type === 'uniform-buffer' && binding.data) {
          binding.buffer = this.engine.createUniformBuffer(binding.data);
        } else if (binding.type === 'storage-buffer' && binding.data) {
          binding.buffer = this.engine.createVertexBuffer(binding.data, 128);
        }
      });

      // create compute pipeline layout
      const computeBindGroupLayout = this.engine
        .getDevice()
        .createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: 4, // ShaderStage.Compute
              type: 'storage-buffer',
            },
            ...component.bindings.map((binding) => ({
              binding: binding.binding,
              visibility: 4,
              type: binding.type,
            })),
          ],
        });
      component.pipelineLayout = this.engine.getDevice().createPipelineLayout({
        bindGroupLayouts: [computeBindGroupLayout],
      });

      component.particleBindGroups[0] = this.engine
        .getDevice()
        .createBindGroup({
          layout: computeBindGroupLayout,
          entries: [
            {
              binding: 0,
              resource: {
                buffer: component.particleBuffers[0],
                offset: 0,
                size: component.particleData.byteLength,
              },
            },
            ...component.bindings.map((binding) => ({
              binding: binding.binding,
              resource: {
                buffer: binding.buffer!,
                offset: 0,
                size: binding.data?.byteLength || 0,
              },
            })),
          ],
        });
    }
  }

  public run() {
    // finish asap
    while (this.component.iteration <= this.component.maxIteration) {
      this.engine.dispatch(this.component.particleCount);
      this.component.iteration++;
    }
  }

  public getBindingGroup() {
    return this.component.particleBindGroups[0];
  }

  public getGPUBuffer() {
    return this.component.particleBuffers[0];
  }

  public destroy() {
    if (this.component.particleBuffers[0]) {
      this.component.particleBuffers[0].destroy();
    }
  }
}
