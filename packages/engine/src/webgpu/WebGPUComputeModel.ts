import { GLSLContext } from '@antv/g-webgpu-compiler';
import { gl, IComputeModel, isSafari } from '@antv/g-webgpu-core';
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import concat from 'lodash/concat';
import { WebGPUEngine } from '.';
import WebGPUBuffer from './WebGPUBuffer';

export default class WebGPUComputeModel implements IComputeModel {
  /**
   * 用于后续渲染时动态更新
   */
  private uniformGPUBufferLayout: Array<{
    name: string;
    offset: number;
  }> = [];

  private uniformBuffer: WebGPUBuffer;
  private vertexBuffers: WebGPUBuffer[] = [];

  private pipelineLayout: GPUPipelineLayout;
  private particleBindGroups = new Array(2);
  private particleBuffers: WebGPUBuffer[] = new Array(2);

  private computePipeline: GPUComputePipeline;

  constructor(private engine: WebGPUEngine, private context: GLSLContext) {}

  public async init() {
    const { computeStage } = await this.compileComputePipelineStageDescriptor(
      this.context.shader!,
    );

    const buffers = this.context.uniforms.filter(
      (uniform) => uniform.type === 'sampler2D' || 'image2D',
    );
    const uniforms = this.context.uniforms.filter(
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

      this.uniformBuffer = new WebGPUBuffer(this.engine, {
        // TODO: 处理 Struct 和 boolean
        // @ts-ignore
        data:
          mergedUniformData instanceof Array
            ? // @ts-ignore
              new Float32Array(mergedUniformData)
            : mergedUniformData,
        usage:
          WebGPUConstants.BufferUsage.Uniform |
          WebGPUConstants.BufferUsage.CopyDst,
      });

      bindGroupLayoutEntries.push({
        binding: 0,
        visibility: 4,
        type: 'uniform-buffer',
      });

      bindGroupEntries.push({
        binding: 0,
        resource: {
          buffer: this.uniformBuffer.get(),
          offset: 0,
          size: mergedUniformData.length * 4, // 默认 Float32Array
        },
      });
    }

    // create GPUBuffers for storeage buffers
    buffers.forEach((buffer) => {
      if (buffer.data) {
        if (buffer.type === 'sampler2D') {
          // 如果添加了 MapRead，Chrome 会报错
          const bufferUsage = isSafari
            ? WebGPUConstants.BufferUsage.Vertex |
              WebGPUConstants.BufferUsage.CopyDst |
              WebGPUConstants.BufferUsage.MapRead
            : WebGPUConstants.BufferUsage.Vertex |
              WebGPUConstants.BufferUsage.CopyDst |
              WebGPUConstants.BufferUsage.CopySrc;
          const gpuBuffer = new WebGPUBuffer(this.engine, {
            // @ts-ignore
            data: isFinite(Number(buffer.data)) ? [buffer.data] : buffer.data,
            usage: bufferUsage | WebGPUConstants.BufferUsage.Storage,
          });
          this.vertexBuffers.push(gpuBuffer);
          if (buffer.name === this.context.output.name) {
            this.context.output = {
              name: buffer.name,
              // @ts-ignore
              length: isFinite(Number(buffer.data)) ? 1 : buffer.data.length,
              typedArrayConstructor: Float32Array,
              gpuBuffer: gpuBuffer.get(),
            };
          }
          bindGroupEntries.push({
            binding: bufferBindingIndex,
            resource: {
              buffer: gpuBuffer.get(),
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
          // } else if (buffer.type === 'image2D') {
          //   if (!buffer.size) {
          //     throw new Error(`The size of ${buffer.name} must be declared.`);
          //   }
          //   const gpuBuffer = this.engine.createTexture(
          //     buffer.size,
          //     // @ts-ignore
          //     buffer.data,
          //     4, // sampled-texture
          //   );
          //   const sampler = this.engine.createSampler({
          //     magFilter: 'linear',
          //     minFilter: 'linear',
          //   });

          //   bindGroupEntries.push({
          //     binding: bufferBindingIndex,
          //     resource: gpuBuffer.createView(),
          //   });
          //   bindGroupEntries.push({
          //     binding: bufferBindingIndex + 1,
          //     resource: sampler,
          //   });

          //   bindGroupLayoutEntries.push({
          //     binding: bufferBindingIndex,
          //     visibility: 4,
          //     type: 'sampled-texture',
          //   });
          //   bindGroupLayoutEntries.push({
          //     binding: bufferBindingIndex + 1,
          //     visibility: 4,
          //     type: 'sampler',
          //   });

          //   bufferBindingIndex += 2;
        }
      }
    });

    // create compute pipeline layout
    const computeBindGroupLayout = this.engine.device.createBindGroupLayout(
      isSafari
        ? // @ts-ignore
          { bindings: bindGroupLayoutEntries }
        : { entries: bindGroupLayoutEntries },
    );
    this.pipelineLayout = this.engine.device.createPipelineLayout({
      bindGroupLayouts: [computeBindGroupLayout],
    });

    this.particleBindGroups[0] = this.engine.device.createBindGroup(
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

    this.computePipeline = this.engine.device.createComputePipeline({
      layout: this.pipelineLayout,
      computeStage,
    });
  }

  public destroy(): void {
    if (this.particleBuffers[0]) {
      this.particleBuffers[0].destroy();
    }

    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
    }

    this.vertexBuffers.forEach((b) => b.destroy());
  }

  public async readData() {
    const { output } = this.context;
    if (output) {
      const { length, typedArrayConstructor, gpuBuffer } = output;
      if (gpuBuffer) {
        let arraybuffer;
        if (isSafari) {
          arraybuffer = await gpuBuffer.mapReadAsync();
        } else {
          const byteCount = length! * typedArrayConstructor!.BYTES_PER_ELEMENT;
          const gpuReadBuffer = this.engine.device.createBuffer({
            size: byteCount,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
          });

          this.engine.uploadEncoder.copyBufferToBuffer(
            gpuBuffer,
            0,
            gpuReadBuffer,
            0,
            byteCount,
          );

          // submit copy command
          this.engine.commandBuffers[0] = this.engine.uploadEncoder.finish();
          // filter undefined buffers
          this.engine.device.defaultQueue.submit(
            this.engine.commandBuffers.filter((b) => b),
          );
          this.engine.uploadEncoder = this.engine.device.createCommandEncoder(
            this.engine.uploadEncoderDescriptor,
          );

          arraybuffer = await gpuReadBuffer.mapReadAsync();
          // destroy read buffer later
          this.engine.tempBuffers.push(gpuReadBuffer);
        }
        return new typedArrayConstructor!(arraybuffer);
      }
    }
    return new Float32Array();
  }

  public run() {
    if (this.engine.currentComputePass) {
      this.engine.currentComputePass.setPipeline(this.computePipeline);
      this.engine.currentComputePass.setBindGroup(
        0,
        this.particleBindGroups[0],
      );
      this.engine.currentComputePass.dispatch(...this.context.dispatch);
    }
  }

  public updateUniform(
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
      this.uniformBuffer.subData({
        data: Number.isFinite(data)
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
        offset: layout.offset,
      });
    }
  }

  public confirmInput(model: IComputeModel, inputName: string): void {
    // TODO: 拷贝 GPUBuffer
  }

  private compileShaderToSpirV(
    source: string,
    type: string,
    shaderVersion: string,
  ): Promise<Uint32Array> {
    return this.compileRawShaderToSpirV(shaderVersion + source, type);
  }

  private compileRawShaderToSpirV(
    source: string,
    type: string,
  ): Promise<Uint32Array> {
    return this.engine.glslang.compileGLSL(source, type);
  }

  private async compileComputePipelineStageDescriptor(
    computeCode: string,
  ): Promise<Pick<GPUComputePipelineDescriptor, 'computeStage'>> {
    let computeShader;
    if (isSafari) {
      computeShader = computeCode;
    } else {
      const shaderVersion = '#version 450\n';
      computeShader = await this.compileShaderToSpirV(
        computeCode,
        'compute',
        shaderVersion,
      );
    }

    return {
      computeStage: {
        module: this.engine.device.createShaderModule({
          code: computeShader,
          // @ts-ignore
          isWHLSL: isSafari,
        }),
        entryPoint: 'main',
      },
    };
  }
}
