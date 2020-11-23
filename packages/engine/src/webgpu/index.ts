/**
 * implements renderService with WebGPU API
 * @see https://webgpu.io/
 * @see https://github.com/BabylonJS/Babylon.js/blob/WebGPU/src/Engines/webgpuEngine.ts
 */
import {
  GLSLContext,
  IAttribute,
  IAttributeInitializationOptions,
  IBuffer,
  IBufferInitializationOptions,
  IClearOptions,
  IElements,
  IElementsInitializationOptions,
  IFramebuffer,
  IFramebufferInitializationOptions,
  IModel,
  IModelInitializationOptions,
  IReadPixelsOptions,
  IRendererConfig,
  IRendererService,
  isSafari,
  ITexture2D,
  ITexture2DInitializationOptions,
  IViewport,
} from '@antv/g-webgpu-core';
// import { Glslang } from '@webgpu/glslang/dist/web-devel/glslang.onefile';
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { vec4 } from 'gl-matrix';
import { injectable } from 'inversify';
import glslang from './glslang';
import WebGPUAttribute from './WebGPUAttribute';
import WebGPUBuffer from './WebGPUBuffer';
import WebGPUComputeModel from './WebGPUComputeModel';
import WebGPUElements from './WebGPUElements';
import WebGPUFramebuffer from './WebGPUFramebuffer';
import WebGPUModel from './WebGPUModel';
import WebGPUTexture2D from './WebGPUTexture2D';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * regl renderer
 */
@injectable()
export class WebGPUEngine implements IRendererService {
  public supportWebGPU = true;
  public useWGSL = false;

  public options: IRendererConfig;
  public canvas: HTMLCanvasElement;
  public context: GPUCanvasContext;
  public glslang: any;
  public adapter: GPUAdapter;
  public device: GPUDevice;
  public swapChain: GPUSwapChain;

  public mainPassSampleCount: number;

  public mainTexture: GPUTexture;
  public depthTexture: GPUTexture;
  public mainColorAttachments: GPURenderPassColorAttachmentDescriptor[];
  public mainTextureExtends: GPUExtent3D;
  public mainDepthAttachment: GPURenderPassDepthStencilAttachmentDescriptor;

  // Frame Life Cycle (recreated each frame)
  public uploadEncoder: GPUCommandEncoder;
  public renderEncoder: GPUCommandEncoder;
  public computeEncoder: GPUCommandEncoder;
  public renderTargetEncoder: GPUCommandEncoder;
  public commandBuffers: GPUCommandBuffer[] = new Array(4).fill(undefined);

  // Frame Buffer Life Cycle (recreated for each render target pass)
  public currentRenderPass: GPURenderPassEncoder | null = null;
  public mainRenderPass: GPURenderPassEncoder | null = null;
  public currentRenderTargetViewDescriptor: GPUTextureViewDescriptor;
  public currentComputePass: GPUComputePassEncoder | null = null;
  public bundleEncoder: GPURenderBundleEncoder | null;
  public tempBuffers: GPUBuffer[] = [];
  public currentRenderTarget: WebGPUFramebuffer | null = null;

  public readonly uploadEncoderDescriptor = { label: 'upload' };
  public readonly renderEncoderDescriptor = { label: 'render' };
  public readonly renderTargetEncoderDescriptor = { label: 'renderTarget' };
  public readonly computeEncoderDescriptor = { label: 'compute' };

  /**
   * 通过名称访问
   */
  private pipelines: {
    [pipelineName: string]: GPURenderPipeline;
  } = {};
  private computePipelines: {
    [pipelineName: string]: GPUComputePipeline;
  } = {};

  private readonly defaultSampleCount = 4;
  private readonly clearDepthValue = 1;
  private readonly clearStencilValue = 0;
  private transientViewport: IViewport = {
    x: Infinity,
    y: 0,
    width: 0,
    height: 0,
  };
  private cachedViewport: IViewport = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  public isFloatSupported() {
    return true;
  }

  public async init(config: IRendererConfig): Promise<void> {
    this.canvas = config.canvas;
    this.options = config;
    this.useWGSL = !!config.useWGSL;
    this.mainPassSampleCount = config.antialiasing
      ? this.defaultSampleCount
      : 1;

    await this.initGlslang();
    this.initContextAndSwapChain();
    this.initMainAttachments();
  }

