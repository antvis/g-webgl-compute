import {
  gl,
  IFramebuffer,
  IFramebufferInitializationOptions,
  IRenderbuffer,
  ITexture2D,
} from '@antv/g-webgpu-core';
import { WebGPUEngine } from '.';
import WebGPUTexture2D from './WebGPUTexture2D';

export default class WebGPUFramebuffer implements IFramebuffer {
  private colorTexture: WebGPUTexture2D | null;
  private depthTexture: WebGPUTexture2D | null;
  private width: number = 0;
  private height: number = 0;

  constructor(
    private engine: WebGPUEngine,
    private options: IFramebufferInitializationOptions,
  ) {
    const { width, height, color, colors, depth, stencil } = options;
    if (color) {
      this.colorTexture = color as WebGPUTexture2D;
    }
    if (depth) {
      this.depthTexture = depth as WebGPUTexture2D;
    }
    // TODO: depth & stencil
  }

  public get() {
    return {
      color: this.colorTexture?.get(),
      depth: this.depthTexture?.get(),
    };
  }

  public destroy() {
    this.colorTexture?.destroy();
    this.depthTexture?.destroy();
  }

  public resize({ width, height }: { width: number; height: number }) {
    if (width !== this.width || height !== this.height) {
      this.colorTexture?.resize({ width, height });
      this.depthTexture?.resize({ width, height });
    }
    this.width = width;
    this.height = height;
  }
}
