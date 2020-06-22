/**
 * @see https://github.com/BabylonJS/Babylon.js/blob/WebGPU/src/Engines/webgpuEngine.ts
 * 主要修改
 * * 使用最新 GPUBuffer API
 * * ComputePipeline
 */
import { GLSLContext } from '@antv/g-webgpu-compiler';
import {
  IRenderEngine,
  isSafari,
  IWebGPUEngineOptions,
} from '@antv/g-webgpu-core';
// tslint:disable-next-line:no-submodule-imports
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { injectable } from 'inversify';
import glslang from './glslang';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Uint8ClampedArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

@injectable()
export class WebGPUEngine implements IRenderEngine {
  public supportWebGPU = true;
  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext;
  private glslang: any;
  private adapter: GPUAdapter;
  private device: GPUDevice;
  private swapChain: GPUSwapChain;
  /**
   * 通过名称访问
   */
  private pipelines: {
    [pipelineName: string]: GPURenderPipeline;
  } = {};
  private computePipelines: {
    [pipelineName: string]: GPUComputePipeline;
  } = {};
  private mainPassSampleCount: number;

  private mainTexture: GPUTexture;
  private depthTexture: GPUTexture;
  private mainColorAttachments: GPURenderPassColorAttachmentDescriptor[];
  private mainTextureExtends: GPUExtent3D;
  private mainDepthAttachment: GPURenderPassDepthStencilAttachmentDescriptor;

  // Frame Life Cycle (recreated each frame)
  private uploadEncoder: GPUCommandEncoder;
  private renderEncoder: GPUCommandEncoder;
  private computeEncoder: GPUCommandEncoder;
  private commandBuffers: GPUCommandBuffer[] = new Array(3).fill(undefined);

  // Frame Buffer Life Cycle (recreated for each render target pass)
  private currentRenderPass: GPURenderPassEncoder | null = null;
  private currentComputePass: GPUComputePassEncoder | null = null;
  private bundleEncoder: GPURenderBundleEncoder | null;
  private tempBuffers: GPUBuffer[] = [];

  private options: IWebGPUEngineOptions;

  private readonly defaultSampleCount = 4;
  private readonly clearDepthValue = 1;
  private readonly clearStencilValue = 0;
  private readonly uploadEncoderDescriptor = { label: 'upload' };
  private readonly renderEncoderDescriptor = { label: 'render' };
  private readonly computeEncoderDescriptor = { label: 'compute' };

  public isFloatSupported() {
    return true;
  }

  public getDevice() {
    return this.device;
  }

  public getSwapChain() {
    return this.swapChain;
  }

  public async init(
    canvas: HTMLCanvasElement,
    options: IWebGPUEngineOptions = {},
  ) {
    this.canvas = canvas;
    this.options = options;
    this.mainPassSampleCount = options.antialiasing
      ? this.defaultSampleCount
      : 1;

    await this.initGlslang();
    this.initContextAndSwapChain();
    this.initMainAttachments();
  }

  public beginFrame() {
    this.uploadEncoder = this.device.createCommandEncoder(
      this.uploadEncoderDescriptor,
    );
    this.renderEncoder = this.device.createCommandEncoder(
      this.renderEncoderDescriptor,
    );
    this.computeEncoder = this.device.createCommandEncoder(
      this.computeEncoderDescriptor,
    );
  }

  public endFrame() {
    // this.endRenderPass();

    if (this.options.supportCompute) {
      this.endComputePass();
    } else {
      this.endRenderPass();
    }

    this.commandBuffers[0] = this.uploadEncoder.finish();
    this.commandBuffers[1] = this.renderEncoder.finish();
    this.commandBuffers[2] = this.computeEncoder.finish();

    if (isSafari) {
      // @ts-ignore
      this.device.getQueue().submit(this.commandBuffers);
    } else {
      this.device.defaultQueue.submit(this.commandBuffers);
    }

    this.tempBuffers.forEach((buffer) => buffer.destroy());
    this.tempBuffers = [];
  }

