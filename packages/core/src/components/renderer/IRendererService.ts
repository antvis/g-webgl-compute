import { Entity, GLSLContext } from '../..';
import { IAttribute, IAttributeInitializationOptions } from './IAttribute';
import { IBuffer, IBufferInitializationOptions } from './IBuffer';
import { IComputeModel } from './IComputeModel';
import { IElements, IElementsInitializationOptions } from './IElements';
import {
  IFramebuffer,
  IFramebufferInitializationOptions,
} from './IFramebuffer';
import { IModel, IModelInitializationOptions } from './IModel';
import { IPass } from './IMultiPassRenderer';
import { ITexture2D, ITexture2DInitializationOptions } from './ITexture2D';

export interface IScene {
  getEntities(): Entity[];
}

export interface IViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IRendererConfig {
  canvas: HTMLCanvasElement;

  /**
   * Whether to use WGSL instead of GLSL 450
   */
  useWGSL?: boolean;

  /**
   * 是否开启 multi pass
   */
  enableMultiPassRenderer?: boolean;
  passes?: Array<IPass<unknown>>;
  antialias?: boolean;
  preserveDrawingBuffer?: boolean;

  /**
   * Defines wether MSAA is enabled on the canvas.
   */
  antialiasing?: boolean;

  /**
   * Whether to support ComputePipeline.
   */
  supportCompute?: boolean;
}

export interface IClearOptions {
  // gl.clearColor
  color?: [number, number, number, number];
  // gl.clearDepth 默认值为 1
  depth?: number;
  // gl.clearStencil 默认值为 0
  stencil?: number;
  // gl.bindFrameBuffer
  framebuffer?: IFramebuffer | null;
}

export interface IReadPixelsOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  // gl.bindFrameBuffer
  framebuffer?: IFramebuffer;
  data?: Uint8Array;
}

export type BufferData =
  | number
  | number[]
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array;

export interface IRendererService {
  supportWebGPU: boolean;
  useWGSL: boolean;
  init(cfg: IRendererConfig): Promise<void>;
  clear(options: IClearOptions): void;
  createModel(options: IModelInitializationOptions): Promise<IModel>;
  createAttribute(options: IAttributeInitializationOptions): IAttribute;
  createBuffer(options: IBufferInitializationOptions): IBuffer;
  createElements(options: IElementsInitializationOptions): IElements;
  createTexture2D(
    options: ITexture2DInitializationOptions | HTMLImageElement,
  ): ITexture2D;
  createFramebuffer(options: IFramebufferInitializationOptions): IFramebuffer;
  useFramebuffer(
    framebuffer: IFramebuffer | null,
    drawCommands: () => void,
  ): void;
  getCanvas(): HTMLCanvasElement;
  getGLContext(): WebGLRenderingContext;
  viewport(size: { x: number; y: number; width: number; height: number }): void;
  readPixels(options: IReadPixelsOptions): Uint8Array;
  setScissor(
    scissor: Partial<{
      enable: boolean;
      box: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>,
  ): void;
  destroy(): void;
  beginFrame(): void;
  endFrame(): void;

  // GPGPU
  createComputeModel(context: GLSLContext): Promise<IComputeModel>;
}