  public clear = (options: IClearOptions): void => {
    const { framebuffer, color, depth, stencil } = options;

    if (this.options.supportCompute) {
      this.startComputePass();
    }

    // We need to recreate the render pass so that the new parameters for clear color / depth / stencil are taken into account
    if (this.currentRenderTarget) {
      if (this.currentRenderPass) {
        this.endRenderTargetRenderPass();
      }
      this.startRenderTargetRenderPass(
        this.currentRenderTarget!,
        color ? color : null,
        !!depth,
        !!stencil,
      );
    } else {
      // if (this.useReverseDepthBuffer) {
      //     this._depthCullingState.depthFunc = Constants.GREATER;
      // }

      this.mainColorAttachments[0].loadValue = color
        ? color
        : WebGPUConstants.LoadOp.Load;

      this.mainDepthAttachment.depthLoadValue = depth
        ? depth
        : WebGPUConstants.LoadOp.Load;
      this.mainDepthAttachment.stencilLoadValue = stencil
        ? this.clearStencilValue
        : WebGPUConstants.LoadOp.Load;

      if (this.mainRenderPass) {
        this.endMainRenderPass();
      }

      this.startMainRenderPass();
    }
  };

  public createModel = async (
    options: IModelInitializationOptions,
  ): Promise<IModel> => {
    const model = new WebGPUModel(this, options);
    await model.init();
    return model;
  };

  public createAttribute = (
    options: IAttributeInitializationOptions,
  ): IAttribute => {
    return new WebGPUAttribute(this, options);
  };

  public createBuffer = (options: IBufferInitializationOptions): IBuffer => {
    return new WebGPUBuffer(this, options);
  };

  public createElements = (
    options: IElementsInitializationOptions,
  ): IElements => {
    return new WebGPUElements(this, options);
  };

  public createTexture2D = (
    options: ITexture2DInitializationOptions,
  ): ITexture2D => {
    return new WebGPUTexture2D(this, options);
  };

  public createFramebuffer = (
    options: IFramebufferInitializationOptions,
  ): IFramebuffer => {
    return new WebGPUFramebuffer(this, options);
  };

  public useFramebuffer = (
    framebuffer: IFramebuffer | null,
    drawCommands: () => void,
  ): void => {
    // bind
    if (this.currentRenderTarget) {
      this.unbindFramebuffer(this.currentRenderTarget);
    }
    this.currentRenderTarget = framebuffer as WebGPUFramebuffer;

    // TODO: use mipmap options in framebuffer
    this.currentRenderTargetViewDescriptor = {
      dimension: WebGPUConstants.TextureViewDimension.E2d,
      // mipLevelCount: bindWithMipMaps ? WebGPUTextureHelper.computeNumMipmapLevels(texture.width, texture.height) - lodLevel : 1,
      // baseArrayLayer: faceIndex,
      // baseMipLevel: lodLevel,
      arrayLayerCount: 1,
      aspect: WebGPUConstants.TextureAspect.All,
    };

    this.currentRenderPass = null;

    drawCommands();
  };

  public createComputeModel = async (context: GLSLContext) => {
    const model = new WebGPUComputeModel(this, context);
    await model.init();
    return model;
  };

  public getCanvas = (): HTMLCanvasElement => {
    return this.canvas;
  };

  public getGLContext = (): WebGLRenderingContext => {
    throw new Error('Method not implemented.');
  };

  public viewport = ({
    x,
    y,
    width,
    height,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void => {
    if (!this.currentRenderPass) {
      // call viewport() before current render pass created
      this.transientViewport = { x, y, width, height };
    } else if (this.transientViewport.x !== Infinity) {
      const renderPass = this.getCurrentRenderPass();
      // @see https://gpuweb.github.io/gpuweb/#dom-gpurenderpassencoder-setviewport
      renderPass.setViewport(
        this.transientViewport.x,
        this.transientViewport.y,
        this.transientViewport.width,
        this.transientViewport.height,
        0,
        1,
      );
    } else if (
      x !== this.cachedViewport.x ||
      y !== this.cachedViewport.y ||
      width !== this.cachedViewport.width ||
      height !== this.cachedViewport.height
    ) {
      this.cachedViewport = { x, y, width, height };
      const renderPass = this.getCurrentRenderPass();
      renderPass.setViewport(x, y, width, height, 0, 1);
    }
  };

  public readPixels = (options: IReadPixelsOptions): Uint8Array => {
    throw new Error('Method not implemented.');
  };

  public destroy(): void {
    if (this.mainTexture) {
      this.mainTexture.destroy();
    }
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }
    this.tempBuffers.forEach((buffer) => buffer.destroy());
    this.tempBuffers = [];
  }

  public beginFrame() {
    this.uploadEncoder = this.device.createCommandEncoder(
      this.uploadEncoderDescriptor,
    );
    this.renderEncoder = this.device.createCommandEncoder(
      this.renderEncoderDescriptor,
    );
    this.renderTargetEncoder = this.device.createCommandEncoder(
      this.renderTargetEncoderDescriptor,
    );
    if (this.options.supportCompute) {
      this.computeEncoder = this.device.createCommandEncoder(
        this.computeEncoderDescriptor,
      );
    }
  }

  public endFrame() {
    if (this.options.supportCompute) {
      this.endComputePass();
    }

    this.endMainRenderPass();

    this.commandBuffers[0] = this.uploadEncoder.finish();
    this.commandBuffers[1] = this.renderEncoder.finish();
    if (this.options.supportCompute) {
      this.commandBuffers[2] = this.computeEncoder.finish();
    }
    this.commandBuffers[3] = this.renderTargetEncoder.finish();

    if (isSafari) {
      this.device
        // @ts-ignore
        .getQueue()
        .submit(this.commandBuffers.filter((buffer) => buffer));
    } else {
      this.device.defaultQueue.submit(
        this.commandBuffers.filter((buffer) => buffer),
      );
    }
  }

  public getCurrentRenderPass(): GPURenderPassEncoder {
    if (this.currentRenderTarget && !this.currentRenderPass) {
      this.startRenderTargetRenderPass(
        this.currentRenderTarget,
        null,
        false,
        false,
      );
    } else if (!this.currentRenderPass) {
      this.startMainRenderPass();
    }

    return this.currentRenderPass!;
  }

  private async initGlslang() {
    this.glslang = await glslang();
    this.adapter = (await navigator?.gpu?.requestAdapter()) as GPUAdapter;
    this.device = (await this.adapter.requestDevice()) as GPUDevice;
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

    this.depthTexture = this.device.createTexture(
      // @ts-ignore
      depthTextureDescriptor,
    );
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
    if (this.currentRenderPass && !this.currentRenderTarget) {
      this.endMainRenderPass();
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
      depthStencilAttachment: this.mainDepthAttachment, // TODO: use framebuffer's depth & stencil
    });

    this.mainRenderPass = this.currentRenderPass;

    if (this.cachedViewport) {
      this.viewport(this.cachedViewport);
    }
  }

