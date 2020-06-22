import { GLSLContext } from '@antv/g-webgpu-compiler';
import { inject, injectable } from 'inversify';
import concat from 'lodash/concat';
import { IRenderEngine } from '../..';
import { IDENTIFIER } from '../../identifier';
import { isSafari } from '../../utils/isSafari';
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

  private mergedUniformGPUBuffer: GPUBuffer;
  private uniformGPUBufferLayout: Array<{
    name: string;
    offset: number;
  }> = [];
  private vertexBuffers: GPUBuffer[] = [];

  public init(context: GLSLContext) {
    const component = this.component;

    if (this.engine.supportWebGPU) {
      const buffers = context.uniforms.filter(
        (uniform) => uniform.type === 'sampler2D' || 'image2D',
      );
      const uniforms = context.uniforms.filter(
        (uniform) => uniform.type !== 'sampler2D' && uniform.type !== 'image2D',
      );

      let bufferBindingIndex = uniforms.length ? 1 : 0;
      const bindGroupLayoutEntries = [];
      const bindGroupEntries = [];
      if (bufferBindingIndex) {
        let offset = 0;
        // FIXME: 所有 uniform 合并成一个 buffer，固定使用 Float32Array 存储，确实会造成一些内存的浪费
        const mergedUniformData = concat(
          uniforms.map((uniform) => {
            this.uniformGPUBufferLayout.push({
              name: uniform.name,
              offset,
            });
            // @ts-ignore
            offset += (uniform.data.length || 1) * 4;
            return uniform.data;
          }),
        );
        this.mergedUniformGPUBuffer = this.engine.createUniformBuffer(
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
            buffer: this.mergedUniformGPUBuffer,
            offset: 0,
            size: mergedUniformData.length * 4, // 默认 Float32Array
          },
        });
      }

      // create GPUBuffers for storeage buffers
      buffers.forEach((buffer) => {
        if (buffer.data) {
          if (buffer.type === 'sampler2D') {
            // @ts-ignore
            const gpuBuffer = this.engine.createVertexBuffer(
              // @ts-ignore
              isFinite(Number(buffer.data)) ? [buffer.data] : buffer.data,
              128,
            );
            this.vertexBuffers.push(gpuBuffer);
            if (buffer.name === context.output.name) {
              context.output = {
                name: buffer.name,
                // @ts-ignore
                length: isFinite(Number(buffer.data)) ? 1 : buffer.data.length,
                typedArrayConstructor: Float32Array,
                gpuBuffer,
              };
            }
            bindGroupEntries.push({
              binding: bufferBindingIndex,
              resource: {
                buffer: gpuBuffer,
                offset: 0,
                size:
                  // @ts-ignore
                  (isFinite(Number(buffer.data)) ? 1 : buffer.data.length) *
                  (isFinite(Number(buffer.data))
                    ? 1
                    : // @ts-ignore
                      (buffer.data as Float32Array).BYTES_PER_ELEMENT || 4), // 默认 Float32Array
              },
            });
            bindGroupLayoutEntries.push({
              binding: bufferBindingIndex,
              visibility: 4,
              type: 'storage-buffer',
            });

            bufferBindingIndex++;
          } else if (buffer.type === 'image2D') {
            if (!buffer.size) {
              throw new Error(`The size of ${buffer.name} must be declared.`);
            }
            const gpuBuffer = this.engine.createTexture(
              buffer.size,
              // @ts-ignore
              buffer.data,
              4, // sampled-texture
            );
            const sampler = this.engine.createSampler({
              magFilter: 'linear',
              minFilter: 'linear',
            });

            bindGroupEntries.push({
              binding: bufferBindingIndex,
              resource: gpuBuffer.createView(),
            });
            bindGroupEntries.push({
              binding: bufferBindingIndex + 1,
              resource: sampler,
            });

            bindGroupLayoutEntries.push({
              binding: bufferBindingIndex,
              visibility: 4,
              type: 'sampled-texture',
            });
            bindGroupLayoutEntries.push({
              binding: bufferBindingIndex + 1,
              visibility: 4,
              type: 'sampler',
            });

            bufferBindingIndex += 2;
          }
        }
      });

      // create compute pipeline layout
      const computeBindGroupLayout = this.engine
        .getDevice()
        .createBindGroupLayout(
          isSafari
            ? // @ts-ignore
              { bindings: bindGroupLayoutEntries }
            : { entries: bindGroupLayoutEntries },
        );
      component.pipelineLayout = this.engine.getDevice().createPipelineLayout({
        bindGroupLayouts: [computeBindGroupLayout],
      });

      component.particleBindGroups[0] = this.engine.getDevice().createBindGroup(
        isSafari
          ? {
              layout: computeBindGroupLayout,
              // @ts-ignore
              bindings: bindGroupEntries,
            }
          : {
              layout: computeBindGroupLayout,
              entries: bindGroupEntries,
            },
      );
    }
  }

  public async run() {
    this.engine.dispatch(this.component.compiledBundle.context);
    if (this.component.onIterationCompleted) {
      await this.component.onIterationCompleted(this.component.iteration);
    }
  }

  public getBindingGroup() {
    return this.component.particleBindGroups[0];
  }

  public getGPUBuffer() {
    return this.component.particleBuffers[0];
  }

  public updateUniformGPUBuffer(
    uniformName: string,
    data:
      | number
      | number[]
      | Float32Array
      | Uint8Array
      | Uint16Array
      | Uint32Array
      | Int8Array
      | Int16Array
      | Int32Array,
  ) {
    const layout = this.uniformGPUBufferLayout.find(
      (l) => l.name === uniformName,
    );

    if (layout) {
      this.engine.setSubData(
        this.mergedUniformGPUBuffer,
        layout.offset,
        Number.isFinite(data)
          ? new Float32Array([data as number])
          : new Float32Array(
              data as
                | number[]
                | Float32Array
                | Uint8Array
                | Uint16Array
                | Uint32Array
                | Int8Array
                | Int16Array
                | Int32Array,
            ),
      );
    }
  }

  public destroy() {
    if (this.component.particleBuffers[0]) {
      this.component.particleBuffers[0].destroy();
    }

    if (this.mergedUniformGPUBuffer) {
      this.mergedUniformGPUBuffer.destroy();
    }

    this.vertexBuffers.forEach((b) => b.destroy());
  }
}
