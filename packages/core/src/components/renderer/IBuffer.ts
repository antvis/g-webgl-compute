import { gl } from './gl';
import { BufferData } from './IRendererService';

export interface IBufferInitializationOptions {
  data: BufferData;

  /**
   * gl.DRAW_STATIC | gl.DYNAMIC_DRAW | gl.STREAM_DRAW
   */
  usage?: gl.STATIC_DRAW | gl.DYNAMIC_DRAW | gl.STREAM_DRAW;

  /**
   * gl.Float | gl.UNSIGNED_BYTE | ...
   */
  type?: gl.FLOAT | gl.UNSIGNED_BYTE;
  length?: number;
}

export interface IBuffer {
  /**
   * gl.bufferSubData
   */
  subData(options: {
    // 用于替换的数据
    data: BufferData;
    // 原 Buffer 替换位置，单位为 byte
    offset: number;
  }): void;

  /**
   * gl.deleteBuffer
   */
  destroy(): void;
}
