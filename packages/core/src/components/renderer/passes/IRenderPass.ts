import { FrameGraphPass } from '../../framegraph/FrameGraphPass';
import { PassNode } from '../../framegraph/PassNode';
import { FrameGraphSystem } from '../../framegraph/System';
import { IView } from '../IRendererService';

export interface IRenderPass<RenderPassData> {
  /**
   * 只声明虚拟资源及其读写关系，不进行具体资源 Texture | Framebuffer 的实例化
   */
  setup(
    fg: FrameGraphSystem,
    passNode: PassNode,
    pass: FrameGraphPass<RenderPassData>,
  ): void;

  /**
   * 调用渲染引擎服务完成虚拟资源的实例化
   */
  execute(
    fg: FrameGraphSystem,
    pass: FrameGraphPass<RenderPassData>,
    view: IView,
  ): Promise<void>;

  /**
   * 结束后清理
   */
  tearDown?(): void;
}
