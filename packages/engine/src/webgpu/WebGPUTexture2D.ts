import {
  gl,
  ITexture2D,
  ITexture2DInitializationOptions,
} from '@antv/g-webgpu-core';
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { WebGPUEngine } from '.';
import { filterMap, formatMap, wrapModeMap } from './constants';

/**
 * adaptor for regl.Buffer
 * @see https://github.com/regl-project/regl/blob/gh-pages/API.md#buffers
 */
export default class WebGPUTexture2D implements ITexture2D {
  private texture: GPUTexture;
  private sampler: GPUSampler;
  private width: number;
  private height: number;

  constructor(
    private engine: WebGPUEngine,
    private options: ITexture2DInitializationOptions,
  ) {
    this.createTexture();
  }

  public get() {
    return {
      texture: this.texture,
      sampler: this.sampler,
    };
  }
  public update() {
    // TODO
  }

  public resize({ width, height }: { width: number; height: number }): void {
    // TODO: it seems that Texture doesn't support `resize`
    if (width !== this.width || height !== this.height) {
      this.destroy();
      this.createTexture();
    }
    this.width = width;
    this.height = height;
  }

  public destroy() {
    if (this.texture) {
      this.texture.destroy();
    }
  }

  private createTexture() {
    const {
      data,
      type = gl.UNSIGNED_BYTE,
      width,
      height,
      flipY = false,
      format = gl.RGBA,
      mipmap = false,
      wrapS = gl.CLAMP_TO_EDGE,
      wrapT = gl.CLAMP_TO_EDGE,
      aniso = 0,
      alignment = 1,
      premultiplyAlpha = false,
      mag = gl.NEAREST,
      min = gl.NEAREST,
      colorSpace = gl.BROWSER_DEFAULT_WEBGL,
      usage,
    } = this.options;
    this.width = width;
    this.height = height;

    this.texture = this.engine.device.createTexture({
      size: [width, height, 1],
      // TODO: arrayLayerCount is deprecated: use size.depth
      // arrayLayerCount: 1,
      mipLevelCount: 1, // TODO: https://gpuweb.github.io/gpuweb/#dom-gputextureviewdescriptor-miplevelcount
      sampleCount: 1,
      dimension: WebGPUConstants.TextureDimension.E2d,
      format: formatMap[format],
      // could throw texture binding usage mismatch
      usage:
        usage ||
        WebGPUConstants.TextureUsage.Sampled |
          WebGPUConstants.TextureUsage.CopyDst,
    });

    if (!usage || usage & WebGPUConstants.TextureUsage.Sampled) {
      this.sampler = this.engine.device.createSampler({
        addressModeU: wrapModeMap[wrapS],
        addressModeV: wrapModeMap[wrapT],
        addressModeW: wrapModeMap[wrapS], // TODO: same as addressModeU
        magFilter: filterMap[mag],
        minFilter: filterMap[min],
        maxAnisotropy: aniso, // @see https://gpuweb.github.io/gpuweb/#dom-gpusamplerdescriptor-maxanisotropy
      });
    }
  }
}
