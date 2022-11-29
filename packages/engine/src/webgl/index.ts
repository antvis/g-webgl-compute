/**
 * render w/ regl
 * @see https://github.com/regl-project/regl/blob/gh-pages/API.md
 */
import {
  gl,
  GLSLContext,
  IAttribute,
  IAttributeInitializationOptions,
  IBuffer,
  IBufferInitializationOptions,
  IClearOptions,
  IComputeModel,
  IElements,
  IElementsInitializationOptions,
  IFramebuffer,
  IFramebufferInitializationOptions,
  IModel,
  IModelInitializationOptions,
  IReadPixelsOptions,
  IRendererConfig,
  IRendererService,
  ITexture2D,
  ITexture2DInitializationOptions,
} from '@antv/g-webgpu-core';
import regl from 'regl';
import ReglAttribute from './ReglAttribute';
import ReglBuffer from './ReglBuffer';
import ReglComputeModel from './ReglComputeModel';
import ReglElements from './ReglElements';
import ReglFramebuffer from './ReglFramebuffer';
import ReglModel from './ReglModel';
import ReglTexture2D from './ReglTexture2D';

/**
 * regl renderer
 */
export class WebGLEngine implements IRendererService {
  public supportWebGPU = false;
  public useWGSL = false;
  private $canvas: HTMLCanvasElement;
  private gl: regl.Regl;
  private inited: boolean;

  public async init(cfg: IRendererConfig): Promise<void> {
    if (this.inited) {
      return;
    }
    this.$canvas = cfg.canvas;
    // tslint:disable-next-line:typedef
    this.gl = await new Promise((resolve, reject) => {
      regl({
        canvas: cfg.canvas,
        attributes: {
          alpha: true,
          // use TAA instead of MSAA
          // @see https://www.khronos.org/registry/webgl/specs/1.0/#5.2.1
          antialias: cfg.antialias,
          premultipliedAlpha: true,
          // preserveDrawingBuffer: false,
        },
        pixelRatio: 1,
        // TODO: use extensions
        extensions: [
          'OES_element_index_uint',
          'OES_texture_float',
          'OES_standard_derivatives', // wireframe
          'angle_instanced_arrays', // VSM shadow map
        ],
        optionalExtensions: [
          'EXT_texture_filter_anisotropic',
          'EXT_blend_minmax',
          'WEBGL_depth_texture',
        ],
        profile: true,
        onDone: (err: Error | null, r?: regl.Regl | undefined): void => {
          if (err || !r) {
            reject(err);
          }
          // @ts-ignore
          resolve(r);
        },
      });
    });
    this.inited = true;
  }

  public isFloatSupported() {
    // @see https://github.com/antvis/GWebGPUEngine/issues/26
    // @ts-ignore
    return this.gl.limits.readFloat;
  }

  public createModel = async (
    options: IModelInitializationOptions,
  ): Promise<IModel> => {
    if (options.uniforms) {
      await Promise.all(
        Object.keys(options.uniforms).map(async (name) => {
          if (
            options.uniforms![name] &&
            // @ts-ignore
            options.uniforms![name].load !== undefined
          ) {
            // @ts-ignore
            const texture = await options.uniforms![name].load();
            // @ts-ignore
            options.uniforms[name] = texture;
          }
        }),
      );
    }
    return new ReglModel(this.gl, options);
  };

  public createAttribute = (
    options: IAttributeInitializationOptions,
  ): IAttribute => new ReglAttribute(this.gl, options);

  public createBuffer = (options: IBufferInitializationOptions): IBuffer =>
    new ReglBuffer(this.gl, options);

  public createElements = (
    options: IElementsInitializationOptions,
  ): IElements => new ReglElements(this.gl, options);

  public createTexture2D = (
    options: ITexture2DInitializationOptions,
  ): ITexture2D => new ReglTexture2D(this.gl, options);

  public createFramebuffer = (options: IFramebufferInitializationOptions) =>
    new ReglFramebuffer(this.gl, options);

  public useFramebuffer = (
    framebuffer: IFramebuffer | null,
    drawCommands: () => void,
  ) => {
    this.gl({
      framebuffer: framebuffer ? (framebuffer as ReglFramebuffer).get() : null,
    })(drawCommands);
  };

  public createComputeModel = async (
    context: GLSLContext,
  ): Promise<IComputeModel> => {
    return new ReglComputeModel(this.gl, context);
  };

  public clear = (options: IClearOptions) => {
    // @see https://github.com/regl-project/regl/blob/gh-pages/API.md#clear-the-draw-buffer
    const { color, depth, stencil, framebuffer = null } = options;
    const reglClearOptions: regl.ClearOptions = {
      color,
      depth,
      stencil,
    };

    reglClearOptions.framebuffer =
      framebuffer === null
        ? framebuffer
        : (framebuffer as ReglFramebuffer).get();

    this.gl.clear(reglClearOptions);
  };

  public setScissor = (
    scissor: Partial<{
      enable: boolean;
      box: { x: number; y: number; width: number; height: number };
    }>,
  ) => {
    if (this.gl && this.gl._gl) {
      // https://developer.mozilla.org/zh-CN/docs/Web/API/WebGLRenderingContext/scissor
      if (scissor.enable && scissor.box) {
        // console.log(scissor.box);
        this.gl._gl.enable(gl.SCISSOR_TEST);
        this.gl._gl.scissor(
          scissor.box.x,
          scissor.box.y,
          scissor.box.width,
          scissor.box.height,
        );
      } else {
        this.gl._gl.disable(gl.SCISSOR_TEST);
      }
      this.gl._refresh();
    }
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
  }) => {
    if (this.gl && this.gl._gl) {
      // use WebGL context directly
      // @see https://github.com/regl-project/regl/blob/gh-pages/API.md#unsafe-escape-hatch
      this.gl._gl.viewport(x, y, width, height);
      this.gl._refresh();
    }
  };

  public readPixels = (options: IReadPixelsOptions) => {
    const { framebuffer, x, y, width, height } = options;
    const readPixelsOptions: regl.ReadOptions = {
      x,
      y,
      width,
      height,
    };
    if (framebuffer) {
      readPixelsOptions.framebuffer = (framebuffer as ReglFramebuffer).get();
    }
    return this.gl.read(readPixelsOptions);
  };

  public getCanvas = () => {
    return this.$canvas;
  };

  public getGLContext = () => {
    return this.gl._gl;
  };

  public destroy = () => {
    if (this.gl) {
      // @see https://github.com/regl-project/regl/blob/gh-pages/API.md#clean-up
      this.gl.destroy();
      this.inited = false;
    }
  };

  public beginFrame() {
    //
  }

  public endFrame() {
    //
  }
}
