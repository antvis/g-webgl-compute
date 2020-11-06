import {
  gl,
  IModel,
  IModelDrawOptions,
  IModelInitializationOptions,
  isSafari,
  IUniform,
} from '@antv/g-webgpu-core';
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import isNil from 'lodash/isNil';
import { WebGPUEngine } from '.';
import { extractUniforms } from '../utils/uniform';
import {
  getColorStateDescriptors,
  getCullMode,
  getDepthStencilStateDescriptor,
  primitiveMap,
} from './constants';
import WebGPUAttribute from './WebGPUAttribute';
import WebGPUBuffer from './WebGPUBuffer';
import WebGPUElements from './WebGPUElements';
import WebGPUFramebuffer from './WebGPUFramebuffer';
import WebGPUTexture2D from './WebGPUTexture2D';

// @ts-ignore
function concatenate(resultConstructor, ...arrays) {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new resultConstructor(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export default class WebGPUModel implements IModel {
  private pipelineLayout: GPUPipelineLayout;
  private renderPipeline: GPURenderPipeline;
  private uniformsBindGroupLayout: GPUBindGroupLayout;
  private uniformBindGroup: GPUBindGroup;
  private uniformBuffer: WebGPUBuffer;

  private uniforms: {
    [key: string]: IUniform;
  } = {};

  /**
   * 用于后续渲染时动态更新
   */
  private uniformGPUBufferLayout: Array<{
    name: string;
    offset: number;
  }> = [];

  /**
   * vertex
   */
  private attributeCache: {
    [attributeName: string]: WebGPUAttribute;
  } = {};

  /**
   * indices's buffer
   */
  private indexBuffer: WebGPUBuffer;
  private indexCount: number;

  constructor(
    private engine: WebGPUEngine,
    private options: IModelInitializationOptions,
  ) {}

  public async init() {
    const {
      vs,
      fs,
      attributes,
      uniforms,
      primitive,
      count,
      elements,
      depth,
      blend,
      stencil,
      cull,
      instances,
    } = this.options;

    // build shaders first
    const {
      vertexStage,
      fragmentStage,
    } = await this.compilePipelineStageDescriptor(vs, fs, null);

    if (uniforms) {
      // create uniform bind groups & layout
      this.buildUniformBindGroup(uniforms);
    }

    if (elements) {
      this.indexBuffer = (elements as WebGPUElements).get() as WebGPUBuffer;
      this.indexCount = (elements as WebGPUElements).indexCount;
    }

    // TODO: instanced array

    const vertexState = {
      vertexBuffers: Object.keys(attributes).map((attributeName, i) => {
        const attribute = attributes[attributeName] as WebGPUAttribute;
        const { arrayStride, stepMode, attributes: ats } = attribute.get();
        this.attributeCache[attributeName] = attribute;
        return {
          arrayStride,
          stepMode,
          attributes: ats,
        };
      }),
    };

    const descriptor = {
      sampleCount: this.engine.mainPassSampleCount,
      primitiveTopology: primitiveMap[primitive || gl.TRIANGLES],
      rasterizationState: {
        ...this.getDefaultRasterizationStateDescriptor(),
        // TODO: support frontface
        cullMode: getCullMode({ cull }),
      },
      depthStencilState: getDepthStencilStateDescriptor({
        depth,
        stencil,
      }),
      colorStates: getColorStateDescriptors(
        { blend },
        this.engine.options.swapChainFormat!,
      ),
      layout: this.pipelineLayout,
      vertexStage,
      fragmentStage,
      vertexState,
    };

    // create pipeline
    this.renderPipeline = this.engine.device.createRenderPipeline(descriptor);
  }

  public addUniforms(uniforms: { [key: string]: IUniform }): void {
    this.uniforms = {
      ...this.uniforms,
      ...extractUniforms(uniforms),
    };
  }

  public draw(options: IModelDrawOptions): void {
    const renderPass = this.engine.getCurrentRenderPass();

    const uniforms: {
      [key: string]: IUniform;
    } = {
      ...this.uniforms,
      ...extractUniforms(options.uniforms || {}),
    };

    const bindGroupBindings: GPUBindGroupEntry[] = [];

    // TODO: uniform 发生修改
    Object.keys(uniforms).forEach((uniformName: string) => {
      const type = typeof uniforms[uniformName];
      if (
        type === 'boolean' ||
        type === 'number' ||
        Array.isArray(uniforms[uniformName]) ||
        // @ts-ignore
        uniforms[uniformName].BYTES_PER_ELEMENT
      ) {
        const offset = this.uniformGPUBufferLayout.find(
          ({ name }) => name === uniformName,
        )?.offset;
        if (!isNil(offset)) {
          this.uniformBuffer.subData({
            data: uniforms[uniformName],
            offset,
          });
        }
      } else {
        let offset = this.uniformGPUBufferLayout.find(
          ({ name }) => name === uniformName,
        )?.offset;
        if (!isNil(offset)) {
          const textureOrFramebuffer = (uniforms[uniformName] as
            | WebGPUTexture2D
            | WebGPUFramebuffer).get();
          const { texture, sampler } =
            textureOrFramebuffer.color || textureOrFramebuffer;
          if (sampler) {
            bindGroupBindings.push({
              binding: offset,
              resource: sampler,
            });
            offset++;
          }
          bindGroupBindings.push({
            binding: offset,
            resource: texture.createView(),
          });
        }
      }
    });

    if (this.uniformBuffer) {
      bindGroupBindings[0] = {
        binding: 0,
        resource: {
          buffer: this.uniformBuffer.get(), // 返回 GPUBuffer 原生对象
        },
      };
    }

    this.uniformBindGroup = this.engine.device.createBindGroup({
      layout: this.uniformsBindGroupLayout,
      entries: bindGroupBindings,
    });

    if (this.renderPipeline) {
      renderPass.setPipeline(this.renderPipeline);
    }

    renderPass.setBindGroup(0, this.uniformBindGroup);

    if (this.indexBuffer) {
      renderPass.setIndexBuffer(
        this.indexBuffer.get(),
        WebGPUConstants.IndexFormat.Uint32,
        0,
      );
    }

    Object.keys(this.attributeCache).forEach((attributeName: string, i) => {
      renderPass.setVertexBuffer(
        0 + i,
        this.attributeCache[attributeName].get().buffer,
        0,
      );
    });

    // renderPass.draw(verticesCount, instancesCount, verticesStart, 0);
    if (this.indexBuffer) {
      renderPass.drawIndexed(
        this.indexCount,
        this.options.instances || 1,
        0,
        0,
        0,
      );
    } else {
      renderPass.draw(
        this.options.count || 0,
        this.options.instances || 0,
        0,
        0,
      );
    }
  }

  public destroy(): void {
    throw new Error('Method not implemented.');
  }

  private async compilePipelineStageDescriptor(
    vertexCode: string,
    fragmentCode: string,
    defines: string | null,
  ): Promise<
    Pick<GPURenderPipelineDescriptor, 'vertexStage' | 'fragmentStage'>
  > {
    const shaderVersion = '#version 450\n';

    let vertexShader: Uint32Array | string = vertexCode;
    let fragmentShader: Uint32Array | string = fragmentCode;
    if (!this.engine.options.useWGSL) {
      vertexShader = await this.compileShaderToSpirV(
        vertexCode,
        'vertex',
        shaderVersion,
      );
      fragmentShader = await this.compileShaderToSpirV(
        fragmentCode,
        'fragment',
        shaderVersion,
      );
    }

    return this.createPipelineStageDescriptor(vertexShader, fragmentShader);
  }

  private compileShaderToSpirV(
    source: string,
    type: string,
    shaderVersion: string,
  ): Promise<Uint32Array> {
    return this.compileRawShaderToSpirV(shaderVersion + source, type);
  }

  private compileRawShaderToSpirV(
    source: string,
    type: string,
  ): Promise<Uint32Array> {
    return this.engine.glslang.compileGLSL(source, type);
  }

  private createPipelineStageDescriptor(
    vertexShader: Uint32Array | string,
    fragmentShader: Uint32Array | string,
  ): Pick<GPURenderPipelineDescriptor, 'vertexStage' | 'fragmentStage'> {
    return {
      vertexStage: {
        module: this.engine.device.createShaderModule({
          code: vertexShader,
          // @ts-ignore
          isWHLSL: isSafari,
        }),
        entryPoint: 'main',
      },
      fragmentStage: {
        module: this.engine.device.createShaderModule({
          code: fragmentShader,
          // @ts-ignore
          isWHLSL: isSafari,
        }),
        entryPoint: 'main',
      },
    };
  }

  /**
   * @see https://gpuweb.github.io/gpuweb/#rasterization-state
   */
  private getDefaultRasterizationStateDescriptor(): GPURasterizationStateDescriptor {
    return {
      frontFace: WebGPUConstants.FrontFace.CCW,
      cullMode: WebGPUConstants.CullMode.None,
      depthBias: 0,
      depthBiasSlopeScale: 0,
      depthBiasClamp: 0,
    };
  }

  private buildUniformBindGroup(uniforms: { [key: string]: IUniform }) {
    let offset = 0;
    // FIXME: 所有 uniform 合并成一个 buffer，固定使用 Float32Array 存储，确实会造成一些内存的浪费
    const mergedUniformData = concatenate(
      Float32Array,
      ...Object.keys(uniforms).map((uniformName) => {
        if (uniforms[uniformName]) {
          this.uniformGPUBufferLayout.push({
            name: uniformName,
            offset,
          });
          // @ts-ignore
          offset += (uniforms[uniformName].length || 1) * 4;
          return uniforms[uniformName];
        } else {
          // texture & framebuffer
          return [];
        }
      }),
    );

    const entries: GPUBindGroupLayoutEntry[] = [];
    let hasUniform = false;
    if (mergedUniformData.length) {
      hasUniform = true;
      // TODO: 所有 uniform 绑定到 slot 0，通过解析 Shader 代码判定可见性
      entries.push({
        // TODO: 暂时都绑定到 slot 0
        binding: 0,
        visibility:
          WebGPUConstants.ShaderStage.Fragment |
          WebGPUConstants.ShaderStage.Vertex, // TODO: 暂时 VS 和 FS 都可见
        type: WebGPUConstants.BindingType.UniformBuffer,
      });
    }

    // 声明 texture & sampler
    Object.keys(uniforms)
      .filter((uniformName) => uniforms[uniformName] === null)
      .forEach((uniformName, i) => {
        this.uniformGPUBufferLayout.push({
          name: uniformName,
          offset: i * 2 + (hasUniform ? 1 : 0),
        });
        entries.push(
          {
            // Sampler
            binding: i * 2 + (hasUniform ? 1 : 0),
            visibility: WebGPUConstants.ShaderStage.Fragment,
            type: WebGPUConstants.BindingType.Sampler,
          },
          {
            // Texture view
            binding: i * 2 + (hasUniform ? 1 : 0) + 1,
            visibility: WebGPUConstants.ShaderStage.Fragment,
            type: WebGPUConstants.BindingType.SampledTexture,
          },
        );
      });

    this.uniformsBindGroupLayout = this.engine.device.createBindGroupLayout({
      // 最新 API 0.0.22 版本使用 entries。Chrome Canary 84.0.4110.0 已实现。
      // 使用 bindings 会报 Warning: GPUBindGroupLayoutDescriptor.bindings is deprecated: renamed to entries
      // @see https://github.com/antvis/GWebGPUEngine/issues/5
      entries,
    });

    this.pipelineLayout = this.engine.device.createPipelineLayout({
      bindGroupLayouts: [this.uniformsBindGroupLayout],
    });

    if (hasUniform) {
      this.uniformBuffer = new WebGPUBuffer(this.engine, {
        // TODO: 处理 Struct 和 boolean
        // @ts-ignore
        data:
          mergedUniformData instanceof Array
            ? // @ts-ignore
              new Float32Array(mergedUniformData)
            : mergedUniformData,
        usage:
          WebGPUConstants.BufferUsage.Uniform |
          WebGPUConstants.BufferUsage.CopyDst,
      });
    }
  }
}
