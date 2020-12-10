import { ITexture2D } from '@antv/g-webgpu-core';
import { injectable } from 'inversify';

@injectable()
export class TextureCache {
  private cache: Record<string, ITexture2D> = {};

  public get(name: string) {
    return this.cache[name];
  }

  public set(name: string, texture: ITexture2D) {
    this.cache[name] = texture;
  }
}
