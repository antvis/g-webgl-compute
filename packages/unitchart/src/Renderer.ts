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
  private frameId: number;

  constructor(private options: IRendererOptions) {}

  public onHover = ({ x, y }: MouseEvent) => {
    // const { top, left } = this.options.canvas.getBoundingClientRect();
    // x -= left;
    // y -= top;
    // const featureId = this.world.pick({ x, y });
    // this.options.onPick({
    //   x,
    //   y,
    //   featureId,
    // });
  };

  public init() {
    this.world = World.create({
      canvas: this.options.canvas,
    });

    this.options.canvas.addEventListener('mousemove', this.onHover);
    // 对于所有布局生成顶点数据
    this.options.mark.buildAttributesForAllContainers(
      this.options.containerMap,
    );
  }

  public render({ layout }: { layout: string }) {
    // const targetContainer = this.options.containerMap[layout];
    // const {
    //   width: rootWidth,
    //   height: rootHeight,
    // } = targetContainer.visualspace;

    // const renderer = this.world.createRenderer();
    // const scene = this.world.createScene();
    // const camera = this.world
    //   .createCamera()
    //   .setPosition(0, 0, 2.5)
    //   .setPerspective(1, 10, 50, Math.abs(rootWidth / rootHeight));

    // const view = this.world
    //   .createView()
    //   .setCamera(camera)
    //   .setScene(scene)
    //   .setViewport({
    //     x: 0,
    //     y: 0,
    //     width: this.options.canvas.width,
    //     height: this.options.canvas.height,
    //   });

    // // this.options.mark.render(this.world, scene, targetContainer, layout);
    // const render = () => {
    //   this.options.mark.update();
    //   renderer.render(view);
    //   // this.frameId = window.requestAnimationFrame(render);
    // };

    // render();
  }

  public destroy() {
    window.cancelAnimationFrame(this.frameId);
    this.world.destroy();
  }
}
