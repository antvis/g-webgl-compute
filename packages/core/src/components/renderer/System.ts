import { inject, injectable, named } from 'inversify';
import { IConfigService } from '../..';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { ResourcePool } from '../framegraph/ResourcePool';
import { FrameGraphSystem } from '../framegraph/System';
import { IView } from './IRendererService';
import { CopyPass, CopyPassData } from './passes/CopyPass';
import { IRenderPass } from './passes/IRenderPass';
import {
  PixelPickingPass,
  PixelPickingPassData,
} from './passes/PixelPickingPass';
import { RenderPass, RenderPassData } from './passes/RenderPass';

@injectable()
export class RendererSystem implements ISystem {
  @inject(IDENTIFIER.Systems)
  @named(IDENTIFIER.FrameGraphSystem)
  private readonly frameGraphSystem: FrameGraphSystem;

  @inject(IDENTIFIER.RenderPassFactory)
  private readonly renderPassFactory: <T>(name: string) => IRenderPass<T>;

  @inject(IDENTIFIER.ConfigService)
  private readonly configService: IConfigService;

  @inject(IDENTIFIER.ResourcePool)
  private readonly resourcePool: ResourcePool;

  public async execute(views: IView[]) {
    // const pixelPickingPass = this.renderPassFactory<PixelPickingPassData>(
    //   PixelPickingPass.IDENTIFIER,
    // );
    // const {
    //   setup: setupPixelPickingPass,
    //   execute: executePixelPickingPass,
    //   tearDown: tearDownPickingPass,
    // } = pixelPickingPass;
    // this.frameGraphSystem.addPass<PixelPickingPassData>(
    //   PixelPickingPass.IDENTIFIER,
    //   setupPixelPickingPass,
    //   executePixelPickingPass,
    //   tearDownPickingPass,
    // );

    const {
      setup: setupRenderPass,
      execute: executeRenderPass,
    } = this.renderPassFactory<RenderPassData>(RenderPass.IDENTIFIER);
    const renderPass = this.frameGraphSystem.addPass<RenderPassData>(
      RenderPass.IDENTIFIER,
      setupRenderPass,
      executeRenderPass,
    );

    const {
      setup: setupCopyPass,
      execute: executeCopyPass,
      tearDown: tearDownCopyPass,
    } = this.renderPassFactory<CopyPassData>(CopyPass.IDENTIFIER);
    const copyPass = this.frameGraphSystem.addPass<CopyPassData>(
      CopyPass.IDENTIFIER,
      setupCopyPass,
      executeCopyPass,
      tearDownCopyPass,
    );

    this.frameGraphSystem.present(copyPass.data.output);
    // this.frameGraphSystem.present(renderPass.data.output);
  }

  public tearDown() {
    this.resourcePool.clean();
  }

  public pick(position: { x: number; y: number }, view: IView) {
    const pickingPass = this.renderPassFactory<PixelPickingPassData>(
      PixelPickingPass.IDENTIFIER,
    ) as PixelPickingPass;

    return pickingPass.pick(position, view);
  }
}
