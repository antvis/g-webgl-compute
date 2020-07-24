import {
  BufferData,
  gl,
  IBuffer,
  IBufferInitializationOptions,
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
    const padding = view.byteLength % 4;
    const verticesBufferDescriptor = {
      size: view.byteLength + padding,
      usage: flags,
    };
    const buffer = this.engine.device.createBuffer(verticesBufferDescriptor);

    this.setSubData(buffer, 0, view);

    return buffer;
  }

  /**
   * 不同于 Babylon.js 的版本，使用最新的 map buffer 方法，创建一个临时的 mapped buffer 用于拷贝数据
   * @see https://gpuweb.github.io/gpuweb/#GPUDevice-createBufferMapped
   * @see https://github.com/gpuweb/gpuweb/blob/master/design/BufferOperations.md#updating-data-to-an-existing-buffer-like-webgls-buffersubdata
   *
   * TODO: 使用类似 AutoRingBuffer 之类的缓存结构尽可能复用临时 GPUBuffer
   */
  private setSubData(
    destBuffer: GPUBuffer,
    destOffset: number,
    srcArrayBuffer: Exclude<BufferData, number[]>,
  ) {
    // deprecated API
    // destBuffer.setSubData(0, srcArrayBuffer);

    const byteCount = srcArrayBuffer.byteLength;
    const [srcBuffer, arrayBuffer] = this.engine.device.createBufferMapped({
      size: byteCount,
      usage: WebGPUConstants.BufferUsage.CopySrc,
    });

    new Uint8Array(arrayBuffer).set(new Uint8Array(srcArrayBuffer.buffer));
    srcBuffer.unmap();

    this.engine.uploadEncoder.copyBufferToBuffer(
      srcBuffer,
      0,
      destBuffer,
      destOffset,
      byteCount,
    );

    // 不能立即 destroy 掉临时 buffer，因为 encoder 还未提交，
    // 会报 'Destroyed buffer used in a submit'，因此只能在 encoder 提交后统一进行销毁
    // srcBuffer.destroy();
    this.engine.tempBuffers.push(srcBuffer);
  }
}
