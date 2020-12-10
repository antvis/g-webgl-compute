import {
  IClearOptions,
  IConfigService,
  IDENTIFIER,
  IRendererService,
  IShaderModuleService,
  ISystem,
  ITexture2D,
  ITexture2DInitializationOptions,
  IView,
} from '@antv/g-webgpu-core';
import { inject, injectable } from 'inversify';
import { TextureCache } from './Cache';

@injectable()
export class Texture2D {
  @inject(TextureCache)
  private readonly textureCache: TextureCache;

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  private config: ITexture2DInitializationOptions & { url: string };
  private loaded = false;
  private texture: ITexture2D;

  public setConfig(config: ITexture2DInitializationOptions & { url: string }) {
    this.config = config;
  }

  public isLoaded() {
    return this.loaded;
  }

  // public update(config: ITexture2DInitializationOptions) {
  //   if (this.loaded && this.texture) {
  //     const t = this.texture.get();
  //   }
  // }

  public async load() {
    if (this.config.url) {
      return new Promise<ITexture2D>((resolve, reject) => {
        const existed = this.textureCache.get(this.config.url);
        if (existed) {
          resolve(existed);
        } else {
          const image = new Image();
          image.crossOrigin = 'Anonymous';
          image.src = this.config.url;
          image.onload = () => {
            const texture = this.engine.createTexture2D({
              ...this.config,
              data: image,
              width: image.width,
              height: image.height,
              flipY: true,
            });
            this.textureCache.set(this.config.url, texture);
            this.texture = texture;
            this.loaded = true;
            resolve(texture);
          };
          image.onerror = () => {
            reject();
          };
        }
      });
    } else {
      this.loaded = true;
      this.texture = this.engine.createTexture2D(this.config);
      return this.texture;
    }
  }
}
