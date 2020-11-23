import * as d3 from 'd3';
import { Container } from './Container';
import { DirectionType, ILayoutInitializationOptions, Layout } from './Layout';
import { IMarkInitializationOptions, Mark } from './Mark';
import { Renderer } from './Renderer';

export interface IChartInitializationOptions {
  canvas: HTMLCanvasElement;
  data: d3.DSVRowArray<string>;
  width: number;
  height: number;
  padding: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
  mark: IMarkInitializationOptions;
  layouts: Array<{
    name: string;
    layouts: ILayoutInitializationOptions[];
  }>;
  onPick: (
    item: d3.DSVRowString<string> | undefined,
    position: number[],
  ) => void;
}

export class Chart {
  private renderer: Renderer;

  private containerMap: Record<string, Container> = {};

  private $groupElList: HTMLDivElement[] = [];

  constructor(private options: IChartInitializationOptions) {}

  public init() {
    const rawData = [...this.options.data];
    rawData.forEach((d, i) => {
      d.$unitChartId = `${i}`;
    });

    this.options.layouts.forEach(({ name, layouts: ls }) => {
      const layouts = ls.map((layoutOptions) => new Layout(layoutOptions));
      layouts.forEach((layout, i, all) => {
        layout.setParent(i > 0 ? all[i - 1] : Layout.START_OF());
        layout.setChild(i < all.length - 1 ? all[i + 1] : Layout.END_OF());
      });

      const rootContainer = new Container({
        label: 'root',
        data: rawData,
        parent: undefined,
        children: undefined,
        visualspace: {
          width: this.options.width,
          height: this.options.height,
          posX: 0,
          posY: 0,
          padding: this.options.padding,
        },
      });

      rootContainer.applyLayout(layouts[0]);
      this.containerMap[name] = rootContainer;
    });

    this.renderer = new Renderer({
      canvas: this.options.canvas,
      containerMap: this.containerMap,
      mark: new Mark(this.options.mark),
      onPick: (e) => {
        const item = rawData.find(
          (d) => Number(d.$unitChartId) === e.featureId,
        );
        this.options.onPick(item, [e.x, e.y]);
      },
    });

    this.renderer.init();
  }

  public render(renderOptions: { layout: string }) {
    this.renderAxis(renderOptions);
    this.renderer.render(renderOptions);
  }

  public destroy() {
    this.renderer.destroy();
  }

  private renderAxis({ layout }: { layout: string }) {
    const canvasWrapper = this.options.canvas.parentElement;

    this.$groupElList.forEach((el) => canvasWrapper?.removeChild(el));
    this.$groupElList = [];

    this.containerMap[layout].children.forEach(({ label, visualspace }) => {
      const $groupEl = document.createElement('div');
      $groupEl.style.cssText = `position:absolute;top:${visualspace.posY +
        8}px;left:${visualspace.posX}px;`;
      const $groupNameEl = document.createTextNode(label);
      $groupEl.appendChild($groupNameEl);
      canvasWrapper?.appendChild($groupEl);

      this.$groupElList.push($groupEl);
    });
  }
}
