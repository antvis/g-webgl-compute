import {
  AST_TOKEN_TYPES,
  gl,
  GLSLContext,
  IComputeModel,
  isSafari,
  STORAGE_CLASS,
  createEntity,
} from '@antv/g-webgpu-core';
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { isNumber } from 'lodash';
import isNil from 'lodash/isNil';
import { WebGPUEngine } from '.';
import WebGPUBuffer from './WebGPUBuffer';

export default class WebGPUComputeModel implements IComputeModel {
  private entity = createEntity();
  /**
   * 用于后续渲染时动态更新
   */
  private uniformGPUBufferLayout: Array<{
    name: string;
    offset: number;
  }> = [];

  private uniformBuffer: WebGPUBuffer;
  private vertexBuffers: Record<string, WebGPUBuffer> = {};
  private outputBuffer: WebGPUBuffer;
  private bindGroupEntries: GPUBindGroupEntry[];
  private bindGroup: GPUBindGroup;

  private computePipeline: GPUComputePipeline;

  constructor(private engine: WebGPUEngine, private context: GLSLContext) {}

  public async init() {
    const { computeStage } = await this.compileComputePipelineStageDescriptor(
      this.context.shader!,
    );

    const buffers = this.context.uniforms.filter(
      (uniform) => uniform.storageClass === STORAGE_CLASS.StorageBuffer,
    );
    const uniforms = this.context.uniforms.filter(
      (uniform) => uniform.storageClass === STORAGE_CLASS.Uniform,
    );

    let bufferBindingIndex = uniforms.length ? 1 : 0;
    this.bindGroupEntries = [];
    if (bufferBindingIndex) {
      let offset = 0;
      // FIXME: 所有 uniform 合并成一个 buffer，固定使用 Float32Array 存储，确实会造成一些内存的浪费
      // we use std140 layout @see https://www.khronos.org/opengl/wiki/Interface_Block_(GLSL)
      const mergedUniformData: number[] = [];
      uniforms.forEach((uniform) => {
        if (isNumber(uniform.data)) {
          this.uniformGPUBufferLayout.push({
            name: uniform.name,
            offset,
          });
          offset += 4;
          mergedUniformData.push(uniform.data);
        } else {
          let originDataLength = uniform.data?.length || 1;
          if (originDataLength === 3) {
            // vec3 -> vec4
            // @see http://ptgmedia.pearsoncmg.com/images/9780321552624/downloads/0321552628_AppL.pdf
            originDataLength = 4;
            uniform.data.push(0);
          }
          // 4 elements per block/line
          const padding = (offset / 4) % 4;
          if (padding > 0) {
            const space = 4 - padding;
            if (originDataLength > 1 && originDataLength <= space) {
              if (originDataLength === 2) {
                if (space === 3) {
                  offset += 4;
                  mergedUniformData.push(0);
                }
                mergedUniformData.push(...uniform.data);
                this.uniformGPUBufferLayout.push({
                  name: uniform.name,
                  offset,
                });
              }
            } else {
              for (let i = 0; i < space; i++) {
                offset += 4;
                mergedUniformData.push(0);
              }
              mergedUniformData.push(...uniform.data);
              this.uniformGPUBufferLayout.push({
                name: uniform.name,
                offset,
              });
            }
          }

          offset += 4 * originDataLength;
        }
      });

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

      this.bindGroupEntries.push({
        binding: 0,
        resource: {
          buffer: this.uniformBuffer.get(),
        },
      });
    }

    // create GPUBuffers for storeage buffers
    buffers.forEach((buffer) => {
      if (!isNil(buffer.data)) {
        if (
          buffer.type === AST_TOKEN_TYPES.Vector4FloatArray ||
          buffer.type === AST_TOKEN_TYPES.FloatArray
        ) {
          let gpuBuffer;
          if (buffer.name === this.context.output.name) {
            gpuBuffer = new WebGPUBuffer(this.engine, {
              // @ts-ignore
              data: isFinite(Number(buffer.data)) ? [buffer.data] : buffer.data,
              usage:
                WebGPUConstants.BufferUsage.Storage |
                WebGPUConstants.BufferUsage.CopyDst |
                WebGPUConstants.BufferUsage.CopySrc,
            });
            this.outputBuffer = gpuBuffer;
            this.context.output = {
              name: buffer.name,
              // @ts-ignore
              length: isFinite(Number(buffer.data)) ? 1 : buffer.data.length,
              typedArrayConstructor: Float32Array,
              gpuBuffer: gpuBuffer.get(),
            };
          } else {
            if (buffer.isReferer) {
              // @ts-ignore
              if (buffer.data.model && buffer.data.model.outputBuffer) {
                // @ts-ignore
                gpuBuffer = (buffer.data.model as WebGPUComputeModel)
                  .outputBuffer;
              } else {
                // referred kernel haven't been executed
              }
            } else {
              gpuBuffer = new WebGPUBuffer(this.engine, {
                // @ts-ignore
                data: isFinite(Number(buffer.data))
                  ? [buffer.data]
                  : buffer.data,
                usage:
                  WebGPUConstants.BufferUsage.Storage |
                  WebGPUConstants.BufferUsage.CopyDst |
                  WebGPUConstants.BufferUsage.CopySrc,
              });
            }
          }

          this.vertexBuffers[buffer.name] = gpuBuffer;
          this.bindGroupEntries.push({
            binding: bufferBindingIndex,
            resource: {
              name: buffer.name,
              refer: gpuBuffer ? undefined : buffer.data,
              buffer: gpuBuffer ? gpuBuffer.get() : undefined,
            },
          });
          bufferBindingIndex++;
        }
      }
    });

    // create compute pipeline layout
    this.computePipeline = this.engine.device.createComputePipeline({
      computeStage,
    });

    console.log(this.bindGroupEntries);

    this.bindGroup = this.engine.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: this.bindGroupEntries,
    });
  }

  public destroy(): void {
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
    }

    Object.keys(this.vertexBuffers).forEach((bufferName) =>
      this.vertexBuffers[bufferName].destroy(),
    );
  }

  public async readData() {
    const { output } = this.context;
    if (output) {
      const { length, typedArrayConstructor, gpuBuffer } = output;
      if (gpuBuffer) {
        // await gpuBuffer.mapAsync(WebGPUConstants.MapMode.Read);
        // const arraybuffer = gpuBuffer.getMappedRange();
        // let arraybuffer;

        // if (isSafari) {
        //   arraybuffer = await gpuBuffer.mapReadAsync();
        // } else {
        const byteCount = length! * typedArrayConstructor!.BYTES_PER_ELEMENT;

        // @see https://developers.google.com/web/updates/2019/08/get-started-with-gpu-compute-on-the-web
        const gpuReadBuffer = this.engine.device.createBuffer({
          size: byteCount,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
        const encoder = this.engine.device.createCommandEncoder();
        encoder.copyBufferToBuffer(gpuBuffer, 0, gpuReadBuffer, 0, byteCount);
        const queue: GPUQueue = isSafari
          ? // @ts-ignore
            this.engine.device.getQueue()
          : this.engine.device.defaultQueue;
        queue.submit([encoder.finish()]);

        await gpuReadBuffer.mapAsync(WebGPUConstants.MapMode.Read);
        const arraybuffer = gpuReadBuffer.getMappedRange();
        const typedArray = new typedArrayConstructor!(arraybuffer.slice(0));
        gpuReadBuffer.unmap();

        return typedArray;
      }
    }
    return new Float32Array();
  }

  public run() {
    if (this.engine.currentComputePass) {
      this.engine.currentComputePass.setPipeline(this.computePipeline);

      // this.bindGroupEntries.forEach((entry) => {
      //   if (!entry.resource.buffer) {
      //     // get referred kernel's output
      //     const gpuBuffer = (entry.resource.refer.model as WebGPUComputeModel)
      //       .outputBuffer;
      //     this.vertexBuffers[entry.resource.name] = gpuBuffer;
      //     entry.resource.buffer = gpuBuffer.get();
      //   }
      // });

      // const bindGroup = this.engine.device.createBindGroup({
      //   layout: this.computePipeline.getBindGroupLayout(0),
      //   entries: this.bindGroupEntries,
      // });
      this.engine.currentComputePass.setBindGroup(0, this.bindGroup);
      this.engine.currentComputePass.dispatch(...this.context.dispatch);
    }
  }

  public updateBuffer(
    bufferName: string,
    data:
      | number[]
      | Float32Array
      | Uint8Array
      | Uint16Array
      | Uint32Array
      | Int8Array
      | Int16Array
      | Int32Array,
    offset: number = 0,
  ) {
    const buffer = this.vertexBuffers[bufferName];
    if (buffer) {
      buffer.subData({ data, offset });
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
    // copy output GPUBuffer of kernel
    const inputBuffer = this.vertexBuffers[inputName];
    const outputBuffer = (model as WebGPUComputeModel).outputBuffer;

    if (inputBuffer && outputBuffer && inputBuffer !== outputBuffer) {
      const encoder = this.engine.device.createCommandEncoder();
      const {
        length,
        typedArrayConstructor,
      } = (model as WebGPUComputeModel).context.output;
      const byteCount = length! * typedArrayConstructor!.BYTES_PER_ELEMENT;
      encoder.copyBufferToBuffer(
        outputBuffer.get(),
        0,
        inputBuffer.get(),
        0,
        byteCount,
      );
      const queue: GPUQueue = isSafari
        ? // @ts-ignore
          this.engine.device.getQueue()
        : this.engine.device.defaultQueue;
      queue.submit([encoder.finish()]);
    }
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
    let computeShader: Uint32Array | string = computeCode;
    const shaderVersion = '#version 450\n';
    if (!this.engine.options.useWGSL) {
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
