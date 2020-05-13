import { GLSLContext } from '@antv/g-webgpu-compiler';
import { inject, injectable } from 'inversify';
import { concat } from 'lodash';
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

  public init(context: GLSLContext) {
    const component = this.component;

    if (this.engine.supportWebGPU) {
      const buffers = context.uniforms.filter(
        (uniform) => uniform.type === 'sampler2D',
      );
      const uniforms = context.uniforms.filter(
        (uniform) => uniform.type !== 'sampler2D',
      );

      const bufferBindingIndex = uniforms.length ? 1 : 0;
      const bindGroupLayoutEntries = [];
      const bindGroupEntries = [];
      if (bufferBindingIndex) {
        const mergedUniformData = concat(
          uniforms.map((uniform) => uniform.data),
        );
        const mergedUniformGPUBuffer = this.engine.createUniformBuffer(
          // @ts-ignore
          mergedUniformData,
        );

        bindGroupLayoutEntries.push({
          binding: 0,
          visibility: 4,
          type: 'uniform-buffer',
        });

        bindGroupEntries.push({
          binding: 0,
          resource: {
            buffer: mergedUniformGPUBuffer,
            offset: 0,
            size: mergedUniformData.length * 4, // 默认 Float32Array
          },
        });
      }

      // create GPUBuffers for storeage buffers
      buffers.forEach((buffer, i) => {
        if (buffer.data) {
          // @ts-ignore
          const gpuBuffer = this.engine.createVertexBuffer(
            // @ts-ignore
            isFinite(Number(buffer.data)) ? [buffer.data] : buffer.data,
            128,
          );
          if (!context.output) {
            context.output = {
              // @ts-ignore
              length: isFinite(Number(buffer.data)) ? 1 : buffer.data.length,
              typedArrayConstructor: Float32Array,
              gpuBuffer,
            };
          }
          bindGroupEntries.push({
            binding: bufferBindingIndex + i,
            resource: {
              buffer: gpuBuffer,
              offset: 0,
              size:
                // @ts-ignore
                (isFinite(Number(buffer.data)) ? 1 : buffer.data.length) * 4, // 默认 Float32Array
            },
          });
        }
        bindGroupLayoutEntries.push({
          binding: bufferBindingIndex + i,
          visibility: 4,
          type: 'storage-buffer',
        });
      });

      // create compute pipeline layout
      const computeBindGroupLayout = this.engine
        .getDevice()
        // @ts-ignore
        .createBindGroupLayout({ entries: bindGroupLayoutEntries });
      component.pipelineLayout = this.engine.getDevice().createPipelineLayout({
        bindGroupLayouts: [computeBindGroupLayout],
      });

      component.particleBindGroups[0] = this.engine
        .getDevice()
        .createBindGroup({
          layout: computeBindGroupLayout,
          entries: bindGroupEntries,
        });
    }
  }

  public run() {
    // finish asap
    while (this.component.iteration <= this.component.maxIteration - 1) {
      this.engine.dispatch(this.component.compiledBundle.context);
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
