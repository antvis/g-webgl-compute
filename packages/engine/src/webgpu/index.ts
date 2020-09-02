/**
 * implements renderService with WebGPU API
 * @see https://webgpu.io/
 * @see https://github.com/BabylonJS/Babylon.js/blob/WebGPU/src/Engines/webgpuEngine.ts
 */
import { GLSLContext } from '@antv/g-webgpu-compiler';
import {
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
} from '@antv/g-webgpu-core';
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { injectable } from 'inversify';
import glslang from './glslang';
import WebGPUAttribute from './WebGPUAttribute';
import WebGPUBuffer from './WebGPUBuffer';
import WebGPUComputeModel from './WebGPUComputeModel';
import WebGPUElements from './WebGPUElements';
import WebGPUModel from './WebGPUModel';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * regl renderer
 */
@injectable()
export class WebGPUEngine implements IRendererService {
  public supportWebGPU = true;

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
  public commandBuffers: GPUCommandBuffer[] = new Array(3).fill(undefined);

  // Frame Buffer Life Cycle (recreated for each render target pass)
  public currentRenderPass: GPURenderPassEncoder | null = null;
  public currentComputePass: GPUComputePassEncoder | null = null;
  public bundleEncoder: GPURenderBundleEncoder | null;
  public tempBuffers: GPUBuffer[] = [];

  public readonly uploadEncoderDescriptor = { label: 'upload' };
  public readonly renderEncoderDescriptor = { label: 'render' };
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

  public isFloatSupported() {
    return true;
  }

  public async init(config: IRendererConfig): Promise<void> {
    this.canvas = config.canvas;
    this.options = config;
    this.mainPassSampleCount = config.antialiasing
      ? this.defaultSampleCount
      : 1;

    await this.initGlslang();
    this.initContextAndSwapChain();
    this.initMainAttachments();
  }

  public clear = (options: IClearOptions): void => {
    const { color, depth, stencil } = options;

    // if (this.options.supportCompute) {
    //   this.startComputePass();
    // } else {
    //   this.mainColorAttachments[0].loadValue =
    //     color || WebGPUConstants.LoadOp.Load;

    //   this.mainDepthAttachment.depthLoadValue =
    //     depth || WebGPUConstants.LoadOp.Load;
    //   this.mainDepthAttachment.stencilLoadValue =
    //     stencil || WebGPUConstants.LoadOp.Load;
    //   this.startMainRenderPass();
    // }

    if (this.options.supportCompute) {
      this.startComputePass();
    }

    this.mainColorAttachments[0].loadValue =
      color || WebGPUConstants.LoadOp.Load;

    this.mainDepthAttachment.depthLoadValue =
      depth || WebGPUConstants.LoadOp.Load;
    this.mainDepthAttachment.stencilLoadValue =
      stencil || WebGPUConstants.LoadOp.Load;
    this.startMainRenderPass();
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
    throw new Error('Method not implemented.');
  };

  public createFramebuffer = (
    options: IFramebufferInitializationOptions,
  ): IFramebuffer => {
    throw new Error('Method not implemented.');
  };

  public useFramebuffer = (
    framebuffer: IFramebuffer | null,
    drawCommands: () => void,
  ): void => {
    throw new Error('Method not implemented.');
  };

  public createComputeModel = async (context: GLSLContext) => {
    const model = new WebGPUComputeModel(this, context);
    await model.init();
    return model;
  };

  public getViewportSize = (): { width: number; height: number } => {
    throw new Error('Method not implemented.');
  };

  public getCanvas = (): HTMLCanvasElement => {
    return this.canvas;
  };

  public getGLContext = (): WebGLRenderingContext => {
    throw new Error('Method not implemented.');
  };

  public viewport = (size: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void => {
    //
  };

  public readPixels = (options: IReadPixelsOptions): Uint8Array => {
    throw new Error('Method not implemented.');
  };

  public destroy(): void {
    if (this.mainTexture) {
      this.mainTexture.destroy();
    }
    if (this.depthTexture) {
      // this.depthTexture.destroy();
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
    this.computeEncoder = this.device.createCommandEncoder(
      this.computeEncoderDescriptor,
    );
  }

  public endFrame() {
    // this.endRenderPass();

    // if (this.options.supportCompute) {
    //   this.endComputePass();
    // } else {
    //   this.endRenderPass();
    // }

    if (this.options.supportCompute) {
      this.endComputePass();
    }
    this.endRenderPass();

    this.commandBuffers[0] = this.uploadEncoder.finish();
    this.commandBuffers[1] = this.renderEncoder.finish();
    this.commandBuffers[2] = this.computeEncoder.finish();

    if (isSafari) {
      // @ts-ignore
      this.device.getQueue().submit(this.commandBuffers);
    } else {
      this.device.defaultQueue.submit(this.commandBuffers);
    }
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
}
