// @ts-nocheck
import { GLSLContext } from '@antv/g-webgpu-compiler';
import { IRenderEngine, IWebGPUEngineOptions } from '@antv/g-webgpu-core';
import { injectable } from 'inversify';
import { flatten, isFinite, isTypedArray } from 'lodash';
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
    context: GLSLContext,
  ): Promise<Pick<GPUComputePipelineDescriptor, 'computeStage'>> {
    const paddingDataTextureSize = context.threadNum * 4;
    const uniforms = {};

    let inputTextureName;
    let inputTextureSize;
    let inputTextureData;
    let inputTextureTypedArrayConstructor;
    context.uniforms.forEach(({ name, type, data }) => {
      // 使用纹理存储
      if (type === 'sampler2D') {
        if (!inputTextureName) {
          inputTextureName = name;
          inputTextureSize = data.length;
          inputTextureData = data;
          if (isTypedArray(data)) {
            inputTextureTypedArrayConstructor = data.constructor;
          }
        }
        if (data.length < paddingDataTextureSize) {
          data.push(...new Array(paddingDataTextureSize - data.length).fill(0));
        } else {
          context.threadNum = Math.ceil(data.length / 4);
        }
        uniforms[name] = this.gl.texture({
          width: context.threadNum,
          height: 1,
          data,
        });
      } else {
        if (
          data &&
          (Array.isArray(data) || isTypedArray(data)) &&
          data.length > 16
        ) {
          // 最多支持到 mat4 包含 16 个元素
          throw new Error(`invalid data type ${type}`);
        }
        uniforms[name] = data;
      }
    });

    uniforms.u_TexSize = context.threadNum;

    // 大于一次认为需要 pingpong
    if (context.maxIteration > 1) {
      context.texInput = uniforms[inputTextureName];
      uniforms[inputTextureName] = () => context.texInput;
      context.texOutput = this.gl.texture({
        width: context.threadNum,
        height: 1,
        data: inputTextureData,
      });
    } else {
      context.texOutput = this.gl.texture({
        width: context.threadNum,
        height: 1,
      });
    }
    context.output = {
      length: inputTextureSize,
      typedArrayConstructor: inputTextureTypedArrayConstructor,
    };

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
      frag: computeCode,
      uniforms,
      vert: quadVert,
      // TODO: use a fullscreen triangle instead.
      primitive: 'triangle strip',
      count: 4,
    };

    context.computeCommand = this.gl(drawParams);

    return {
      computeStage: {
        module: {
          label: 'compute',
        },
        entryPoint: 'main',
      },
    };
  }

  public dispatch(context: GLSLContext) {
    context.texFBO = this.gl.framebuffer({
      color: context.texOutput,
    });
    context.texFBO.use(() => {
      context.computeCommand();
    });

    // 需要 swap
    if (context.maxIteration > 1) {
      const tmp = context.texOutput;
      context.texOutput = context.texInput;
      context.texInput = tmp;
    }
  }

  public async readData(context: GLSLContext) {
    let pixels;
    this.gl({
      framebuffer: context.texFBO,
    })(() => {
      pixels = this.gl.read();
    });
    const {
      output: { length, typedArrayConstructor = Float32Array },
    } = context;

    return new typedArrayConstructor(pixels.slice(0, length));
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
    // this.dataTextures.forEach((d) => d.destroy());
  }
}
