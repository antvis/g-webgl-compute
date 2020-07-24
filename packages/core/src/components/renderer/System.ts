import { inject, injectable, named } from 'inversify';
import { IConfigService } from '../..';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { FrameGraphSystem } from '../framegraph/System';
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

  public async execute() {
    if (!this.configService.get().engineOptions?.supportCompute) {
      const {
        setup: setupPixelPickingPass,
        execute: executePixelPickingPass,
      } = this.renderPassFactory<PixelPickingPassData>(
        PixelPickingPass.IDENTIFIER,
      );
      const pixelPickingPass = this.frameGraphSystem.addPass<
        PixelPickingPassData
      >(
        PixelPickingPass.IDENTIFIER,
        setupPixelPickingPass,
        executePixelPickingPass,
      );

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
      } = this.renderPassFactory<CopyPassData>(CopyPass.IDENTIFIER);
      const copyPass = this.frameGraphSystem.addPass<CopyPassData>(
        CopyPass.IDENTIFIER,
        setupCopyPass,
        executeCopyPass,
      );

      this.frameGraphSystem.present(copyPass.data.output);
    }
  }
}