  /**
   * Start recording all the gpu calls into a bundle.
   * @see https://zhuanlan.zhihu.com/p/99993704
   */
  public startRecordBundle() {
    this.bundleEncoder = this.device.createRenderBundleEncoder({
      colorFormats: [WebGPUConstants.TextureFormat.BGRA8Unorm],
      depthStencilFormat: WebGPUConstants.TextureFormat.Depth24PlusStencil8,
      sampleCount: this.mainPassSampleCount,
    });
  }

  /**
   * Stops recording the bundle.
   * @returns the recorded bundle
   */
  public stopRecordBundle(): GPURenderBundle {
    const bundle = this.bundleEncoder!.finish();
    this.bundleEncoder = null;
    return bundle;
  }

  /**
   * Execute the previously recorded bundle.
   * @param bundles defines the bundle to replay
   */
  public executeBundles(bundles: GPURenderBundle[]) {
    if (!this.currentRenderPass) {
      this.startMainRenderPass();
    }

    this.currentRenderPass?.executeBundles(bundles);
  }

  public enableScissor(x: number, y: number, width: number, height: number) {
    if (!this.currentRenderPass) {
      this.startMainRenderPass();
    }

    this.currentRenderPass!.setScissorRect(x, y, width, height);
  }

  public disableScissor() {
    if (!this.currentRenderPass) {
      this.startMainRenderPass();
    }

    this.currentRenderPass?.setScissorRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
  }

  public setSize(width: number, height: number) {
    this.initMainAttachments();
  }

  public clear(
    color: GPUColor,
    backBuffer: boolean,
    depth: boolean,
    stencil: boolean = false,
  ) {
    this.mainColorAttachments[0].loadValue = backBuffer
      ? color
      : WebGPUConstants.LoadOp.Load;

    this.mainDepthAttachment.depthLoadValue = depth
      ? this.clearDepthValue
      : WebGPUConstants.LoadOp.Load;
    this.mainDepthAttachment.stencilLoadValue = stencil
      ? this.clearStencilValue
      : WebGPUConstants.LoadOp.Load;

    // this.startMainRenderPass();

    if (this.options.supportCompute) {
      this.startComputePass();
    } else {
      this.startMainRenderPass();
    }
  }

