import {
  BufferData,
  IAttribute,
  IAttributeInitializationOptions,
  IBuffer,
} from '@antv/g-webgpu-core';
import { WebGPUEngine } from '.';
import WebGPUBuffer from './WebGPUBuffer';

export default class WebGPUAttribute implements IAttribute {
  private attribute: {
    buffer: GPUBuffer;
    offset: number;
    stride: number;
    normalized: boolean;
    divisor: number;
    size?: number;
    arrayStride: number;
    stepMode: GPUInputStepMode;
    attributes: Iterable<GPUVertexAttributeDescriptor>;
  };
  private buffer: IBuffer;

  constructor(
    private engine: WebGPUEngine,
    private options: IAttributeInitializationOptions,
  ) {
    const {
      buffer,
      offset,
      stride,
      normalized,
      size,
      divisor,
      arrayStride,
      attributes,
      stepMode,
    } = options;
    this.buffer = buffer;
    this.attribute = {
      buffer: (buffer as WebGPUBuffer).get(),
      offset: offset || 0,
      stride: stride || 0,
      normalized: normalized || false,
      divisor: divisor || 0,
      arrayStride: arrayStride || 0,
      // @ts-ignore
      attributes,
      stepMode: stepMode || 'vertex',
    };

    if (size) {
      this.attribute.size = size;
    }
  }

  public get() {
    return this.attribute;
  }

  public updateBuffer(options: {
    // 用于替换的数据
    data: BufferData;
    // 原 Buffer 替换位置，单位为 byte
    offset: number;
  }) {
    this.buffer.subData(options);
  }

  public destroy() {
    this.buffer.destroy();
  }
}
