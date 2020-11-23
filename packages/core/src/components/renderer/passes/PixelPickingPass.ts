import { inject, injectable, named } from 'inversify';
import { ComponentManager } from '../../../ComponentManager';
import { IDENTIFIER } from '../../../identifier';
import { decodePickingColor } from '../../../utils/math';
import { FrameGraphHandle } from '../../framegraph/FrameGraphHandle';
import { FrameGraphPass } from '../../framegraph/FrameGraphPass';
import { PassNode } from '../../framegraph/PassNode';
import { ResourcePool } from '../../framegraph/ResourcePool';
import { FrameGraphSystem } from '../../framegraph/System';
import { MaterialComponent } from '../../material/MaterialComponent';
import { MeshComponent } from '../../mesh/MeshComponent';
import { IFramebuffer } from '../IFramebuffer';
import { IRendererService, IView } from '../IRendererService';
import { IRenderPass } from './IRenderPass';
import { RenderPass, RenderPassData } from './RenderPass';

export interface PixelPickingPassData {
  output: FrameGraphHandle;
}

const PickingStage = {
  NONE: 0.0,
  ENCODE: 1.0,
  HIGHLIGHT: 2.0,
};

/**
 * color-based picking
 * @see https://threejsfundamentals.org/threejs/lessons/threejs-picking.html
 */
@injectable()
export class PixelPickingPass implements IRenderPass<PixelPickingPassData> {
  public static IDENTIFIER = 'PixelPicking Pass';

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  @inject(IDENTIFIER.ResourcePool)
  private readonly resourcePool: ResourcePool;

  @inject(IDENTIFIER.RenderPassFactory)
  private readonly renderPassFactory: <T>(name: string) => IRenderPass<T>;

  @inject(IDENTIFIER.MeshComponentManager)
  private readonly mesh: ComponentManager<MeshComponent>;

  private pickingFBO: IFramebuffer;
  private views: IView[];
  private highlightEnabled = true;
  private highlightColor = [255, 0, 0, 255];

  /**
   * 简单的 throttle，防止连续触发 hover 时导致频繁渲染到 picking framebuffer
   */
  private alreadyInRendering: boolean = false;

  public enableHighlight(enabled: boolean) {
    this.highlightEnabled = enabled;
  }

  public setHighlightColor(color: number[]) {
    this.highlightColor = color;
  }

  public setup = (
    fg: FrameGraphSystem,
    passNode: PassNode,
    pass: FrameGraphPass<PixelPickingPassData>,
  ): void => {
    const output = fg.createRenderTarget(passNode, 'picking fbo', {
      width: 1,
      height: 1,
    });

    pass.data = {
      output: passNode.write(fg, output),
    };

    // 防止被 FrameGraph 剔除
    passNode.hasSideEffect = true;
  };

  public execute = async (
    fg: FrameGraphSystem,
    pass: FrameGraphPass<PixelPickingPassData>,
    views: IView[],
  ): Promise<void> => {
    this.views = views;

    if (this.alreadyInRendering) {
      return;
    }

    for (const view of views) {
      const { width, height } = view.getViewport();
      // throttled
      this.alreadyInRendering = true;

      // 实例化资源
      const resourceNode = fg.getResourceNode(pass.data.output);
      this.pickingFBO = this.resourcePool.getOrCreateResource(
        resourceNode.resource,
      );

      // TODO: only draw 1x1 quad, with offset camera
      this.pickingFBO.resize({ width, height });
      this.engine.useFramebuffer(this.pickingFBO, () => {
        this.engine.clear({
          framebuffer: this.pickingFBO,
          color: [0, 0, 0, 0],
          stencil: 0,
          depth: 1,
        });

        // 渲染
        const renderPass = this.renderPassFactory<RenderPassData>(
          RenderPass.IDENTIFIER,
        );

        // 修改所有
        const meshes: MeshComponent[] = [];
        const scene = view.getScene();
        for (const meshEntity of scene.getEntities()) {
          const mesh = this.mesh.getComponentByEntity(meshEntity)!;
          const material = mesh.material;
          material.setUniform('u_PickingStage', PickingStage.ENCODE);
          meshes.push(mesh);
        }

        // @ts-ignore
        renderPass.renderView(view);
        meshes.forEach((mesh) => {
          const material = mesh.material;
          material.setUniform('u_PickingStage', PickingStage.HIGHLIGHT);
        });

        this.alreadyInRendering = false;
      });
    }
  };

  public pick = ({ x, y }: { x: number; y: number }, view: IView) => {
    const { readPixels, useFramebuffer } = this.engine;
    const { width, height } = view.getViewport();
    const xInDevicePixel = x * window.devicePixelRatio;
    const yInDevicePixel = y * window.devicePixelRatio;
    // const xInDevicePixel = x;
    // const yInDevicePixel = y;
    if (
      xInDevicePixel > width ||
      xInDevicePixel < 0 ||
      yInDevicePixel > height ||
      yInDevicePixel < 0
    ) {
      return;
    }

    let pickedColors: Uint8Array | undefined;
    let pickedFeatureIdx: number | undefined;
    useFramebuffer(this.pickingFBO, () => {
      // avoid realloc
      pickedColors = readPixels({
        x: Math.round(xInDevicePixel),
        // 视口坐标系原点在左上，而 WebGL 在左下，需要翻转 Y 轴
        y: Math.round(height - (y + 1) * window.devicePixelRatio),
        // y: Math.round(height - (y + 1)),
        width: 1,
        height: 1,
        data: new Uint8Array(1 * 1 * 4),
        framebuffer: this.pickingFBO,
      });

      if (
        pickedColors[0] !== 0 ||
        pickedColors[1] !== 0 ||
        pickedColors[2] !== 0
      ) {
        pickedFeatureIdx = decodePickingColor(pickedColors);

        if (this.highlightEnabled) {
          // 高亮
          this.highlightPickedFeature(pickedColors, view);
        }
      }
    });
    return pickedFeatureIdx;
  };

  /**
   * highlight 如果直接修改选中 feature 的 buffer，存在两个问题：
   * 1. 鼠标移走时无法恢复
   * 2. 无法实现高亮颜色与原始原色的 alpha 混合
   * 因此高亮还是放在 shader 中做比较好
   */
  private highlightPickedFeature(
    pickedColors: Uint8Array | undefined,
    view: IView,
  ) {
    if (pickedColors) {
      for (const meshEntity of view.getScene().getEntities()) {
        const mesh = this.mesh.getComponentByEntity(meshEntity)!;
        const material = mesh.material;
        material.setUniform('u_PickingStage', PickingStage.HIGHLIGHT);

        material.setUniform('u_PickingColor', [
          pickedColors[0],
          pickedColors[1],
          pickedColors[2],
        ]);
        material.setUniform('u_HighlightColor', this.highlightColor);
      }
    }
  }
}
