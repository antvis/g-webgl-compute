import {
  BufferData,
  IBuffer,
  IElements,
  IElementsInitializationOptions,
} from '@antv/g-webgpu-core';
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { WebGPUEngine } from '.';
import WebGPUBuffer from './WebGPUBuffer';

export default class WebGPUElements implements IElements {
  public indexCount: number;
  private buffer: IBuffer;

  constructor(
    private engine: WebGPUEngine,
    private options: IElementsInitializationOptions,
  ) {
    const { data, usage, type, count } = options;
    this.indexCount = count || 0;

    this.buffer = new WebGPUBuffer(engine, {
      // @ts-ignore
      data: data instanceof Array ? new Uint16Array(data) : data,
      usage:
        WebGPUConstants.BufferUsage.Index | WebGPUConstants.BufferUsage.CopyDst,
    });
  }

  public get() {
    return this.buffer;
  }

  public subData(options: {
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
