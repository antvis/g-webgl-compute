import {
  IClearOptions,
  IConfigService,
  IDENTIFIER,
  IRendererService,
  IShaderModuleService,
  ISystem,
  IView,
} from '@antv/g-webgpu-core';
// tslint:disable-next-line:no-submodule-imports
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { Container, inject, injectable, multiInject } from 'inversify';

@injectable()
export class Renderer {
  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  @inject(IDENTIFIER.ShaderModuleService)
  private readonly shaderModule: IShaderModuleService;

  @inject(IDENTIFIER.ConfigService)
  private readonly configService: IConfigService;

  // @multiInject(IDENTIFIER.Systems)
  // private readonly systems: ISystem[];

  private inited: boolean = false;

  private rendering: boolean = false;

  private pendings: Array<() => void> = [];

  private views: IView[] = [];
  private size: { width: number; height: number };

  public container: Container;

  public async init() {
    // 模块化处理
    this.shaderModule.registerBuiltinModules();

    const systems = this.container.getAll<ISystem>(IDENTIFIER.Systems);

    const config = this.configService.get();

    if (config.canvas) {
      await this.engine.init({
        canvas: config.canvas,
        swapChainFormat: WebGPUConstants.TextureFormat.BGRA8Unorm,
        antialiasing: false,
      });

      for (const system of systems) {
        if (system.initialize) {
          await system.initialize();
        }
      }

      this.inited = true;
    }
  }

  public async render(...views: IView[]) {
    if (!this.inited || this.rendering) {
      return;
    }

    if (this.pendings.length) {
      this.pendings.forEach((pending) => {
        pending();
      });
    }

    this.rendering = true;
    this.engine.beginFrame();

    const systems = this.container.getAll<ISystem>(IDENTIFIER.Systems);
    for (const system of systems) {
      if (system.execute) {
        await system.execute(views);
      }
    }

    // 录制一遍绘制命令，后续直接播放
    // if (this.useRenderBundle) {
    //   if (!this.renderBundleRecorded) {
    //     this.engine.startRecordBundle();
    //     if (this.onUpdate) {
    //       await this.onUpdate(this.engine);
    //     }
    //     this.renderBundle = this.engine.stopRecordBundle();
    //     this.renderBundleRecorded = true;
    //   }
    //   this.engine.executeBundles([this.renderBundle]);
    // } else {
    //   if (this.onUpdate) {
    //     await this.onUpdate(this.engine);
    //   }
    // }

    this.engine.endFrame();
    this.rendering = false;
  }

  public clear(options: IClearOptions) {
    if (this.inited) {
      this.engine.clear(options);
    } else {
      this.pendings.unshift(() => {
        this.engine.clear(options);
        this.pendings.shift();
      });
    }
    return this;
  }

  // public setScissor(
  //   scissor: Partial<{
  //     enable: boolean;
  //     box: {
  //       x: number;
  //       y: number;
  //       width: number;
  //       height: number;
  //     };
  //   }>,
  // ) {
  //   this.engine.setScissor(scissor);
  //   return this;
  // }

  public setSize({ width, height }: { width: number; height: number }) {
    const canvas = this.engine.getCanvas();
    this.size = { width, height };
    canvas.width = width;
    canvas.height = height;
    return this;
  }

  public getSize() {
    return this.size;
  }
}
