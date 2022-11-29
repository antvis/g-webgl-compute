import {
  ConfigService,
  createEntity,
  IConfig,
  IConfigService,
  KernelBundle,
} from '@antv/g-webgpu-core';
import { WebGLEngine } from '@antv/g-webgpu-engine';
import { Kernel } from './Kernel';

export class World {
  public static create(config: Partial<IConfig> = {}) {
    const world = new World();
    world.setConfig(config);
    world.setEngine(new WebGLEngine());
    return world;
  }

  public engine: WebGLEngine;

  private readonly configService: IConfigService = new ConfigService();

  public setConfig(config: Partial<IConfig>) {
    this.configService.set(config);
  }
  public setEngine(engine: WebGLEngine) {
    this.engine = engine;
  }

  public createEntity() {
    return createEntity();
  }

  public createKernel(precompiledBundle: KernelBundle | string) {
    const kernel = new Kernel(this.engine, this.configService);
    if (typeof precompiledBundle === 'string') {
      kernel.setBundle(JSON.parse(precompiledBundle));
    } else {
      kernel.setBundle(precompiledBundle);
    }
    kernel.init();
    return kernel;
  }

  public destroy() {
    this.engine.destroy();
  }
}
