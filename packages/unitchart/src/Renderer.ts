import { World } from '@antv/g-webgpu';
import { Container } from './Container';
import { Mark } from './Mark';

export interface IRendererOptions {
  canvas: HTMLCanvasElement;
  containerMap: Record<string, Container>;
  mark: Mark;
  onPick: (event: {
    x: number;
    y: number;
    featureId: number | undefined;
  }) => void;
}

export class Renderer {
  private world: World;

  constructor(private options: IRendererOptions) {}

  public onHover = ({ x, y }: MouseEvent) => {
    const { top, left } = this.options.canvas.getBoundingClientRect();
    x -= left;
    y -= top;
    const featureId = this.world.pick({ x, y });
    this.options.onPick({
      x,
      y,
      featureId,
    });
  };

  public async init() {
    await new Promise((resolve) => {
      this.world = new World({
        canvas: this.options.canvas,
        onInit: () => {
          this.world.setSize(600, 600);
          resolve();
        },
        onUpdate: () => {
          this.options.mark.update();
        },
      });
    });

    this.options.canvas.addEventListener('mousemove', this.onHover);
    // 对于所有布局生成顶点数据
    this.options.mark.buildAttributesForAllContainers(
      this.options.containerMap,
    );
  }

  public render({ layout }: { layout: string }) {
    const targetContainer = this.options.containerMap[layout];
    const {
      width: rootWidth,
      height: rootHeight,
    } = targetContainer.visualspace;

    // create a camera
    const camera = this.world.createCamera({
      aspect: Math.abs(rootWidth / rootHeight),
      angle: 50,
      far: 10,
      near: 1,
    });
    this.world.getCamera(camera)!.setPosition(0, 0, 2.5);

    // create a scene
    const scene = this.world.createScene({ camera });

    this.options.mark.render(this.world, scene, targetContainer, layout);
  }

  public destroy() {
    this.world.destroy();
  }
}