  private startRenderTargetRenderPass(
    renderTarget: WebGPUFramebuffer,
    clearColor: [number, number, number, number] | null,
    clearDepth: boolean,
    clearStencil: boolean = false,
  ) {
    const gpuTexture = renderTarget.get().color?.texture;
    let colorTextureView: GPUTextureView;
    if (gpuTexture) {
      colorTextureView = gpuTexture.createView(
        this.currentRenderTargetViewDescriptor,
      );
    }

    const depthStencilTexture = renderTarget.get().depth?.texture;
    let depthStencilTextureView;
    if (depthStencilTexture) {
      depthStencilTextureView = depthStencilTexture.createView();
    }

    const renderPass = this.renderTargetEncoder.beginRenderPass({
      colorAttachments: [
        {
          attachment: colorTextureView!,
          loadValue:
            clearColor !== null ? clearColor : WebGPUConstants.LoadOp.Load,
          storeOp: WebGPUConstants.StoreOp.Store,
        },
      ],
      depthStencilAttachment:
        depthStencilTexture && depthStencilTextureView
          ? {
              attachment: depthStencilTextureView,
              depthLoadValue: clearDepth
                ? this.clearDepthValue
                : WebGPUConstants.LoadOp.Load,
              depthStoreOp: WebGPUConstants.StoreOp.Store,
              stencilLoadValue: clearStencil
                ? this.clearStencilValue
                : WebGPUConstants.LoadOp.Load,
              stencilStoreOp: WebGPUConstants.StoreOp.Store,
            }
          : undefined,
    });

    this.currentRenderPass = renderPass;

    if (this.cachedViewport) {
      this.viewport(this.cachedViewport);
    }

    // TODO WEBGPU set the scissor rect and the stencil reference value
  }

  private endMainRenderPass() {
    if (
      this.currentRenderPass === this.mainRenderPass &&
      this.currentRenderPass !== null
    ) {
      this.currentRenderPass.endPass();
      this.resetCachedViewport();
      this.currentRenderPass = null;
      this.mainRenderPass = null;
    }
  }

  private endComputePass() {
    if (this.currentComputePass) {
      this.currentComputePass.endPass();
      this.currentComputePass = null;
    }
  }

  private endRenderTargetRenderPass() {
    if (this.currentRenderPass) {
      this.currentRenderPass.endPass();
      this.resetCachedViewport();
    }
  }

  private resetCachedViewport() {
    this.cachedViewport = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  private unbindFramebuffer(framebuffer: WebGPUFramebuffer) {
    // unbind
    if (
      this.currentRenderPass &&
      this.currentRenderPass !== this.mainRenderPass
    ) {
      this.endRenderTargetRenderPass();
    }

    this.transientViewport.x = Infinity;
    this.currentRenderTarget = null;

    // if (texture.generateMipMaps && !disableGenerateMipMaps && !texture.isCube) {
    //   this._generateMipmaps(texture);
    // }

    this.currentRenderPass = this.mainRenderPass;
  }
}
