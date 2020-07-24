import { inject, injectable } from 'inversify';
import { IFramebuffer } from '../..';
import { IDENTIFIER } from '../../identifier';
import { gl } from '../renderer/gl';
import { IRendererService } from '../renderer/IRendererService';
import { ResourceEntry } from './ResourceEntry';

@injectable()
export class ResourcePool {
  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  // 资源池
  private resourcePool: Record<string, IFramebuffer> = {};

  /**
   * 负责实例化虚拟资源，通过引擎服务
   * @param resource 虚拟资源
   */
  public getOrCreateResource(resource: ResourceEntry): IFramebuffer {
    if (!this.resourcePool[resource.name]) {
      const { width, height } = resource.descriptor;
      this.resourcePool[resource.name] = this.engine.createFramebuffer({
        color: this.engine.createTexture2D({
          width,
          height,
          wrapS: gl.CLAMP_TO_EDGE,
          wrapT: gl.CLAMP_TO_EDGE,
        }),
      });
    }

    return this.resourcePool[resource.name];
  }
}
