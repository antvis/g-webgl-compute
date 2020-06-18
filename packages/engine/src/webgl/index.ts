import { GLSLContext } from '@antv/g-webgpu-compiler';
import { IRenderEngine, IWebGPUEngineOptions } from '@antv/g-webgpu-core';
import { injectable } from 'inversify';
import isTypedArray from 'lodash/isTypedArray';
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
  private contextCache: {
    [contextName: string]: {
      texOutput: regl.Texture2D;
      texInput?: regl.Texture2D;
      texFBO: regl.Framebuffer2D;
      computeCommand: regl.DrawCommand;
      textureCache: {
        [textureName: string]: regl.Texture2D;
      };
    };
  } = {};

  public startRecordBundle(): void {
    throw new Error('Method not implemented.');
  }
  public stopRecordBundle(): GPURenderBundle {
    throw new Error('Method not implemented.');
  }
  public executeBundles(bundles: GPURenderBundle[]): void {
    throw new Error('Method not implemented.');
  }
  public enableScissor(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    throw new Error('Method not implemented.');
  }
  public disableScissor(): void {
    throw new Error('Method not implemented.');
  }
  public compileRawPipelineStageDescriptor(
    vertexCode: string,
    fragmentCode: string,
  ): Promise<
    Pick<GPURenderPipelineDescriptor, 'vertexStage' | 'fragmentStage'>
  > {
    throw new Error('Method not implemented.');
  }
  public compilePipelineStageDescriptor(
    vertexCode: string,
    fragmentCode: string,
    defines: string | null,
  ): Promise<
    Pick<GPURenderPipelineDescriptor, 'vertexStage' | 'fragmentStage'>
  > {
    throw new Error('Method not implemented.');
  }
  public drawElementsType(
    pipelineName: string,
    descriptor: Pick<
      Pick<
        GPURenderPipelineDescriptor,
        | 'vertexStage'
        | 'fragmentStage'
        | 'primitiveTopology'
        | 'rasterizationState'
        | 'depthStencilState'
        | 'colorStates'
        | 'vertexState'
        | 'layout'
      >,
      'vertexStage' | 'layout'
    > &
      Partial<
        Pick<
          Pick<
            GPURenderPipelineDescriptor,
            | 'vertexStage'
            | 'fragmentStage'
            | 'primitiveTopology'
            | 'rasterizationState'
            | 'depthStencilState'
            | 'colorStates'
            | 'vertexState'
            | 'layout'
          >,
          | 'fragmentStage'
          | 'primitiveTopology'
          | 'rasterizationState'
          | 'depthStencilState'
          | 'colorStates'
          | 'vertexState'
        >
      >,
    indexStart: number,
    indexCount: number,
    instancesCount?: number | undefined,
  ): void {
    throw new Error('Method not implemented.');
  }
  public drawArraysType(
    pipelineName: string,
    descriptor: Pick<
      Pick<
        GPURenderPipelineDescriptor,
        | 'vertexStage'
        | 'fragmentStage'
        | 'primitiveTopology'
        | 'rasterizationState'
        | 'depthStencilState'
        | 'colorStates'
        | 'vertexState'
        | 'layout'
      >,
      'vertexStage' | 'layout'
    > &
      Partial<
        Pick<
          Pick<
            GPURenderPipelineDescriptor,
            | 'vertexStage'
            | 'fragmentStage'
            | 'primitiveTopology'
            | 'rasterizationState'
            | 'depthStencilState'
            | 'colorStates'
            | 'vertexState'
            | 'layout'
          >,
          | 'fragmentStage'
          | 'primitiveTopology'
          | 'rasterizationState'
          | 'depthStencilState'
          | 'colorStates'
          | 'vertexState'
        >
      >,
    verticesStart: number,
    verticesCount: number,
    instancesCount?: number | undefined,
  ): void {
    throw new Error('Method not implemented.');
  }
  public createVertexBuffer(
    data: number[] | ArrayBuffer | ArrayBufferView,
    usage?: number | undefined,
  ): GPUBuffer {
    throw new Error('Method not implemented.');
  }
  public createUniformBuffer(
    data: number[] | ArrayBuffer | ArrayBufferView,
  ): GPUBuffer {
    throw new Error('Method not implemented.');
  }
  public createIndexBuffer(
    data: number[] | ArrayBuffer | ArrayBufferView,
  ): GPUBuffer {
    throw new Error('Method not implemented.');
  }
  public createTexture(
    [width, height]: [number, number],
    imageData: Uint8ClampedArray,
    usage: number,
  ): GPUTexture {
    throw new Error('Method not implemented.');
  }
  public createSampler(descriptor: GPUSamplerDescriptor): GPUSampler {
    throw new Error('Method not implemented.');
  }
  public setRenderBindGroups(bindGroups: GPUBindGroup[]): void {
    throw new Error('Method not implemented.');
  }
  public setSubData(
    destBuffer: GPUBuffer,
    destOffset: number,
    srcArrayBuffer: ArrayBufferView,
  ): void {
    throw new Error('Method not implemented.');
  }
  public bindVertexInputs(vertexInputs: {
    indexBuffer: GPUBuffer | null;
    indexOffset: number;
    vertexStartSlot: number;
    vertexBuffers: GPUBuffer[];
    vertexOffsets: number[];
  }): void {
    throw new Error('Method not implemented.');
  }
  public getDevice(): GPUDevice {
    throw new Error('Method not implemented.');
  }

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
          // 'OES_standard_derivatives', // wireframe
          'OES_texture_float', // must be enabled during computing
          'WEBGL_depth_texture',
          'angle_instanced_arrays',
          // 'EXT_texture_filter_anisotropic', // VSM shadow map
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

  public isFloatSupported() {
    // @see https://github.com/antvis/GWebGPUEngine/issues/26
    // @ts-ignore
    return this.gl.limits.readFloat;
  }

  public async compileComputePipelineStageDescriptor(
    computeCode: string,
    context: GLSLContext,
  ): Promise<Pick<GPUComputePipelineDescriptor, 'computeStage'>> {
    let cache = this.contextCache[context.name];
    if (!cache) {
      // @ts-ignore
      cache = {
        textureCache: {},
      };
    }
    const uniforms = {};

    let outputTextureName = '';
    let outputTextureData;
    let outputTextureSize;
    let outputTextureTypedArrayConstructor;
    let outputDataLength;
    let outputTexelCount;
    let outputElementsPerTexel;
    context.uniforms.forEach((uniform) => {
      const { name, type, data, format } = uniform;
      // 使用纹理存储
      if (type === 'sampler2D') {
        let elementsPerTexel = 1;
        if (format.endsWith('ec4[]')) {
          elementsPerTexel = 4;
        } else if (format.endsWith('ec3[]')) {
          elementsPerTexel = 3;
        } else if (format.endsWith('ec2[]')) {
          elementsPerTexel = 2;
        }

        // 用 0 补全不足 vec4 的部分
        const paddingData: number[] = [];
        for (let i = 0; i < (data as number[]).length; i += elementsPerTexel) {
          if (elementsPerTexel === 1) {
            paddingData.push((data as number[])[i], 0, 0, 0);
          } else if (elementsPerTexel === 2) {
            paddingData.push(
              (data as number[])[i],
              (data as number[])[i + 1],
              0,
              0,
            );
          } else if (elementsPerTexel === 3) {
            paddingData.push(
              (data as number[])[i],
              (data as number[])[i + 1],
              (data as number[])[i + 2],
              0,
            );
          } else if (elementsPerTexel === 4) {
            paddingData.push(
              (data as number[])[i],
              (data as number[])[i + 1],
              (data as number[])[i + 2],
              (data as number[])[i + 3],
            );
          }
        }

        const originalDataLength = (data as ArrayLike<number>).length;
        const texelCount = Math.ceil(originalDataLength / elementsPerTexel);
        const width = Math.ceil(Math.sqrt(texelCount));
        const paddingTexelCount = width * width;
        if (texelCount < paddingTexelCount) {
          paddingData.push(
            ...new Array((paddingTexelCount - texelCount) * 4).fill(0),
          );
        }

        if (name === context.output.name) {
          outputTextureName = name;
          outputTextureData = paddingData;
          outputDataLength = originalDataLength;
          outputTextureSize = width;
          outputTexelCount = texelCount;
          outputElementsPerTexel = elementsPerTexel;
          if (isTypedArray(data)) {
            outputTextureTypedArrayConstructor = data!.constructor;
          }
        }

        const uniformTexture = this.gl.texture({
          width,
          height: width,
          data: paddingData,
          type: 'float',
        });
        cache.textureCache[name] = uniformTexture;
        // 需要动态获取，有可能在运行时通过 setBinding 关联到另一个计算程序的输出
        // @ts-ignore
        uniforms[name] =
          context.maxIteration > 1 && context.needPingpong
            ? cache.textureCache[name]
            : () => cache.textureCache[name];
        // @ts-ignore
        uniforms[`${name}Size`] = [width, width];
      } else {
        if (
          data &&
          (Array.isArray(data) || isTypedArray(data)) &&
          (data as ArrayLike<number>).length > 16
        ) {
          // 最多支持到 mat4 包含 16 个元素
          throw new Error(`invalid data type ${type}`);
        }
        // @ts-ignore
        uniforms[name] = () => uniform.data;
      }
    });

    // 传入 output 纹理尺寸和数据长度，便于多余的 texel 提前退出
    // @ts-ignore
    uniforms.u_OutputTextureSize = [outputTextureSize, outputTextureSize];
    // @ts-ignore
    uniforms.u_OutputTexelCount = outputTexelCount;

    // 大于一次且 输入输出均为自身的 认为需要 pingpong
    if (context.maxIteration > 1 && context.needPingpong) {
      // @ts-ignore
      cache.texInput = uniforms[outputTextureName];
      // @ts-ignore
      uniforms[outputTextureName] = () => cache.texInput;
      cache.texOutput = this.gl.texture({
        width: outputTextureSize,
        height: outputTextureSize,
        data: outputTextureData,
        type: 'float',
      });
    } else {
      cache.texOutput = this.gl.texture({
        width: outputTextureSize,
        height: outputTextureSize,
        type: 'float',
      });
    }

    context.output.typedArrayConstructor = outputTextureTypedArrayConstructor;
    context.output.length = outputDataLength;
    context.output.outputElementsPerTexel = outputElementsPerTexel;

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

    cache.computeCommand = this.gl(drawParams);
    this.contextCache[context.name] = cache;

    return {
      computeStage: {
        // @ts-ignore
        module: {
          label: 'compute',
        },
        entryPoint: 'main',
      },
    };
  }

  public confirmInput(
    contextName: string,
    textureName: string,
    referContextName: string,
  ) {
    const cache = this.contextCache[contextName];
    const referCache = this.contextCache[referContextName];
    if (cache && referCache) {
      // 需要 pingpong 的都有 texInput
      cache.textureCache[textureName] =
        referCache.texInput || referCache.texOutput;
    }
  }

  public dispatch(context: GLSLContext) {
    const cache = this.contextCache[context.name];
    if (cache) {
      cache.texFBO = this.gl.framebuffer({
        color: cache.texOutput,
      });
      cache.texFBO.use(() => {
        cache.computeCommand();
      });

      // 需要 swap
      if (context.maxIteration > 1 && context.needPingpong) {
        const tmp = cache.texOutput;
        cache.texOutput = cache.texInput!;
        cache.texInput = tmp;
      }
    }
  }

  public async readData(context: GLSLContext) {
    const cache = this.contextCache[context.name];
    if (cache) {
      let pixels: Uint8Array | Float32Array;
      this.gl({
        framebuffer: cache.texFBO,
      })(() => {
        pixels = this.gl.read();
      });

      // @ts-ignore
      if (pixels) {
        const {
          output: {
            length,
            outputElementsPerTexel,
            typedArrayConstructor = Float32Array,
          },
        } = context;

        let formattedPixels = [];
        if (outputElementsPerTexel !== 4) {
          for (let i = 0; i < pixels.length; i += 4) {
            if (outputElementsPerTexel === 1) {
              formattedPixels.push(pixels[i]);
            } else if (outputElementsPerTexel === 2) {
              formattedPixels.push(pixels[i], pixels[i + 1]);
            } else {
              formattedPixels.push(pixels[i], pixels[i + 1], pixels[i + 2]);
            }
          }
        } else {
          // @ts-ignore
          formattedPixels = pixels;
        }

        // 截取多余的部分
        return new typedArrayConstructor(formattedPixels.slice(0, length));
      }
    }

    return new Float32Array();
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
