// @ts-nocheck
import { IRenderEngine, IWebGPUEngineOptions } from '@antv/g-webgpu-core';
import { injectable } from 'inversify';
import regl from 'regl';
import quadVert from './shaders/quad.vert.glsl';

/**
 * implements with regl
 * @see https://github.com/regl-project/regl/blob/gh-pages/API.md
 */
@injectable()
export class WebGLEngine implements IRenderEngine {
  public supportWebGPU = false;
  private canvas: HTMLCanvasElement;
  private options: IWebGPUEngineOptions;
  private gl: regl.Regl;

  private computeCommand: regl.DrawCommand;
  private texInput: regl.Texture2D;
  private texOutput: regl.Texture2D;

  public async init(
    canvas: HTMLCanvasElement,
    options: IWebGPUEngineOptions = {},
  ) {
    this.canvas = canvas;
    this.options = options;

    this.gl = await new Promise((resolve, reject) => {
      regl({
        container: this.canvas,
        attributes: {
          alpha: true,
          // use TAA instead of MSAA
          // @see https://www.khronos.org/registry/webgl/specs/1.0/#5.2.1
          antialias: options.antialiasing,
          premultipliedAlpha: true,
        },
        // TODO: use extensions
        extensions: [
          'OES_element_index_uint',
          // 'EXT_shader_texture_lod', // IBL
          'OES_standard_derivatives', // wireframe
          'OES_texture_float', // TODO: must be enabled during computing
          'WEBGL_depth_texture',
          'angle_instanced_arrays',
          'EXT_texture_filter_anisotropic', // VSM shadow map
        ],
        optionalExtensions: ['oes_texture_float_linear'],
        profile: true,
        onDone: (err: Error | null, r?: regl.Regl | undefined): void => {
          if (err || !r) {
            reject(err);
          }
          resolve(r);
        },
      });
    });
  }

  public async compileComputePipelineStageDescriptor(
    computeCode: string,
    defines: string | null,
    data?: ArrayBufferView,
  ): Promise<Pick<GPUComputePipelineDescriptor, 'computeStage'>> {
    this.texInput = this.gl.texture({
      width: 960,
      height: 1,
      data,
    });
    this.texOutput = this.gl.texture({
      width: 960,
      height: 1,
      data,
    });

    const drawParams: regl.DrawConfig = {
      attributes: {
        a_Position: [
          [-1, 1, 0],
          [-1, -1, 0],
          [1, 1, 0],
          [1, -1, 0],
        ],
        a_TexCoord: [
          [0, 1],
          [0, 0],
          [1, 1],
          [1, 0],
        ],
      },
      frag: (defines ? defines + '\n' : '') + computeCode,
      uniforms: {
        u_Data: () => this.texInput,
        u_TexSize: 960,
        u_K: 0.8504989743232727,
        u_K2: 0.002411161782220006,
        u_MaxEdgePerVetex: 50,
        u_Gravity: 50,
        u_Speed: 0.1,
        u_MaxDisplace: 21.799999237060547,
      },
      vert: quadVert,
      // TODO: use a fullscreen triangle instead.
      primitive: 'triangle strip',
      count: 4,
    };

    this.computeCommand = this.gl(drawParams);

    return {
      computeStage: {
        module: {
          label: 'compute',
        },
        entryPoint: 'main',
      },
    };
  }

  public dispatch(numX: number) {
    this.texFBO = this.gl.framebuffer({
      color: this.texOutput,
    });
    this.texFBO.use(() => {
      this.computeCommand();
    });

    const tmp = this.texOutput;
    this.texOutput = this.texInput;
    this.texInput = tmp;
  }

  public async readData(
    srcBuffer: GPUBuffer,
    byteCount: number,
    arrayClazz: TypedArrayConstructor,
  ) {
    let pixels;
    this.gl({
      framebuffer: this.texFBO,
    })(() => {
      pixels = this.gl.read();
    });
    return new arrayClazz(pixels);
  }

  public setComputePipeline(
    computePipelineName: string,
    descriptor: GPUComputePipelineDescriptor,
  ) {
    //
  }

  public setComputeBindGroups(bindGroups: GPUBindGroup[]) {
    //
  }

  public clear(
    color: GPUColor,
    backBuffer: boolean,
    depth: boolean,
    stencil: boolean = false,
  ) {
    if (!Array.isArray(color)) {
      color = [color.r, color.g, color.b, color.a];
    }
    this.gl.clear({
      color,
    });
    // TODO: depth & stencil
  }

  public beginFrame() {
    //
  }

  public endFrame() {
    //
  }

  /**
   * Dispose and release all associated resources
   */
  public dispose() {
    //
  }
}