  /**
   * Dispose and release all associated resources
   */
  public dispose() {
    if (this.mainTexture) {
      this.mainTexture.destroy();
    }
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }
  }

  public async compileRawPipelineStageDescriptor(
    vertexCode: string,
    fragmentCode: string,
  ): Promise<
    Pick<GPURenderPipelineDescriptor, 'vertexStage' | 'fragmentStage'>
  > {
    const vertexShader = await this.compileRawShaderToSpirV(
      vertexCode,
      'vertex',
    );
    const fragmentShader = await this.compileRawShaderToSpirV(
      fragmentCode,
      'fragment',
    );

    return this.createPipelineStageDescriptor(vertexShader, fragmentShader);
  }

  public async compilePipelineStageDescriptor(
    vertexCode: string,
    fragmentCode: string,
    defines: string | null,
  ): Promise<
    Pick<GPURenderPipelineDescriptor, 'vertexStage' | 'fragmentStage'>
  > {
    const shaderVersion = '#version 450\n';
    const vertexShader = await this.compileShaderToSpirV(
      vertexCode,
      'vertex',
      shaderVersion,
    );
    const fragmentShader = await this.compileShaderToSpirV(
      fragmentCode,
      'fragment',
      shaderVersion,
    );

    return this.createPipelineStageDescriptor(vertexShader, fragmentShader);
  }

  public async compileComputePipelineStageDescriptor(
    computeCode: string,
    context: GLSLContext,
  ): Promise<Pick<GPUComputePipelineDescriptor, 'computeStage'>> {
    let computeShader;
    if (isSafari) {
      computeShader = computeCode;
    } else {
      const shaderVersion = '#version 450\n';
      computeShader = await this.compileShaderToSpirV(
        computeCode,
        'compute',
        shaderVersion,
      );
    }

    return {
      computeStage: {
        module: this.device.createShaderModule({
          code: computeShader,
          // @ts-ignore
          isWHLSL: isSafari,
        }),
        entryPoint: 'main',
      },
    };
  }

  public drawElementsType(
    pipelineName: string,
    descriptor: WithOptional<
      Pick<
        GPURenderPipelineDescriptor,
        | 'primitiveTopology'
        | 'rasterizationState'
        | 'depthStencilState'
        | 'colorStates'
        | 'vertexStage'
        | 'fragmentStage'
        | 'vertexState'
        | 'layout'
      >,
      | 'primitiveTopology'
      | 'rasterizationState'
      | 'depthStencilState'
      | 'colorStates'
      | 'fragmentStage'
      | 'vertexState'
    >,
    indexStart: number,
    indexCount: number,
    instancesCount: number = 1,
  ) {
    const renderPass = this.bundleEncoder || this.currentRenderPass!;

    this.setRenderPipeline(pipelineName, descriptor);

    renderPass.drawIndexed(indexCount, instancesCount, indexStart, 0, 0);
  }

  public drawArraysType(
    pipelineName: string,
    descriptor: WithOptional<
      Pick<
        GPURenderPipelineDescriptor,
        | 'primitiveTopology'
        | 'rasterizationState'
        | 'depthStencilState'
        | 'colorStates'
        | 'vertexStage'
        | 'fragmentStage'
        | 'vertexState'
        | 'layout'
      >,
      | 'primitiveTopology'
      | 'rasterizationState'
      | 'depthStencilState'
      | 'colorStates'
      | 'fragmentStage'
      | 'vertexState'
    >,
    verticesStart: number,
    verticesCount: number,
    instancesCount: number = 1,
  ) {
    const renderPass = this.bundleEncoder || this.currentRenderPass!;

    // this.currentIndexBuffer = null;

    this.setRenderPipeline(pipelineName, descriptor);

    renderPass.draw(verticesCount, instancesCount, verticesStart, 0);
  }

  public createVertexBuffer(
    data: number[] | ArrayBuffer | ArrayBufferView,
    usage: number = 0,
  ): GPUBuffer {
    let view: ArrayBufferView;

    if (data instanceof Array) {
      view = new Float32Array(data);
    } else if (data instanceof ArrayBuffer) {
      view = new Uint8Array(data);
    } else {
      view = data;
    }

    let dataBuffer;
    if (isSafari) {
      dataBuffer = this.createBuffer(
        view,
        WebGPUConstants.BufferUsage.Vertex |
          WebGPUConstants.BufferUsage.CopyDst |
          WebGPUConstants.BufferUsage.MapRead |
          usage,
      );
    } else {
      // 如果添加了 MapRead，Chrome 会报错
      dataBuffer = this.createBuffer(
        view,
        WebGPUConstants.BufferUsage.Vertex |
          WebGPUConstants.BufferUsage.CopyDst |
          WebGPUConstants.BufferUsage.CopySrc |
          usage,
      );
    }

    return dataBuffer;
  }

  public createUniformBuffer(
    data: number[] | ArrayBuffer | ArrayBufferView,
  ): GPUBuffer {
    let view: ArrayBufferView;

    if (data instanceof Array) {
      view = new Float32Array(data);
    } else if (data instanceof ArrayBuffer) {
      view = new Uint8Array(data);
    } else {
      view = data;
    }

    const dataBuffer = this.createBuffer(
      view,
      WebGPUConstants.BufferUsage.Uniform | WebGPUConstants.BufferUsage.CopyDst,
    );
    return dataBuffer;
  }

  public createIndexBuffer(
    data: number[] | ArrayBuffer | ArrayBufferView,
  ): GPUBuffer {
    let view: ArrayBufferView;

    if (data instanceof Array) {
      view = new Uint16Array(data);
    } else if (data instanceof ArrayBuffer) {
      view = new Uint8Array(data);
    } else {
      view = data;
    }

    const dataBuffer = this.createBuffer(
      view,
      WebGPUConstants.BufferUsage.Index | WebGPUConstants.BufferUsage.CopyDst,
    );
    return dataBuffer;
  }

  public createSampler(descriptor: GPUSamplerDescriptor) {
    return this.device.createSampler(descriptor);
  }

  public createTexture(
    [width, height]: [number, number],
    imageData: Uint8ClampedArray,
    usage: GPUTextureUsageFlags,
  ) {
    let data = null;

    const rowPitch = Math.ceil((width * 4) / 256) * 256;
    if (rowPitch === width * 4) {
      data = imageData;
    } else {
      data = new Uint8Array(rowPitch * height);
      let imagePixelIndex = 0;
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          const i = x * 4 + y * rowPitch;
          data[i] = imageData[imagePixelIndex];
          data[i + 1] = imageData[imagePixelIndex + 1];
          data[i + 2] = imageData[imagePixelIndex + 2];
          data[i + 3] = imageData[imagePixelIndex + 3];
          imagePixelIndex += 4;
        }
      }
    }

    const texture = this.device.createTexture({
      size: {
        width,
        height,
        depth: 1,
      },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.COPY_DST | usage,
    });

    const textureDataBuffer = this.createBuffer(
      data,
      WebGPUConstants.BufferUsage.CopyDst | WebGPUConstants.BufferUsage.CopySrc,
    );

    this.uploadEncoder.copyBufferToTexture(
      {
        buffer: textureDataBuffer,
        bytesPerRow: rowPitch,
      },
      {
        texture,
      },
      {
        width,
        height,
        depth: 1,
      },
    );

    return texture;
  }

  public setRenderBindGroups(bindGroups: GPUBindGroup[]) {
    const renderPass = this.bundleEncoder || this.currentRenderPass!;
    for (let i = 0; i < bindGroups.length; i++) {
      renderPass.setBindGroup(i, bindGroups[i]);
    }
  }

  public setComputeBindGroups(bindGroups: GPUBindGroup[]) {
    if (this.currentComputePass) {
      for (let i = 0; i < bindGroups.length; i++) {
        this.currentComputePass.setBindGroup(i, bindGroups[i]);
      }
    }
  }

  public setComputePipeline(
    computePipelineName: string,
    descriptor: GPUComputePipelineDescriptor,
  ) {
    if (!this.computePipelines[computePipelineName]) {
      const computePipeline = this.device.createComputePipeline(descriptor);
      this.computePipelines[computePipelineName] = computePipeline;
    }

    this.currentComputePass?.setPipeline(
      this.computePipelines[computePipelineName],
    );
  }

  /**
   * 不同于 Babylon.js 的版本，使用最新的 map buffer 方法，创建一个临时的 mapped buffer 用于拷贝数据
   * @see https://gpuweb.github.io/gpuweb/#GPUDevice-createBufferMapped
   * @see https://github.com/gpuweb/gpuweb/blob/master/design/BufferOperations.md#updating-data-to-an-existing-buffer-like-webgls-buffersubdata
   *
   * TODO: 使用类似 AutoRingBuffer 之类的缓存结构尽可能复用临时 GPUBuffer
   */
  public setSubData(
    destBuffer: GPUBuffer,
    destOffset: number,
    srcArrayBuffer: ArrayBufferView,
  ) {
    // deprecated API
    // destBuffer.setSubData(0, srcArrayBuffer);

    const byteCount = srcArrayBuffer.byteLength;
    const [srcBuffer, arrayBuffer] = this.device.createBufferMapped({
      size: byteCount,
      usage: WebGPUConstants.BufferUsage.CopySrc,
    });

    new Uint8Array(arrayBuffer).set(new Uint8Array(srcArrayBuffer.buffer));
    srcBuffer.unmap();

    this.uploadEncoder.copyBufferToBuffer(
      srcBuffer,
      0,
      destBuffer,
      destOffset,
      byteCount,
    );

    // 不能立即 destroy 掉临时 buffer，因为 encoder 还未提交，
    // 会报 'Destroyed buffer used in a submit'，因此只能在 encoder 提交后统一进行销毁
    // srcBuffer.destroy();
    this.tempBuffers.push(srcBuffer);
  }

  public async readData(context: GLSLContext) {
    const { output } = context;
    if (output) {
      const { length, typedArrayConstructor, gpuBuffer } = output;
      if (gpuBuffer) {
        let arraybuffer;
        if (isSafari) {
          arraybuffer = await gpuBuffer.mapReadAsync();
        } else {
          const byteCount = length! * typedArrayConstructor!.BYTES_PER_ELEMENT;
          const gpuReadBuffer = this.device.createBuffer({
            size: byteCount,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
          });

          this.uploadEncoder.copyBufferToBuffer(
            gpuBuffer,
            0,
            gpuReadBuffer,
            0,
            byteCount,
          );

          // submit copy command
          this.commandBuffers[0] = this.uploadEncoder.finish();
          // filter undefined buffers
          this.device.defaultQueue.submit(this.commandBuffers.filter((b) => b));
          this.uploadEncoder = this.device.createCommandEncoder(
            this.uploadEncoderDescriptor,
          );

          arraybuffer = await gpuReadBuffer.mapReadAsync();
          // destroy read buffer later
          this.tempBuffers.push(gpuReadBuffer);
        }
        return new typedArrayConstructor!(arraybuffer);
      }
    }
    return new Float32Array();
  }

  public bindVertexInputs(vertexInputs: {
    indexBuffer: GPUBuffer | null;
    indexOffset: number;
    vertexStartSlot: number;
    vertexBuffers: GPUBuffer[];
    vertexOffsets: number[];
  }) {
    const renderPass = this.bundleEncoder || this.currentRenderPass!;

    if (vertexInputs.indexBuffer) {
      renderPass.setIndexBuffer(
        vertexInputs.indexBuffer,
        vertexInputs.indexOffset,
      );
    }

    for (let i = 0; i < vertexInputs.vertexBuffers.length; i++) {
      const buf = vertexInputs.vertexBuffers[i];
      if (buf) {
        renderPass.setVertexBuffer(
          vertexInputs.vertexStartSlot + i,
          vertexInputs.vertexBuffers[i],
          vertexInputs.vertexOffsets[i],
        );
      }
    }
  }

  public dispatch(context: GLSLContext) {
    if (this.currentComputePass) {
      this.currentComputePass.dispatch(...context.dispatch);
    }
  }

  public confirmInput(
    contextName: string,
    textureName: string,
    referContextName: string,
  ) {
    //
  }

  private createBuffer(
    view: ArrayBufferView,
    flags: GPUBufferUsageFlags,
  ): GPUBuffer {
    const padding = view.byteLength % 4;
    const verticesBufferDescriptor = {
      size: view.byteLength + padding,
      usage: flags,
    };
    const buffer = this.device.createBuffer(verticesBufferDescriptor);

    this.setSubData(buffer, 0, view);

    return buffer;
  }

  private async initGlslang() {
    this.glslang = await glslang();
    this.adapter = (await navigator?.gpu?.requestAdapter()) as GPUAdapter;
    this.device = await this.adapter.requestDevice();
  }

  private initContextAndSwapChain() {
    this.context = (this.canvas.getContext(
      isSafari ? 'gpu' : 'gpupresent',
    ) as unknown) as GPUCanvasContext;
    this.swapChain = this.context.configureSwapChain({
      device: this.device,
      format: this.options.swapChainFormat!,
      usage:
        WebGPUConstants.TextureUsage.OutputAttachment |
        WebGPUConstants.TextureUsage.CopySrc,
    });
  }

  private initMainAttachments() {
    this.mainTextureExtends = {
      width: this.canvas.width,
      height: this.canvas.height,
      depth: 1,
    };

    if (this.options.antialiasing) {
      const mainTextureDescriptor = {
        size: this.mainTextureExtends,
        // TODO: arrayLayerCount is deprecated: use size.depth
        // arrayLayerCount: 1,
        mipLevelCount: 1,
        sampleCount: this.mainPassSampleCount,
        dimension: WebGPUConstants.TextureDimension.E2d,
        format: WebGPUConstants.TextureFormat.BGRA8Unorm,
        usage: WebGPUConstants.TextureUsage.OutputAttachment,
      };

      if (this.mainTexture) {
        this.mainTexture.destroy();
      }
      this.mainTexture = this.device.createTexture(mainTextureDescriptor);
      this.mainColorAttachments = [
        {
          attachment: isSafari
            ? // @ts-ignore
              this.mainTexture.createDefaultView()
            : this.mainTexture.createView(),
          loadValue: [0, 0, 0, 1],
          storeOp: WebGPUConstants.StoreOp.Store,
        },
      ];
    } else {
      this.mainColorAttachments = [
        {
          attachment: isSafari
            ? // @ts-ignore
              this.swapChain.getCurrentTexture().createDefaultView()
            : this.swapChain.getCurrentTexture().createView(),
          loadValue: [0, 0, 0, 1],
          storeOp: WebGPUConstants.StoreOp.Store,
        },
      ];
    }

    const depthTextureDescriptor = {
      size: this.mainTextureExtends,
      // arrayLayerCount: 1,
      mipLevelCount: 1,
      sampleCount: this.mainPassSampleCount,
      dimension: WebGPUConstants.TextureDimension.E2d,
      format: isSafari
        ? 'depth32float-stencil8'
        : WebGPUConstants.TextureFormat.Depth24PlusStencil8,
      usage: WebGPUConstants.TextureUsage.OutputAttachment,
    };

    if (this.depthTexture) {
      this.depthTexture.destroy();
    }
    // @ts-ignore
    this.depthTexture = this.device.createTexture(depthTextureDescriptor);
    this.mainDepthAttachment = {
      attachment: isSafari
        ? // @ts-ignore
          this.depthTexture.createDefaultView()
        : this.depthTexture.createView(),
      depthLoadValue: this.clearDepthValue,
      depthStoreOp: WebGPUConstants.StoreOp.Store,
      stencilLoadValue: this.clearStencilValue,
      stencilStoreOp: WebGPUConstants.StoreOp.Store,
    };
  }

  private startComputePass() {
    if (this.currentComputePass) {
      this.endComputePass();
    }

    this.currentComputePass = this.computeEncoder.beginComputePass();
  }

  private startMainRenderPass() {
    if (this.currentRenderPass) {
      this.endRenderPass();
    }

    // Resolve in case of MSAA
    if (this.options.antialiasing) {
      this.mainColorAttachments[0].resolveTarget = isSafari
        ? // @ts-ignore
          this.swapChain.getCurrentTexture().createDefaultView()
        : this.swapChain.getCurrentTexture().createView();
    } else {
      this.mainColorAttachments[0].attachment = isSafari
        ? // @ts-ignore
          this.swapChain.getCurrentTexture().createDefaultView()
        : this.swapChain.getCurrentTexture().createView();
    }

    this.currentRenderPass = this.renderEncoder.beginRenderPass({
      colorAttachments: this.mainColorAttachments,
      depthStencilAttachment: this.mainDepthAttachment,
    });
  }

  private endRenderPass() {
    if (this.currentRenderPass) {
      this.currentRenderPass.endPass();
      this.currentRenderPass = null;
    }
  }

  private endComputePass() {
    if (this.currentComputePass) {
      this.currentComputePass.endPass();
      this.currentComputePass = null;
    }
  }

  private setRenderPipeline(
    name: string,
    descriptor: WithOptional<
      Pick<
        GPURenderPipelineDescriptor,
        | 'primitiveTopology'
        | 'rasterizationState'
        | 'depthStencilState'
        | 'colorStates'
        | 'vertexStage'
        | 'fragmentStage'
        | 'vertexState'
        | 'layout'
      >,
      | 'primitiveTopology'
      | 'rasterizationState'
      | 'depthStencilState'
      | 'colorStates'
      | 'fragmentStage'
      | 'vertexState'
    >,
  ) {
    const renderPass = this.bundleEncoder || this.currentRenderPass!;

    const pipeline = this.getRenderPipeline(name, descriptor);
    if (pipeline) {
      renderPass.setPipeline(pipeline);
    }

    // const vertexInputs = this.getVertexInputsToRender();
    // this.bindVertexInputs(vertexInputs);

    // const bindGroups = this.getBindGroupsToRender();
    // this.setRenderBindGroups(bindGroups);

    // if (this._alphaState.alphaBlend && this._alphaState._isBlendConstantsDirty) {
    //   // TODO WebGPU. should use renderPass.
    //   this.currentRenderPass!.setBlendColor(this._alphaState._blendConstants as any);
    // }
  }

  private compileRawShaderToSpirV(
    source: string,
    type: string,
  ): Promise<Uint32Array> {
    return this.glslang.compileGLSL(source, type);
  }

  private compileShaderToSpirV(
    source: string,
    type: string,
    shaderVersion: string,
  ): Promise<Uint32Array> {
    return this.compileRawShaderToSpirV(shaderVersion + source, type);
  }

  private createPipelineStageDescriptor(
    vertexShader: Uint32Array,
    fragmentShader: Uint32Array,
  ): Pick<GPURenderPipelineDescriptor, 'vertexStage' | 'fragmentStage'> {
    return {
      vertexStage: {
        module: this.device.createShaderModule({
          code: vertexShader,
          // @ts-ignore
          isWHLSL: isSafari,
        }),
        entryPoint: 'main',
      },
      fragmentStage: {
        module: this.device.createShaderModule({
          code: fragmentShader,
          // @ts-ignore
          isWHLSL: isSafari,
        }),
        entryPoint: 'main',
      },
    };
  }

  private getRenderPipeline(
    name: string,
    descriptor: WithOptional<
      Pick<
        GPURenderPipelineDescriptor,
        | 'primitiveTopology'
        | 'rasterizationState'
        | 'depthStencilState'
        | 'colorStates'
        | 'vertexStage'
        | 'fragmentStage'
        | 'vertexState'
        | 'layout'
      >,
      | 'primitiveTopology'
      | 'rasterizationState'
      | 'depthStencilState'
      | 'colorStates'
      | 'fragmentStage'
      | 'vertexState'
    >,
  ): GPURenderPipeline | null {
    if (this.pipelines[name]) {
      return this.pipelines[name];
    }

    const {
      primitiveTopology,
      rasterizationState,
      depthStencilState,
      colorStates,
      vertexStage,
      fragmentStage,
      vertexState,
      layout,
    } = descriptor;

    if (vertexStage && fragmentStage) {
      const renderPipeline = this.device.createRenderPipeline({
        sampleCount: this.mainPassSampleCount,
        primitiveTopology: primitiveTopology || 'triangle-list',
        rasterizationState: {
          ...this.getDefaultRasterizationStateDescriptor(),
          ...rasterizationState,
        },
        depthStencilState: {
          ...this.getDefaultDepthStencilStateDescriptor(),
          ...depthStencilState,
        },
        colorStates: colorStates || this.getDefaultColorStateDescriptors(),
        layout,
        vertexStage,
        fragmentStage,
        vertexState,
      });
      this.pipelines[name] = renderPipeline;
      return renderPipeline;
    }

    return null;
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

  /**
   * @see https://gpuweb.github.io/gpuweb/#depth-stencil-state
   */
  private getDefaultDepthStencilStateDescriptor(): GPUDepthStencilStateDescriptor {
    const stencilFrontBack: GPUStencilStateFaceDescriptor = {
      compare: WebGPUConstants.CompareFunction.Always,
      depthFailOp: WebGPUConstants.StencilOperation.Keep,
      failOp: WebGPUConstants.StencilOperation.Keep,
      passOp: WebGPUConstants.StencilOperation.Keep,
    };
    return {
      depthWriteEnabled: false,
      depthCompare: WebGPUConstants.CompareFunction.Always,
      format: WebGPUConstants.TextureFormat.Depth24PlusStencil8,
      stencilFront: stencilFrontBack,
      stencilBack: stencilFrontBack,
      stencilReadMask: 0xffffffff,
      stencilWriteMask: 0xffffffff,
    };
  }

  /**
   * @see https://gpuweb.github.io/gpuweb/#color-state
   */
  private getDefaultColorStateDescriptors(): GPUColorStateDescriptor[] {
    return [
      {
        format: this.options.swapChainFormat!,
        // https://gpuweb.github.io/gpuweb/#blend-state
        alphaBlend: {
          srcFactor: WebGPUConstants.BlendFactor.One,
          dstFactor: WebGPUConstants.BlendFactor.Zero,
          operation: WebGPUConstants.BlendOperation.Add,
        },
        colorBlend: {
          srcFactor: WebGPUConstants.BlendFactor.One,
          dstFactor: WebGPUConstants.BlendFactor.Zero,
          operation: WebGPUConstants.BlendOperation.Add,
        },
        writeMask: WebGPUConstants.ColorWrite.All,
      },
    ];
  }
}
