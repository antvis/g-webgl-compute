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

    // this.renderer.init();
  }

  public render(renderOptions: { layout: string }) {
    this.renderAxis(renderOptions);
    // this.renderer.render(renderOptions);
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

  // private getSharingAncestorContainer(
  //   container: Container,
  //   layout: Layout,
  //   item: 'subgroup' | 'size',
  // ): Container {
  //   if (layout.type === 'flatten') {
  //     return container;
  //   }

  //   if (layout[item] && layout[item].isShared) {
  //     if (container.parent !== undefined) {
  //       return this.getSharingAncestorContainer(
  //         container.parent,
  //         layout.getParent(),
  //         item,
  //       );
  //     }
  //   }
  //   return container;
  // }

  // private applyLayout(containerList: Container[], layout: Layout) {
  //   let childContainers: Container[] = [];
  //   let newSizeSharingAncestor;
  //   let oldSizeSharingAncestor = this.getSharingAncestorContainer(
  //     containerList[0],
  //     layout,
  //     'size',
  //   );

  //   containerList.forEach((container) => {
  //     newSizeSharingAncestor = this.getSharingAncestorContainer(
  //       container,
  //       layout,
  //       'size',
  //     );
  //     if (newSizeSharingAncestor !== oldSizeSharingAncestor) {
  //       this.applySharedSize(layout);
  //       oldSizeSharingAncestor = newSizeSharingAncestor;
  //     }

  //     const newContainers = this.makeContainers(container, layout)!;

  //     if (newContainers.length > 0) {
  //       this.calcVisualSpace(container, newContainers, layout);
  //     }
  //     container.contents = newContainers;
  //     this.handleSharedSize(container, layout);
  //     childContainers = childContainers.concat(newContainers);
  //   });

  //   this.applySharedSize(layout);

  //   return childContainers;
  // }

  // private handleSharedSize(container: Container, layout: Layout) {
  //   if (layout.size.isShared) {
  //     if (!layout.hasOwnProperty('sizeSharingGroup')) {
  //       layout.sizeSharingGroup = [];
  //     }
  //     layout.sizeSharingGroup = layout.sizeSharingGroup.concat(
  //       container.contents,
  //     );
  //   }
  // }

  // private makeContainers(container: Container, layout: Layout) {
  //   const sharingAncestorContainer = this.getSharingAncestorContainer(
  //     container,
  //     layout,
  //     'subgroup',
  //   );

  //   const sharingDomain = this.getSharingDomain(sharingAncestorContainer);
  //   let childContainers;

  //   if (layout.subgroup) {
  //     switch (layout.subgroup.type) {
  //       case 'groupby':
  //         childContainers = this.makeContainersForCategoricalVar(
  //           sharingDomain,
  //           container,
  //           layout,
  //         );
  //         break;
  //       // case 'bin':
  //       //   childContainers = makeContainersForNumericalVar(
  //       //     sharingDomain,
  //       //     container,
  //       //     layout,
  //       //   );
  //       //   break;
  //       // case 'passthrough':
  //       //   childContainers = makeContainersForPassthrough(container, layout);
  //       //   break;
  //       case 'flatten':
  //         childContainers = this.makeContainersForFlatten(container, layout);
  //         break;
  //     }
  //   }

  //   return childContainers;
  // }

  // private applySharedSize(layout: Layout) {
  //   if (layout.isEndOf() || layout.size.isShared !== true) {
  //     return;
  //   }

  //   this.makeSharedSize(layout);
  //   layout.sizeSharingGroup = [];
  // }

  // private makeSharedSize(layout: Layout) {
  //   switch (layout.aspectRatio) {
  //     case 'fillX':
  //     case 'fillY':
  //       this.makeSharedSizeFill(layout);
  //       break;
  //     case 'square':
  //     case 'parent':
  //     case 'custom':
  //     case 'maxfill':
  //       this.makeSharedSizePack(layout);
  //       break;
  //   }
  // }

  // private makeSharedSizeFill(layout: Layout) {
  //   const minUnit = this.getMinUnitAmongContainers(layout);
  //   this.applySharedUnitOnContainers(minUnit, layout);
  // }

  // private makeSharedSizePack(layout: Layout) {
  //   if (layout.size.type === 'uniform') {
  //     const minSize = this.getMinAmongContainers(layout);
  //     this.applySharedSizeOnContainers(minSize!, layout);
  //   } else {
  //     const minUnit = this.getMinUnitAmongContainers(layout);
  //     this.applySharedUnitOnContainers(minUnit, layout);
  //   }
  // }

  // private getMinUnitAmongContainers(layout: Layout) {
  //   const parentContainers = this.getParents(layout.sizeSharingGroup);

  //   let minUnit = Number.MAX_VALUE;
  //   parentContainers.forEach((c) => {
  //     const availableSpace = this.getAvailableSpace(c, layout);
  //     const unit = this.getUnit(availableSpace, c.contents, layout);
  //     if (unit < minUnit) {
  //       minUnit = unit;
  //     }
  //   });
  //   return minUnit;
  // }

  // private getMinAmongContainers(layout: Layout) {
  //   const sharedContainers = layout.sizeSharingGroup;
  //   let minSizeItemIndex;

  //   switch (layout.aspectRatio) {
  //     case 'square':
  //     case 'parent':
  //     case 'custom':
  //       minSizeItemIndex = d3.scan(sharedContainers, (a, b) => {
  //         return a.visualspace.width - b.visualspace.width;
  //       })!;
  //       return {
  //         width: sharedContainers[minSizeItemIndex].visualspace.width,
  //         height: sharedContainers[minSizeItemIndex].visualspace.height,
  //       };
  //       break;
  //     case 'maxfill':
  //       const tempMinorSide = sharedContainers.map((d) => {
  //         return d.visualspace.width > d.visualspace.height
  //           ? d.visualspace.height
  //           : d.visualspace.width;
  //       });
  //       minSizeItemIndex = d3.scan(tempMinorSide, (a, b) => {
  //         return a - b;
  //       });

  //       const minContainer = sharedContainers.reduce((pre, cur) => {
  //         let minPre;
  //         let maxPre;
  //         let minCur;
  //         let maxCur;

  //         if (pre.visualspace.height > pre.visualspace.width) {
  //           minPre = pre.visualspace.width;
  //           maxPre = pre.visualspace.height;
  //         } else {
  //           minPre = pre.visualspace.height;
  //           maxPre = pre.visualspace.width;
  //         }

  //         if (cur.visualspace.height > cur.visualspace.width) {
  //           minCur = cur.visualspace.width;
  //           maxCur = cur.visualspace.height;
  //         } else {
  //           minCur = cur.visualspace.height;
  //           maxCur = cur.visualspace.width;
  //         }

  //         if (minCur < minPre) {
  //           return cur;
  //         } else if (minCur === minPre) {
  //           if (maxCur < maxPre) {
  //             return cur;
  //           }
  //         }
  //         return pre;
  //       });

  //       return {
  //         width: minContainer.visualspace.width,
  //         height: minContainer.visualspace.height,
  //       };
  //   }
  // }

  // private getAvailableSpace(container: Container, layout: Layout) {
  //   let width;
  //   let height;
  //   switch (layout.aspectRatio) {
  //     case 'fillX':
  //       return (
  //         container.visualspace.width -
  //         container.visualspace.padding.left -
  //         container.visualspace.padding.right
  //       );
  //     case 'fillY':
  //       return (
  //         container.visualspace.height -
  //         container.visualspace.padding.top -
  //         container.visualspace.padding.bottom
  //       );
  //     case 'maxfill':
  //     case 'parent':
  //       width =
  //         container.visualspace.width -
  //         container.visualspace.padding.left -
  //         container.visualspace.padding.right;
  //       height =
  //         container.visualspace.height -
  //         container.visualspace.padding.top -
  //         container.visualspace.padding.bottom;
  //       return width * height;
  //     case 'square':
  //       width =
  //         container.visualspace.width -
  //         container.visualspace.padding.left -
  //         container.visualspace.padding.right;
  //       height =
  //         container.visualspace.height -
  //         container.visualspace.padding.top -
  //         container.visualspace.padding.bottom;
  //       return Math.pow(Math.min(width, height), 2);
  //   }
  //   return 0;
  // }

  // private getParents(containers: Container[]) {
  //   const mySet = new Set<Container>();

  //   containers.forEach((d) => {
  //     if (d.parent) {
  //       mySet.add(d.parent);
  //     }
  //   });

  //   return Array.from<Container>(mySet);
  // }

  // private getUnit(
  //   availableSpace: number,
  //   childContainers: Container[],
  //   layout: Layout,
  // ) {
  //   const sum = childContainers.reduce((cur, prev) => {
  //     return cur + this.getValue(prev, layout);
  //   }, 0);
  //   return availableSpace / sum;
  // }

  // private getValue(container: Container, layout: Layout) {
  //   switch (layout.size.type) {
  //     case 'uniform':
  //       return 1;
  //     case 'sum':
  //       return d3.sum(container.contents, (d) => {
  //         // @ts-ignore
  //         return d[layout.size.key];
  //       });
  //     case 'count':
  //       return container.contents.length;
  //   }
  //   return 1;
  // }

  // private applySharedUnitOnContainers(minUnit: number, layout: Layout) {
  //   this.getParents(layout.sizeSharingGroup).forEach((d) => {
  //     switch (layout.aspectRatio) {
  //       case 'fillX':
  //       case 'fillY':
  //         this.calcFillGridxyVisualSpaceWithUnitLength(
  //           d,
  //           d.contents,
  //           layout,
  //           minUnit,
  //         );
  //         break;
  //       case 'square':
  //       case 'parent':
  //       case 'custom':
  //       case 'maxfill':
  //         this.calcPackGridxyVisualSpaceWithUnitLength(
  //           d,
  //           d.contents,
  //           layout,
  //           minUnit,
  //         );
  //     }
  //   });
  // }

  // private calcFillGridxyVisualSpaceWithUnitLength(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  //   unitLength: number,
  // ) {
  //   const parentVisualSpace = parentContainer.visualspace;
  //   if (layout.aspectRatio === 'fillX') {
  //     const unitWidth = unitLength;
  //     childContainers.forEach((c) => {
  //       c.visualspace.width =
  //         unitWidth * this.getValue(c, layout) -
  //         layout.margin.left -
  //         layout.margin.right;

  //       c.visualspace.height =
  //         parentVisualSpace.height -
  //         parentVisualSpace.padding.top -
  //         parentVisualSpace.padding.bottom -
  //         layout.margin.top -
  //         layout.margin.bottom;

  //       c.visualspace.posY = parentVisualSpace.padding.top + layout.margin.top;

  //       c.visualspace.padding = layout.padding;
  //     });

  //     this.getPosXforFillX(parentVisualSpace, layout, childContainers);
  //   } else if (layout.aspectRatio === 'fillY') {
  //     const unitHeight = unitLength;
  //     childContainers.forEach((c) => {
  //       c.visualspace.height =
  //         unitHeight * this.getValue(c, layout) -
  //         layout.margin.top -
  //         layout.margin.bottom;

  //       c.visualspace.width =
  //         parentVisualSpace.width -
  //         parentVisualSpace.padding.left -
  //         parentVisualSpace.padding.right -
  //         layout.margin.left -
  //         layout.margin.right;

  //       c.visualspace.posX =
  //         parentVisualSpace.padding.left + layout.margin.left;

  //       c.visualspace.padding = layout.padding;
  //     });

  //     this.getPosYforFillY(parentVisualSpace, layout, childContainers);
  //   } else {
  //     // TODO: other aspectRatios
  //   }
  // }

  // private getPosXforFillX(
  //   parentVisualspace: {
  //     width: number;
  //     height: number;
  //     posX: number;
  //     posY: number;
  //     padding: {
  //       top: number;
  //       left: number;
  //       bottom: number;
  //       right: number;
  //     };
  //   },
  //   layout: Layout,
  //   childContainers: Container[],
  // ) {
  //   let start: number;
  //   let direction: number;
  //   let offset: number;
  //   switch (layout.direction) {
  //     case 'LRTB':
  //     case 'LRBT':
  //     case 'TBLR':
  //     case 'BTLR':
  //     case 'LR':
  //       start = 0;
  //       direction = 1;
  //       break;
  //     case 'RLBT':
  //     case 'RLTB':
  //     case 'BTRL':
  //     case 'TBRL':
  //     case 'RL':
  //       start = childContainers.length - 1;
  //       direction = -1;
  //       break;
  //     default:
  //   }

  //   const totalwidth = childContainers.reduce((cur, c) => {
  //     return (
  //       cur + c.visualspace.width + layout.margin.left + layout.margin.right
  //     );
  //   }, 0);

  //   switch (layout.align) {
  //     case 'left':
  //     case 'LT':
  //     case 'LM':
  //     case 'LB':
  //       offset = parentVisualspace.padding.left;
  //       break;
  //     case 'center':
  //     case 'CT':
  //     case 'CM':
  //     case 'CB':
  //       offset =
  //         parentVisualspace.padding.left +
  //         (parentVisualspace.width -
  //           parentVisualspace.padding.left -
  //           parentVisualspace.padding.right) /
  //           2 -
  //         totalwidth / 2;
  //       break;
  //     case 'right':
  //     case 'RT':
  //     case 'RM':
  //     case 'RB':
  //       offset =
  //         parentVisualspace.width -
  //         parentVisualspace.padding.right -
  //         totalwidth;
  //       break;
  //   }

  //   childContainers.forEach((c, i, all) => {
  //     const index = start + direction * i;
  //     if (i === 0) {
  //       all[index].visualspace.posX = offset + layout.margin.left;
  //     } else {
  //       all[index].visualspace.posX =
  //         all[index - direction].visualspace.posX +
  //         all[index - direction].visualspace.width +
  //         layout.margin.right +
  //         layout.margin.left;
  //     }
  //   });
  // }

  // private getPosYforFillY(
  //   parentVisualspace: {
  //     width: number;
  //     height: number;
  //     posX: number;
  //     posY: number;
  //     padding: {
  //       top: number;
  //       left: number;
  //       bottom: number;
  //       right: number;
  //     };
  //   },
  //   layout: Layout,
  //   childContainers: Container[],
  // ) {
  //   let start: number;
  //   let direction: number;
  //   let offset: number;
  //   switch (layout.direction) {
  //     case 'LRTB':
  //     case 'RLTB':
  //     case 'TBLR':
  //     case 'TBRL':
  //     case 'TB':
  //       start = 0;
  //       direction = 1;
  //       break;
  //     case 'LRBT':
  //     case 'RLBT':
  //     case 'BTLR':
  //     case 'BTRL':
  //     case 'BT':
  //       start = childContainers.length - 1;
  //       direction = -1;
  //       break;
  //     default:
  //   }

  //   const totalheight = childContainers.reduce((cur, c) => {
  //     return (
  //       cur + c.visualspace.height + layout.margin.top + layout.margin.bottom
  //     );
  //   }, 0);

  //   switch (layout.align) {
  //     case 'top':
  //     case 'RT':
  //     case 'CT':
  //     case 'LT':
  //       offset = parentVisualspace.padding.top;
  //       break;
  //     case 'middle':
  //     case 'LM':
  //     case 'RM':
  //     case 'CM':
  //       offset =
  //         parentVisualspace.padding.top +
  //         (parentVisualspace.height -
  //           parentVisualspace.padding.top -
  //           parentVisualspace.padding.bottom) /
  //           2 -
  //         totalheight / 2;
  //       break;
  //     case 'bottom':
  //     case 'LB':
  //     case 'CB':
  //     case 'RB':
  //       offset =
  //         parentVisualspace.height -
  //         parentVisualspace.padding.bottom -
  //         totalheight;
  //       break;
  //   }

  //   childContainers.forEach((c, i, all) => {
  //     const index = start + direction * i;
  //     if (i === 0) {
  //       all[index].visualspace.posY = offset + layout.margin.top;
  //     } else {
  //       all[index].visualspace.posY =
  //         all[index - direction].visualspace.posY +
  //         all[index - direction].visualspace.height +
  //         layout.margin.bottom +
  //         layout.margin.top;
  //     }
  //   });
  // }

  // private calcPackGridxyVisualSpaceWithUnitLength(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  //   unitLength: number,
  // ) {
  //   switch (layout.aspectRatio) {
  //     case 'square':
  //       childContainers.forEach((c, i, all) => {
  //         c.visualspace.width = Math.sqrt(
  //           unitLength * this.getValue(c, layout),
  //         );
  //         c.visualspace.height = Math.sqrt(
  //           unitLength * this.getValue(c, layout),
  //         );
  //         c.visualspace.posX =
  //           parentContainer.visualspace.padding.left +
  //           layout.margin.left +
  //           0.5 *
  //             (parentContainer.visualspace.width -
  //               c.visualspace.width -
  //               parentContainer.visualspace.padding.left -
  //               parentContainer.visualspace.padding.right);
  //         c.visualspace.posY =
  //           parentContainer.visualspace.padding.top +
  //           layout.margin.top +
  //           0.5 *
  //             (parentContainer.visualspace.height -
  //               c.visualspace.height -
  //               parentContainer.visualspace.padding.top -
  //               parentContainer.visualspace.padding.right);
  //       });
  //   }
  // }

  // private applySharedSizeOnContainers(
  //   minSize: {
  //     width: number;
  //     height: number;
  //   },
  //   layout: Layout,
  // ) {
  //   this.getParents(layout.sizeSharingGroup).forEach((c) => {
  //     const edgeInfo = this.buildEdgeInfoFromMinSize(c, minSize, layout);
  //     this.applyEdgeInfo(c, c.contents, layout, edgeInfo);
  //   });
  // }

  // private buildEdgeInfoFromMinSize(
  //   parentContainer: Container,
  //   minSize: {
  //     width: number;
  //     height: number;
  //   },
  //   layout: Layout,
  // ) {
  //   const horizontalRepetitionCount = Math.floor(
  //     parentContainer.visualspace.width / minSize.width,
  //   );
  //   const verticalRepetitionCount = Math.floor(
  //     parentContainer.visualspace.height / minSize.height,
  //   );
  //   return this.buildEdgeInfoByDirection(
  //     horizontalRepetitionCount,
  //     verticalRepetitionCount,
  //     minSize.width,
  //     minSize.height,
  //     layout,
  //   );
  // }

  // private buildEdgeInfoByDirection(
  //   horizontalRepetitionCount: number,
  //   verticalRepetitionCount: number,
  //   width: number,
  //   height: number,
  //   layout: Layout,
  // ) {
  //   let fillingEdgeRepetitionCount;
  //   let remainingEdgeRepetitionCount;
  //   let fillingEdgeSideUnitLength;
  //   let remainingEdgeSideUnitLength;

  //   if (this.isVerticalDirection(layout.direction)) {
  //     fillingEdgeRepetitionCount = horizontalRepetitionCount;
  //     remainingEdgeRepetitionCount = verticalRepetitionCount;
  //     fillingEdgeSideUnitLength = width;
  //     remainingEdgeSideUnitLength = height;
  //   } else {
  //     fillingEdgeRepetitionCount = verticalRepetitionCount;
  //     remainingEdgeRepetitionCount = horizontalRepetitionCount;
  //     fillingEdgeSideUnitLength = height;
  //     remainingEdgeSideUnitLength = width;
  //   }
  //   return {
  //     fillingEdgeRepetitionCount,
  //     remainingEdgeRepetitionCount,
  //     fillingEdgeSideUnitLength,
  //     remainingEdgeSideUnitLength,
  //   };
  // }

  // private isVerticalDirection(direction: DirectionType) {
  //   switch (direction) {
  //     case 'LRBT':
  //     case 'LRTB':
  //     case 'RLBT':
  //     case 'RLTB':
  //       return true;
  //     case 'BTLR':
  //     case 'BTRL':
  //     case 'TBLR':
  //     case 'TBRL':
  //       return false;
  //   }
  // }

  // private applyEdgeInfo(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  //   edgeInfo: {
  //     fillingEdgeRepetitionCount: number;
  //     remainingEdgeRepetitionCount: number;
  //     fillingEdgeSideUnitLength: number;
  //     remainingEdgeSideUnitLength: number;
  //   },
  // ) {
  //   if (this.isVerticalDirection(layout.direction)) {
  //     this.applyEdgeInfoVerticalDirection(
  //       parentContainer,
  //       childContainers,
  //       layout,
  //       edgeInfo,
  //     );
  //   } else {
  //     this.applyEdgeInfoHorizontalDirection(
  //       parentContainer,
  //       childContainers,
  //       layout,
  //       edgeInfo,
  //     );
  //   }
  // }

  // private applyEdgeInfoHorizontalDirection(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  //   edgeInfo: {
  //     fillingEdgeRepetitionCount: number;
  //     remainingEdgeRepetitionCount: number;
  //     fillingEdgeSideUnitLength: number;
  //     remainingEdgeSideUnitLength: number;
  //   },
  // ) {
  //   let xOrig: number;
  //   let yOrig: number;
  //   let xInc: number;
  //   let yInc: number;
  //   let numVerticalElement: number;

  //   switch (layout.direction) {
  //     case 'TBLR':
  //       xOrig = 0;
  //       yOrig = 0;
  //       xInc = edgeInfo.remainingEdgeSideUnitLength;
  //       yInc = edgeInfo.fillingEdgeSideUnitLength;
  //       numVerticalElement = edgeInfo.fillingEdgeRepetitionCount;
  //       break;
  //     case 'BTLR':
  //       xOrig = 0;
  //       yOrig =
  //         parentContainer.visualspace.height -
  //         edgeInfo.remainingEdgeSideUnitLength;
  //       xInc = edgeInfo.remainingEdgeSideUnitLength;
  //       yInc = -1.0 * edgeInfo.fillingEdgeSideUnitLength;
  //       numVerticalElement = edgeInfo.fillingEdgeRepetitionCount;
  //       break;
  //     case 'TBRL':
  //     case 'BTRL':
  //       break;
  //   }

  //   childContainers.forEach((c, i, all) => {
  //     c.visualspace.width = edgeInfo.remainingEdgeSideUnitLength;
  //     c.visualspace.height = edgeInfo.fillingEdgeSideUnitLength;
  //     c.visualspace.posX = xOrig + xInc * Math.floor(i / numVerticalElement);
  //     c.visualspace.posY = yOrig + yInc * (i % numVerticalElement);
  //     c.visualspace.padding = layout.padding;
  //   });
  // }

  // private applyEdgeInfoVerticalDirection(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  //   edgeInfo: {
  //     fillingEdgeRepetitionCount: number;
  //     remainingEdgeRepetitionCount: number;
  //     fillingEdgeSideUnitLength: number;
  //     remainingEdgeSideUnitLength: number;
  //   },
  // ) {
  //   let xOrig: number;
  //   let yOrig: number;
  //   let xInc: number;
  //   let yInc: number;
  //   let numHoriElement: number;

  //   switch (layout.direction) {
  //     case 'LRTB':
  //       xOrig = 0;
  //       yOrig = 0;
  //       xInc = edgeInfo.fillingEdgeSideUnitLength;
  //       yInc = edgeInfo.remainingEdgeSideUnitLength;
  //       numHoriElement = edgeInfo.fillingEdgeRepetitionCount;
  //       break;
  //     case 'LRBT':
  //       xOrig = 0;
  //       yOrig =
  //         parentContainer.visualspace.height -
  //         edgeInfo.remainingEdgeSideUnitLength;
  //       xInc = edgeInfo.fillingEdgeSideUnitLength;
  //       yInc = -1.0 * edgeInfo.remainingEdgeSideUnitLength;
  //       numHoriElement = edgeInfo.fillingEdgeRepetitionCount;
  //       break;
  //     case 'RLBT':
  //     case 'RLTB':
  //       break;
  //   }

  //   childContainers.forEach((c, i, all) => {
  //     c.visualspace.width = edgeInfo.fillingEdgeSideUnitLength;
  //     c.visualspace.height = edgeInfo.remainingEdgeSideUnitLength;
  //     c.visualspace.posX = xOrig + xInc * (i % numHoriElement);
  //     c.visualspace.posY = yOrig + yInc * Math.floor(i / numHoriElement);
  //     c.visualspace.padding = layout.padding;
  //   });
  // }

  // private getSharingDomain(container: Container): Container[] {
  //   if (this.isContainer(container)) {
  //     const leafs: Container[] = [];
  //     container.contents.forEach((c) => {
  //       const newLeaves = this.getSharingDomain(c);
  //       newLeaves.forEach((d) => {
  //         leafs.push(d);
  //       });
  //     });
  //     return leafs;
  //   } else {
  //     return [container];
  //   }
  // }

  // private isContainer(container: Container) {
  //   if (
  //     container.hasOwnProperty('contents') &&
  //     container.hasOwnProperty('visualspace') &&
  //     container.hasOwnProperty('parent')
  //   ) {
  //     return true;
  //   }
  //   return false;
  // }

  // private getKeys(data: unknown, groupby: string) {
  //   const myNest = d3
  //     .nest()
  //     .key((d) => {
  //       return d[groupby];
  //     })
  //     .entries(data);
  //   return myNest.map((d) => {
  //     return d.key;
  //   });
  // }

  // private emptyContainersFromKeys(data: unknown, groupby: string): Container[] {
  //   return this.getKeys(data, groupby).map((key) => {
  //     // @ts-ignore
  //     return new Container({
  //       contents: [],
  //       label: key,
  //       visualspace: {
  //         width: 0,
  //         height: 0,
  //         posX: 0,
  //         posY: 0,
  //         padding: {
  //           top: 0,
  //           left: 0,
  //           bottom: 0,
  //           right: 0,
  //         },
  //       },
  //     });
  //   });
  // }

  // private makeContainersForCategoricalVar(
  //   sharingDomain: Container[],
  //   container: Container,
  //   layout: Layout,
  // ): Container[] {
  //   const newContainers = this.emptyContainersFromKeys(
  //     sharingDomain,
  //     layout.subgroup.key,
  //   );
  //   newContainers.forEach((c) => {
  //     c.contents = container.contents.filter((d) => {
  //       // @ts-ignore
  //       return d[layout.subgroup.key] === c.label;
  //     });
  //     c.parent = container;
  //   });
  //   return newContainers;
  // }

  // private makeContainersForFlatten(container: Container, layout: Layout) {
  //   const leaves = container.contents.map((c, i) => {
  //     // @ts-ignore
  //     return new Container({
  //       contents: [c],
  //       label: `${i}`,
  //       visualspace: {
  //         width: 0,
  //         height: 0,
  //         posX: 0,
  //         posY: 0,
  //         padding: {
  //           top: 0,
  //           left: 0,
  //           bottom: 0,
  //           right: 0,
  //         },
  //       },
  //       parent: container,
  //     });
  //   });

  //   if (layout.hasOwnProperty('sort')) {
  //     leaves.sort((a, b) => {
  //       // @ts-ignore
  //       let Avalue = a.contents[0][layout.sort.key];
  //       // @ts-ignore
  //       let Bvalue = b.contents[0][layout.sort.key];

  //       if (layout.sort.type === 'numerical') {
  //         Avalue = Number(Avalue);
  //         Bvalue = Number(Bvalue);
  //       }

  //       const ascending = layout.sort.direction === 'ascending' ? 1 : -1;

  //       return Avalue > Bvalue ? ascending : -1 * ascending;
  //     });
  //   }

  //   return leaves;
  // }

  // private calcVisualSpace(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  // ) {
  //   layout.containers = childContainers;

  //   switch (layout.type) {
  //     case 'gridxy':
  //       this.calcGridxyVisualSpace(parentContainer, childContainers, layout);
  //       break;
  //     default:
  //     // TODO: other types
  //   }
  // }

  // private calcGridxyVisualSpace(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  // ) {
  //   switch (layout.aspectRatio) {
  //     case 'fillX':
  //     case 'fillY':
  //       this.calcFillGridxyVisualSpace(
  //         parentContainer,
  //         childContainers,
  //         layout,
  //       );
  //       break;
  //     case 'square':
  //     case 'parent':
  //     case 'custom':
  //       this.calcPackGridxyVisualSpace(
  //         parentContainer,
  //         childContainers,
  //         layout,
  //       );
  //       break;
  //     case 'maxfill':
  //       this.calcPackGridxyMaxFillVisualSpace(
  //         parentContainer,
  //         childContainers,
  //         layout,
  //       );
  //   }
  // }

  // private calcPackGridxyMaxFillVisualSpace(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  // ) {
  //   if (layout.size.type === 'uniform') {
  //     this.calcPackGridxyMaxFillVisualSpaceUniform(
  //       parentContainer,
  //       childContainers,
  //       layout,
  //     );
  //   } else {
  //     // TODO:
  //     // this.calcPackGridxyMaxFillVisualSpaceFunction(
  //     //   parentContainer,
  //     //   childContainers,
  //     //   layout,
  //     // );
  //   }
  // }

  // // private calcPackGridxyMaxFillVisualSpaceFunction(
  // //   parentContainer: Container,
  // //   childContainers: Container[],
  // //   layout: Layout,
  // // ) {
  // //   childContainers = childContainers.filter((d) => {
  // //     return Number(d.contents[0][layout.size.key] > 0);
  // //   });

  // //   childContainers.sort(function(c, d) {
  // //     return d.contents[0][layout.size.key] - c.contents[0][layout.size.key];
  // //   });

  // //   const data = childContainers.map(function(d) {
  // //     return Number(d.contents[0][layout.size.key]);
  // //   });

  // //   const coord = Treemap.generate(
  // //     data,
  // //     parentContainer.visualspace.width,
  // //     parentContainer.visualspace.height,
  // //   );

  // //   childContainers.forEach((c, i) => {
  // //     const rect = coord[i];
  // //     c.visualspace.width = rect[2] - rect[0];
  // //     c.visualspace.height = rect[3] - rect[1];
  // //     c.visualspace.posX = rect[0];
  // //     c.visualspace.posY = rect[1];
  // //     c.visualspace.padding = layout.padding;
  // //   });
  // // }

  // private calcPackGridxyMaxFillVisualSpaceUniform(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  // ) {
  //   const edgeInfo = this.buildEdgeInfoForMaxFill(
  //     parentContainer,
  //     childContainers,
  //     layout,
  //   );

  //   this.applyEdgeInfo(parentContainer, childContainers, layout, edgeInfo);
  // }

  // private calcFillGridxyVisualSpace(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  // ) {
  //   const availableSpace = this.getAvailableSpace(parentContainer, layout);
  //   const unitLength = this.getUnit(availableSpace, childContainers, layout);
  //   this.calcFillGridxyVisualSpaceWithUnitLength(
  //     parentContainer,
  //     childContainers,
  //     layout,
  //     unitLength,
  //   );
  // }

  // private calcPackGridxyVisualSpace(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  // ) {
  //   let aspectRatio = 1;
  //   switch (layout.aspectRatio) {
  //     case 'square':
  //       aspectRatio = 1;
  //       break;
  //     case 'parent':
  //       aspectRatio =
  //         parentContainer.visualspace.width /
  //         parentContainer.visualspace.height;
  //       break;
  //   }
  //   const edgeInfo = this.calcEdgeInfo(
  //     parentContainer,
  //     childContainers,
  //     layout,
  //     aspectRatio,
  //   );
  //   this.applyEdgeInfo(parentContainer, childContainers, layout, edgeInfo);
  // }

  // private calcEdgeInfo(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  //   aspectRatio: number,
  // ) {
  //   return this.isVerticalDirection(layout.direction)
  //     ? this.getRepetitionCountForFillingEdge(
  //         parentContainer.visualspace.width,
  //         parentContainer.visualspace.height,
  //         childContainers.length,
  //         aspectRatio,
  //       )
  //     : this.getRepetitionCountForFillingEdge(
  //         parentContainer.visualspace.height,
  //         parentContainer.visualspace.width,
  //         childContainers.length,
  //         1 / aspectRatio,
  //       );
  // }

  // private getRepetitionCountForFillingEdge(
  //   fillingEdge: number,
  //   remainingEdge: number,
  //   numElement: number,
  //   ratio: number,
  // ) {
  //   let fillingEdgeRepetitionCount = 0;
  //   let remainingEdgeSideUnitLength;
  //   let remainingEdgeRepetitionCount;
  //   let numPossibleContainers;
  //   let fillingEdgeSideUnitLength;

  //   do {
  //     fillingEdgeRepetitionCount++;
  //     fillingEdgeSideUnitLength =
  //       (1.0 * fillingEdge) / fillingEdgeRepetitionCount;

  //     remainingEdgeSideUnitLength = fillingEdgeSideUnitLength / ratio;

  //     remainingEdgeRepetitionCount = Math.floor(
  //       (remainingEdge * fillingEdgeRepetitionCount * ratio) / fillingEdge,
  //     );

  //     numPossibleContainers =
  //       remainingEdgeRepetitionCount * fillingEdgeRepetitionCount;
  //   } while (numElement > numPossibleContainers);

  //   return {
  //     fillingEdgeRepetitionCount,
  //     remainingEdgeRepetitionCount,
  //     fillingEdgeSideUnitLength,
  //     remainingEdgeSideUnitLength,
  //   };
  // }

  // private getCombination(n: number) {
  //   return d3.range(1, n + 1).map((d) => {
  //     return {
  //       a: d,
  //       b: Math.ceil(n / d),
  //     };
  //   });
  // }

  // private buildEdgeInfoForMaxFill(
  //   parentContainer: Container,
  //   childContainers: Container[],
  //   layout: Layout,
  // ) {
  //   const combinations = this.getCombination(childContainers.length);

  //   const combinationForWidthAndHeight = combinations.map((d) => {
  //     return {
  //       width: parentContainer.visualspace.width / d.a,
  //       height: parentContainer.visualspace.height / d.b,
  //       horizontalRepetitionCount: d.a,
  //       verticalRepetitionCount: d.b,
  //       minEdge: 0,
  //     };
  //   });

  //   combinationForWidthAndHeight.forEach((d) => {
  //     d.minEdge = d.width > d.height ? d.height : d.width;
  //   });

  //   const minCombi = d3.scan(combinationForWidthAndHeight, (a, b) => {
  //     return b.minEdge - a.minEdge;
  //   });

  //   const edgeInfo = combinationForWidthAndHeight[minCombi!];

  //   return this.buildEdgeInfoByDirection(
  //     edgeInfo.horizontalRepetitionCount,
  //     edgeInfo.verticalRepetitionCount,
  //     edgeInfo.width,
  //     edgeInfo.height,
  //     layout,
  //   );
  // }
}
