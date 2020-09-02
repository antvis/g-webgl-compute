import {
  BufferData,
  gl,
  IBuffer,
  IBufferInitializationOptions,
  isSafari,
} from '@antv/g-webgpu-core';
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { WebGPUEngine } from '.';

export default class WebGPUBuffer implements IBuffer {
  private buffer: GPUBuffer;

  constructor(
    private engine: WebGPUEngine,
    private options: IBufferInitializationOptions,
  ) {
    const { data, usage, type } = options;
    this.buffer = this.createBuffer(
      data instanceof Array ? new Float32Array(data) : data,
      // TODO: WebGL 和 WebGPU buffer usage 映射关系
      usage ||
        WebGPUConstants.BufferUsage.Vertex |
          WebGPUConstants.BufferUsage.CopyDst,
    );
  }

  public get() {
    return this.buffer;
  }

  public destroy() {
    this.buffer.destroy();
  }

  public subData({ data, offset }: { data: BufferData; offset: number }) {
    this.setSubData(
      this.buffer,
      offset,
      data instanceof Array ? new Float32Array(data) : data,
    );
  }

  private createBuffer(
    view: Exclude<BufferData, number[]>,
    flags: GPUBufferUsageFlags,
  ): GPUBuffer {
    // @ts-ignore
    const padding = view.byteLength % 4;
    const verticesBufferDescriptor = {
      // @ts-ignore
      size: view.byteLength + padding,
      usage: flags,
    };
    const buffer = this.engine.device.createBuffer(verticesBufferDescriptor);

    this.setSubData(buffer, 0, view);

    return buffer;
  }

  /**
   * 不同于 Babylon.js 的版本，使用最新的 GPUQueue.writeBuffer 方法
   * @see https://gpuweb.github.io/gpuweb/#dom-gpuqueue-writebuffer
   * 已废弃创建一个临时的 mapped buffer 用于拷贝数据 @see https://gpuweb.github.io/gpuweb/#GPUDevice-createBufferMapped
   * @see https://github.com/gpuweb/gpuweb/blob/master/design/BufferOperations.md#updating-data-to-an-existing-buffer-like-webgls-buffersubdata
   */
  private setSubData(
    destBuffer: GPUBuffer,
    destOffset: number,
    srcArrayBuffer: Exclude<BufferData, number[]>,
  ) {
    // deprecated API setSubData
    // destBuffer.setSubData(0, srcArrayBuffer);

    // deprecated API createBufferMapped
    // use createBuffer & getMappedRange instead
    // const [srcBuffer, arrayBuffer] = this.engine.device.createBufferMapped({
    //   size: byteCount,
    //   usage: WebGPUConstants.BufferUsage.CopySrc,
    // });

    const queue: GPUQueue = isSafari
      ? // @ts-ignore
        this.engine.device.getQueue()
      : this.engine.device.defaultQueue;
    // @ts-ignore
    queue.writeBuffer(destBuffer, destOffset, srcArrayBuffer);
  }
}
