import {
  IConfigService,
  IDENTIFIER,
  IRendererService,
  IShaderModuleService,
  ISystem,
  IView,
} from '@antv/g-webgpu-core';
// tslint:disable-next-line:no-submodule-imports
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { inject, injectable } from 'inversify';
import { container } from '.';

@injectable()
export class Renderer {
  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  @inject(IDENTIFIER.ShaderModuleService)
  private readonly shaderModule: IShaderModuleService;

  @inject(IDENTIFIER.ConfigService)
  private readonly configService: IConfigService;

  private inited: boolean = false;

  private rendering: boolean = false;

  public async init() {
    // 模块化处理
    this.shaderModule.registerBuiltinModules();

    const config = this.configService.get();
    const systems = container.getAll<ISystem>(IDENTIFIER.Systems);

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

  public async render(view: IView) {
    if (!this.inited || this.rendering) {
      return;
    }

    this.rendering = true;
    this.engine.beginFrame();

    const systems = container.getAll<ISystem>(IDENTIFIER.Systems);
    for (const system of systems) {
      if (system.execute) {
        await system.execute(view);
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
}
