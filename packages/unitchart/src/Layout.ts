import * as d3 from 'd3';
import { Container } from './Container';

type LayoutType = 'gridxy' | 'flatten';
export type SubgroupType = 'groupby' | 'bin' | 'passthrough' | 'flatten';
type AspectRatioType =
  | 'fillX'
  | 'fillY'
  | 'square'
  | 'parent'
  | 'custom'
  | 'maxfill';
export type DirectionType =
  | 'LRTB'
  | 'LRBT'
  | 'TBLR'
  | 'BTLR'
  | 'LR'
  | 'RLBT'
  | 'RLTB'
  | 'BTRL'
  | 'TBRL'
  | 'RL'
  | 'BT'
  | 'TB';
type AlignType =
  | 'left'
  | 'right'
  | 'center'
  | 'top'
  | 'middle'
  | 'bottom'
  | 'LT'
  | 'LM'
  | 'LB'
  | 'CT'
  | 'CM'
  | 'CB'
  | 'RT'
  | 'RM'
  | 'RB';
export type SortType = 'categorical' | 'numerical';
type SizeType = 'uniform' | 'sum' | 'count';

export interface ILayoutInitializationOptions {
  type: LayoutType;
  subgroup: {
    type: SubgroupType;
    key: string;
    isShared: boolean;
    numBin?: number;
  };
  size: {
    type: SizeType;
    key: string;
    isShared: boolean;
  };
  aspectRatio: AspectRatioType;
  margin: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
  padding: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
  direction: DirectionType;
  align: AlignType;
  sort: {
    type: SortType;
    key: string;
    direction: 'ascending' | 'descending';
  };
}

const defaultLayout = {
  type: 'gridxy',
  aspectRatio: 'maxfill',
  size: {
    key: '',
    type: 'uniform',
    isShared: true,
  },
  direction: 'LRBT',
  align: 'LB',
  margin: {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  padding: {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  sort: {
    type: 'categorical',
    key: '',
    direction: 'ascending',
  },
};

export class Layout {
  public static START_OF() {
    const layout = new Layout();
    layout.startOf = true;
    return layout;
  }

  public static END_OF() {
    const layout = new Layout();
    layout.endOf = true;
    return layout;
  }

  public type: LayoutType;
  public subgroup?: {
    type: SubgroupType;
    key: string;
    isShared: boolean;
  };
  public size: {
    type: SizeType;
    key: string;
    isShared: boolean;
  };
  public aspectRatio: AspectRatioType;
  public sizeSharingGroup: Container[] = [];
  public margin: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
  public padding: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
  public direction: DirectionType;
  public align: AlignType;
  public sort: {
    type: SortType;
    key: string;
    direction: 'ascending' | 'descending';
  };
  public containers: Container[];

  private startOf: boolean;
  private endOf: boolean;

  private parent: Layout;
  private child: Layout;

  constructor(options?: ILayoutInitializationOptions) {
    this.type = options?.type || (defaultLayout.type as LayoutType);
    this.subgroup = options?.subgroup;
    this.size =
      options?.size ||
      (defaultLayout.size as {
        type: SizeType;
        key: string;
        isShared: boolean;
      });
    this.aspectRatio =
      options?.aspectRatio || (defaultLayout.aspectRatio as AspectRatioType);
    this.margin = {
      ...defaultLayout.margin,
      ...options?.margin,
    };
    this.padding = {
      ...defaultLayout.padding,
      ...options?.padding,
    };
    this.direction =
      options?.direction || (defaultLayout.direction as DirectionType);
    this.align = options?.align || (defaultLayout.align as AlignType);
    this.sort = {
      ...(defaultLayout as Pick<ILayoutInitializationOptions, 'sort'>).sort,
      ...options?.sort,
    };
  }

  public isStartOf() {
    return this.startOf;
  }

  public isEndOf() {
    return this.endOf;
  }

  public setParent(parent: Layout) {
    this.parent = parent;
  }

  public setChild(child: Layout) {
    this.child = child;
  }

  public getParent() {
    return this.parent;
  }

  public getChild() {
    return this.child;
  }

  public apply(containers: Container[]): Container[] {
    let childContainers: Container[] = [];
    let newSizeSharingAncestor;
    let oldSizeSharingAncestor = this.getSharingAncestorContainer(
      containers[0],
      this,
      'size',
    );

    debugger;

    containers.forEach((container) => {
      newSizeSharingAncestor = this.getSharingAncestorContainer(
        container,
        this,
        'size',
      );
      if (newSizeSharingAncestor !== oldSizeSharingAncestor) {
        this.applySharedSize();
        oldSizeSharingAncestor = newSizeSharingAncestor;
      }

      const newContainers = this.makeContainers(container);

      if (newContainers && newContainers.length > 0) {
        container.children = newContainers;
        this.calcVisualSpace(container);
      }
      this.handleSharedSize(container);
      childContainers = [...childContainers, ...newContainers];
    });

    this.applySharedSize();

    return childContainers;
  }

  private handleSharedSize(container: Container) {
    if (this.size.isShared) {
      if (!this.sizeSharingGroup) {
        this.sizeSharingGroup = [];
      }
      this.sizeSharingGroup = this.sizeSharingGroup.concat(container.children);
    }
  }

  private getSharingAncestorContainer(
    container: Container,
    layout: Layout,
    item: 'size' | 'subgroup',
  ): Container {
    if (this.type === 'flatten') {
      return container;
    }

    if (layout[item] && layout[item]!.isShared) {
      if (container.parent !== undefined) {
        return this.getSharingAncestorContainer(
          container.parent,
          layout.getParent(),
          item,
        );
      }
    }
    return container;
  }

  private applySharedSize() {
    if (this.isEndOf() || this.size.isShared !== true) {
      return;
    }

    this.makeSharedSize();
    this.sizeSharingGroup = [];
  }

  private makeSharedSize() {
    switch (this.aspectRatio) {
      case 'fillX':
      case 'fillY':
        this.makeSharedSizeFill();
        break;
      case 'square':
      case 'parent':
      case 'custom':
      case 'maxfill':
        this.makeSharedSizePack();
        break;
    }
  }

  private makeSharedSizeFill() {
    const minUnit = this.getMinUnitAmongContainers();
    this.applySharedUnitOnContainers(minUnit);
  }

  private makeSharedSizePack() {
    if (this.size.type === 'uniform') {
      const minSize = this.getMinAmongContainers();
      this.applySharedSizeOnContainers(minSize!);
    } else {
      const minUnit = this.getMinUnitAmongContainers();
      this.applySharedUnitOnContainers(minUnit);
    }
  }

  private getMinUnitAmongContainers() {
    const parentContainers = this.getParents(this.sizeSharingGroup);

    let minUnit = Number.MAX_VALUE;
    parentContainers.forEach((c) => {
      const availableSpace = c.getAvailableSpace(this);
      const unit = this.getUnit(availableSpace, c.children);
      if (unit < minUnit) {
        minUnit = unit;
      }
    });
    return minUnit;
  }

  private getMinAmongContainers() {
    const sharedContainers = this.sizeSharingGroup;
    let minSizeItemIndex;

    switch (this.aspectRatio) {
      case 'square':
      case 'parent':
      case 'custom':
        minSizeItemIndex = d3.scan(sharedContainers, (a, b) => {
          return a.visualspace.width - b.visualspace.width;
        })!;
        return {
          width: sharedContainers[minSizeItemIndex].visualspace.width,
          height: sharedContainers[minSizeItemIndex].visualspace.height,
        };
      case 'maxfill':
        const tempMinorSide = sharedContainers.map((d) => {
          return d.visualspace.width > d.visualspace.height
            ? d.visualspace.height
            : d.visualspace.width;
        });
        minSizeItemIndex = d3.scan(tempMinorSide, (a, b) => {
          return a - b;
        });

        const minContainer = sharedContainers.reduce((pre, cur) => {
          let minPre;
          let maxPre;
          let minCur;
          let maxCur;

          if (pre.visualspace.height > pre.visualspace.width) {
            minPre = pre.visualspace.width;
            maxPre = pre.visualspace.height;
          } else {
            minPre = pre.visualspace.height;
            maxPre = pre.visualspace.width;
          }

          if (cur.visualspace.height > cur.visualspace.width) {
            minCur = cur.visualspace.width;
            maxCur = cur.visualspace.height;
          } else {
            minCur = cur.visualspace.height;
            maxCur = cur.visualspace.width;
          }

          if (minCur < minPre) {
            return cur;
          } else if (minCur === minPre) {
            if (maxCur < maxPre) {
              return cur;
            }
          }
          return pre;
        });

        return {
          width: minContainer.visualspace.width,
          height: minContainer.visualspace.height,
        };
    }
  }

  private getParents(containers: Container[]) {
    const parentSet = new Set<Container>();
    containers.forEach((d) => {
      if (d.parent) {
        parentSet.add(d.parent);
      }
    });
    return Array.from<Container>(parentSet);
  }

  private getUnit(availableSpace: number, childContainers: Container[]) {
    const sum = childContainers.reduce((cur, prev) => {
      return cur + this.getValue(prev);
    }, 0);
    return availableSpace / sum;
  }

  private getValue(container: Container) {
    switch (this.size.type) {
      case 'uniform':
        return 1;
      case 'sum':
        // @ts-ignore
        return d3.sum(container.data, (d) => {
          return d[this.size.key];
        });
      case 'count':
        return container.data.length;
      default:
        return 1;
    }
  }

  private applySharedSizeOnContainers(minSize: {
    width: number;
    height: number;
  }) {
    this.getParents(this.sizeSharingGroup).forEach((c) => {
      const edgeInfo = this.buildEdgeInfoFromMinSize(c, minSize);
      this.applyEdgeInfo(c, edgeInfo);
    });
  }

  private applySharedUnitOnContainers(minUnit: number) {
    this.getParents(this.sizeSharingGroup).forEach((d) => {
      switch (this.aspectRatio) {
        case 'fillX':
        case 'fillY':
          this.calcFillGridxyVisualSpaceWithUnitLength(d, minUnit);
          break;
        case 'square':
        case 'parent':
        case 'custom':
        case 'maxfill':
          this.calcPackGridxyVisualSpaceWithUnitLength(d, minUnit);
      }
    });
  }

  private calcFillGridxyVisualSpaceWithUnitLength(
    parentContainer: Container,
    unitLength: number,
  ) {
    const parentVisualSpace = parentContainer.visualspace;
    if (this.aspectRatio === 'fillX') {
      const unitWidth = unitLength;
      parentContainer.children.forEach((c) => {
        c.visualspace.width =
          unitWidth * this.getValue(c) - this.margin.left - this.margin.right;

        c.visualspace.height =
          parentVisualSpace.height -
          parentVisualSpace.padding.top -
          parentVisualSpace.padding.bottom -
          this.margin.top -
          this.margin.bottom;

        c.visualspace.posY = parentVisualSpace.padding.top + this.margin.top;

        c.visualspace.padding = this.padding;
      });

      this.getPosXforFillX(parentVisualSpace, parentContainer.children);
    } else if (this.aspectRatio === 'fillY') {
      const unitHeight = unitLength;
      parentContainer.children.forEach((c) => {
        c.visualspace.height =
          unitHeight * this.getValue(c) - this.margin.top - this.margin.bottom;

        c.visualspace.width =
          parentVisualSpace.width -
          parentVisualSpace.padding.left -
          parentVisualSpace.padding.right -
          this.margin.left -
          this.margin.right;

        c.visualspace.posX = parentVisualSpace.padding.left + this.margin.left;

        c.visualspace.padding = this.padding;
      });

      this.getPosYforFillY(parentVisualSpace, parentContainer.children);
    } else {
      // TODO: other aspectRatios
    }
  }

  private calcPackGridxyVisualSpaceWithUnitLength(
    parentContainer: Container,
    unitLength: number,
  ) {
    switch (this.aspectRatio) {
      case 'square':
        parentContainer.children.forEach((c, i, all) => {
          c.visualspace.width = Math.sqrt(unitLength * this.getValue(c));
          c.visualspace.height = Math.sqrt(unitLength * this.getValue(c));
          c.visualspace.posX =
            parentContainer.visualspace.padding.left +
            this.margin.left +
            0.5 *
              (parentContainer.visualspace.width -
                c.visualspace.width -
                parentContainer.visualspace.padding.left -
                parentContainer.visualspace.padding.right);
          c.visualspace.posY =
            parentContainer.visualspace.padding.top +
            this.margin.top +
            0.5 *
              (parentContainer.visualspace.height -
                c.visualspace.height -
                parentContainer.visualspace.padding.top -
                parentContainer.visualspace.padding.right);
        });
    }
  }

  private getPosXforFillX(
    parentVisualspace: {
      width: number;
      height: number;
      posX: number;
      posY: number;
      padding: {
        top: number;
        left: number;
        bottom: number;
        right: number;
      };
    },
    childContainers: Container[],
  ) {
    let start: number;
    let direction: number;
    let offset: number;
    switch (this.direction) {
      case 'LRTB':
      case 'LRBT':
      case 'TBLR':
      case 'BTLR':
      case 'LR':
        start = 0;
        direction = 1;
        break;
      case 'RLBT':
      case 'RLTB':
      case 'BTRL':
      case 'TBRL':
      case 'RL':
        start = childContainers.length - 1;
        direction = -1;
        break;
      default:
    }

    const totalwidth = childContainers.reduce((cur, c) => {
      return cur + c.visualspace.width + this.margin.left + this.margin.right;
    }, 0);

    switch (this.align) {
      case 'left':
      case 'LT':
      case 'LM':
      case 'LB':
        offset = parentVisualspace.padding.left;
        break;
      case 'center':
      case 'CT':
      case 'CM':
      case 'CB':
        offset =
          parentVisualspace.padding.left +
          (parentVisualspace.width -
            parentVisualspace.padding.left -
            parentVisualspace.padding.right) /
            2 -
          totalwidth / 2;
        break;
      case 'right':
      case 'RT':
      case 'RM':
      case 'RB':
        offset =
          parentVisualspace.width -
          parentVisualspace.padding.right -
          totalwidth;
        break;
    }

    childContainers.forEach((c, i, all) => {
      const index = start + direction * i;
      if (i === 0) {
        all[index].visualspace.posX = offset + this.margin.left;
      } else {
        all[index].visualspace.posX =
          all[index - direction].visualspace.posX +
          all[index - direction].visualspace.width +
          this.margin.right +
          this.margin.left;
      }
    });
  }

  private getPosYforFillY(
    parentVisualspace: {
      width: number;
      height: number;
      posX: number;
      posY: number;
      padding: {
        top: number;
        left: number;
        bottom: number;
        right: number;
      };
    },
    childContainers: Container[],
  ) {
    let start: number;
    let direction: number;
    let offset: number;
    switch (this.direction) {
      case 'LRTB':
      case 'RLTB':
      case 'TBLR':
      case 'TBRL':
      case 'TB':
        start = 0;
        direction = 1;
        break;
      case 'LRBT':
      case 'RLBT':
      case 'BTLR':
      case 'BTRL':
      case 'BT':
        start = childContainers.length - 1;
        direction = -1;
        break;
      default:
    }

    const totalheight = childContainers.reduce((cur, c) => {
      return cur + c.visualspace.height + this.margin.top + this.margin.bottom;
    }, 0);

    switch (this.align) {
      case 'top':
      case 'RT':
      case 'CT':
      case 'LT':
        offset = parentVisualspace.padding.top;
        break;
      case 'middle':
      case 'LM':
      case 'RM':
      case 'CM':
        offset =
          parentVisualspace.padding.top +
          (parentVisualspace.height -
            parentVisualspace.padding.top -
            parentVisualspace.padding.bottom) /
            2 -
          totalheight / 2;
        break;
      case 'bottom':
      case 'LB':
      case 'CB':
      case 'RB':
        offset =
          parentVisualspace.height -
          parentVisualspace.padding.bottom -
          totalheight;
        break;
    }

    childContainers.forEach((c, i, all) => {
      const index = start + direction * i;
      if (i === 0) {
        all[index].visualspace.posY = offset + this.margin.top;
      } else {
        all[index].visualspace.posY =
          all[index - direction].visualspace.posY +
          all[index - direction].visualspace.height +
          this.margin.bottom +
          this.margin.top;
      }
    });
  }

  private getSharingDomain(
    container: Container | d3.DSVRowArray<string>,
  ): Array<d3.DSVRowArray<string>> {
    if (this.isContainer(container)) {
      if (
        !(container as Container).children ||
        (container as Container).children?.length === 0
      ) {
        // @ts-ignore
        return (container as Container).data;
      }
      const leafs: Array<d3.DSVRowArray<string>> = [];
      (container as Container).children!.forEach((c) => {
        const newLeaves = this.getSharingDomain(c) as Array<
          d3.DSVRowArray<string>
        >;
        newLeaves.forEach((d) => {
          leafs.push(d);
        });
      });
      return leafs;
    } else {
      return [container as d3.DSVRowArray<string>];
    }
  }

  private isContainer(container: Container | d3.DSVRowArray<string>) {
    if (
      container.hasOwnProperty('data') &&
      container.hasOwnProperty('visualspace') &&
      container.hasOwnProperty('parent')
    ) {
      return true;
    }
    return false;
  }

  private makeContainers(container: Container) {
    const sharingAncestorContainer = this.getSharingAncestorContainer(
      container,
      this,
      'subgroup',
    );

    const sharingDomain = this.getSharingDomain(sharingAncestorContainer);
    let childContainers;

    if (this.subgroup) {
      switch (this.subgroup.type) {
        case 'groupby':
          childContainers = container.makeContainersForCategoricalVar(
            // @ts-ignore
            sharingDomain,
            this.subgroup.key,
          );
          break;
        case 'bin':
          childContainers = container.makeContainersForNumericalVar(
            // @ts-ignore
            sharingDomain,
            this.subgroup,
          );
          break;
        case 'passthrough':
          childContainers = container.makeContainersForPassthrough();
          break;
        case 'flatten':
          childContainers = container.makeContainersForFlatten(this.sort);
          break;
      }
    }

    return childContainers;
  }

  private calcVisualSpace(parentContainer: Container) {
    this.containers = parentContainer.children;

    switch (this.type) {
      case 'gridxy':
        this.calcGridxyVisualSpace(parentContainer);
        break;
      default:
      // TODO: flatten
    }
  }

  private calcGridxyVisualSpace(parentContainer: Container) {
    switch (this.aspectRatio) {
      case 'fillX':
      case 'fillY':
        this.calcFillGridxyVisualSpace(parentContainer);
        break;
      case 'square':
      case 'parent':
      case 'custom':
        this.calcPackGridxyVisualSpace(parentContainer);
        break;
      case 'maxfill':
        this.calcPackGridxyMaxFillVisualSpace(parentContainer);
    }
  }

  private calcFillGridxyVisualSpace(parentContainer: Container) {
    const availableSpace = parentContainer.getAvailableSpace(this);
    const unitLength = this.getUnit(availableSpace, parentContainer.children);
    this.calcFillGridxyVisualSpaceWithUnitLength(parentContainer, unitLength);
  }

  private calcPackGridxyVisualSpace(parentContainer: Container) {
    let aspectRatio = 1;
    switch (this.aspectRatio) {
      case 'square':
        aspectRatio = 1;
        break;
      case 'parent':
        aspectRatio =
          parentContainer.visualspace.width /
          parentContainer.visualspace.height;
        break;
    }
    const edgeInfo = this.calcEdgeInfo(parentContainer, aspectRatio);
    this.applyEdgeInfo(parentContainer, edgeInfo);
  }

  private calcPackGridxyMaxFillVisualSpace(parentContainer: Container) {
    if (this.size.type === 'uniform') {
      this.calcPackGridxyMaxFillVisualSpaceUniform(parentContainer);
    } else {
      // TODO:
      // this.calcPackGridxyMaxFillVisualSpaceFunction(
      //   parentContainer,
      //   childContainers,
      //   layout,
      // );
    }
  }

  private calcPackGridxyMaxFillVisualSpaceUniform(parentContainer: Container) {
    const edgeInfo = this.buildEdgeInfoForMaxFill(parentContainer);

    this.applyEdgeInfo(parentContainer, edgeInfo);
  }

  private calcEdgeInfo(parentContainer: Container, aspectRatio: number) {
    return this.isVerticalDirection(this.direction)
      ? this.getRepetitionCountForFillingEdge(
          parentContainer.visualspace.width,
          parentContainer.visualspace.height,
          parentContainer.children.length,
          aspectRatio,
        )
      : this.getRepetitionCountForFillingEdge(
          parentContainer.visualspace.height,
          parentContainer.visualspace.width,
          parentContainer.children.length,
          1 / aspectRatio,
        );
  }

  private getRepetitionCountForFillingEdge(
    fillingEdge: number,
    remainingEdge: number,
    numElement: number,
    ratio: number,
  ) {
    let fillingEdgeRepetitionCount = 0;
    let remainingEdgeSideUnitLength;
    let remainingEdgeRepetitionCount;
    let numPossibleContainers;
    let fillingEdgeSideUnitLength;

    do {
      fillingEdgeRepetitionCount++;
      fillingEdgeSideUnitLength =
        (1.0 * fillingEdge) / fillingEdgeRepetitionCount;

      remainingEdgeSideUnitLength = fillingEdgeSideUnitLength / ratio;

      remainingEdgeRepetitionCount = Math.floor(
        (remainingEdge * fillingEdgeRepetitionCount * ratio) / fillingEdge,
      );

      numPossibleContainers =
        remainingEdgeRepetitionCount * fillingEdgeRepetitionCount;
    } while (numElement > numPossibleContainers);

    return {
      fillingEdgeRepetitionCount,
      remainingEdgeRepetitionCount,
      fillingEdgeSideUnitLength,
      remainingEdgeSideUnitLength,
    };
  }

  private applyEdgeInfo(
    parentContainer: Container,
    edgeInfo: {
      fillingEdgeRepetitionCount: number;
      remainingEdgeRepetitionCount: number;
      fillingEdgeSideUnitLength: number;
      remainingEdgeSideUnitLength: number;
    },
  ) {
    if (this.isVerticalDirection(this.direction)) {
      this.applyEdgeInfoVerticalDirection(parentContainer, edgeInfo);
    } else {
      this.applyEdgeInfoHorizontalDirection(parentContainer, edgeInfo);
    }
  }

  private applyEdgeInfoHorizontalDirection(
    parentContainer: Container,
    edgeInfo: {
      fillingEdgeRepetitionCount: number;
      remainingEdgeRepetitionCount: number;
      fillingEdgeSideUnitLength: number;
      remainingEdgeSideUnitLength: number;
    },
  ) {
    let xOrig: number;
    let yOrig: number;
    let xInc: number;
    let yInc: number;
    let numVerticalElement: number;

    switch (this.direction) {
      case 'TBLR':
        xOrig = 0;
        yOrig = 0;
        xInc = edgeInfo.remainingEdgeSideUnitLength;
        yInc = edgeInfo.fillingEdgeSideUnitLength;
        numVerticalElement = edgeInfo.fillingEdgeRepetitionCount;
        break;
      case 'BTLR':
        xOrig = 0;
        yOrig =
          parentContainer.visualspace.height -
          edgeInfo.remainingEdgeSideUnitLength;
        xInc = edgeInfo.remainingEdgeSideUnitLength;
        yInc = -1.0 * edgeInfo.fillingEdgeSideUnitLength;
        numVerticalElement = edgeInfo.fillingEdgeRepetitionCount;
        break;
      case 'TBRL':
      case 'BTRL':
        // TODO:
        break;
    }

    parentContainer.children.forEach((c, i) => {
      c.visualspace.width = edgeInfo.remainingEdgeSideUnitLength;
      c.visualspace.height = edgeInfo.fillingEdgeSideUnitLength;
      c.visualspace.posX = xOrig + xInc * Math.floor(i / numVerticalElement);
      c.visualspace.posY = yOrig + yInc * (i % numVerticalElement);
      c.visualspace.padding = this.padding;
    });
  }

  private applyEdgeInfoVerticalDirection(
    parentContainer: Container,
    edgeInfo: {
      fillingEdgeRepetitionCount: number;
      remainingEdgeRepetitionCount: number;
      fillingEdgeSideUnitLength: number;
      remainingEdgeSideUnitLength: number;
    },
  ) {
    let xOrig: number;
    let yOrig: number;
    let xInc: number;
    let yInc: number;
    let numHoriElement: number;

    switch (this.direction) {
      case 'LRTB':
        xOrig = 0;
        yOrig = 0;
        xInc = edgeInfo.fillingEdgeSideUnitLength;
        yInc = edgeInfo.remainingEdgeSideUnitLength;
        numHoriElement = edgeInfo.fillingEdgeRepetitionCount;
        break;
      case 'LRBT':
        xOrig = 0;
        yOrig =
          parentContainer.visualspace.height -
          edgeInfo.remainingEdgeSideUnitLength;
        xInc = edgeInfo.fillingEdgeSideUnitLength;
        yInc = -1.0 * edgeInfo.remainingEdgeSideUnitLength;
        numHoriElement = edgeInfo.fillingEdgeRepetitionCount;
        break;
      case 'RLBT':
      case 'RLTB':
        // TODO:
        break;
    }

    parentContainer.children.forEach((c, i) => {
      c.visualspace.width = edgeInfo.fillingEdgeSideUnitLength;
      c.visualspace.height = edgeInfo.remainingEdgeSideUnitLength;
      c.visualspace.posX = xOrig + xInc * (i % numHoriElement);
      c.visualspace.posY = yOrig + yInc * Math.floor(i / numHoriElement);
      c.visualspace.padding = this.padding;
    });
  }

  private getCombination(n: number) {
    return d3.range(1, n + 1).map((d) => {
      return {
        a: d,
        b: Math.ceil(n / d),
      };
    });
  }

  private buildEdgeInfoFromMinSize(
    parentContainer: Container,
    minSize: {
      width: number;
      height: number;
    },
  ) {
    const horizontalRepetitionCount = Math.floor(
      parentContainer.visualspace.width / minSize.width,
    );
    const verticalRepetitionCount = Math.floor(
      parentContainer.visualspace.height / minSize.height,
    );
    return this.buildEdgeInfoByDirection(
      horizontalRepetitionCount,
      verticalRepetitionCount,
      minSize.width,
      minSize.height,
    );
  }

  private buildEdgeInfoByDirection(
    horizontalRepetitionCount: number,
    verticalRepetitionCount: number,
    width: number,
    height: number,
  ) {
    let fillingEdgeRepetitionCount;
    let remainingEdgeRepetitionCount;
    let fillingEdgeSideUnitLength;
    let remainingEdgeSideUnitLength;

    if (this.isVerticalDirection(this.direction)) {
      fillingEdgeRepetitionCount = horizontalRepetitionCount;
      remainingEdgeRepetitionCount = verticalRepetitionCount;
      fillingEdgeSideUnitLength = width;
      remainingEdgeSideUnitLength = height;
    } else {
      fillingEdgeRepetitionCount = verticalRepetitionCount;
      remainingEdgeRepetitionCount = horizontalRepetitionCount;
      fillingEdgeSideUnitLength = height;
      remainingEdgeSideUnitLength = width;
    }
    return {
      fillingEdgeRepetitionCount,
      remainingEdgeRepetitionCount,
      fillingEdgeSideUnitLength,
      remainingEdgeSideUnitLength,
    };
  }

  private isVerticalDirection(direction: DirectionType) {
    switch (direction) {
      case 'LRBT':
      case 'LRTB':
      case 'RLBT':
      case 'RLTB':
        return true;
      case 'BTLR':
      case 'BTRL':
      case 'TBLR':
      case 'TBRL':
        return false;
    }
  }

  private buildEdgeInfoForMaxFill(parentContainer: Container) {
    const combinations = this.getCombination(parentContainer.children.length);

    const combinationForWidthAndHeight = combinations.map((d) => {
      return {
        width: parentContainer.visualspace.width / d.a,
        height: parentContainer.visualspace.height / d.b,
        horizontalRepetitionCount: d.a,
        verticalRepetitionCount: d.b,
        minEdge: 0,
      };
    });

    combinationForWidthAndHeight.forEach((d) => {
      d.minEdge = d.width > d.height ? d.height : d.width;
    });

    const minCombi = d3.scan(combinationForWidthAndHeight, (a, b) => {
      return b.minEdge - a.minEdge;
    });

    const edgeInfo = combinationForWidthAndHeight[minCombi!];

    return this.buildEdgeInfoByDirection(
      edgeInfo.horizontalRepetitionCount,
      edgeInfo.verticalRepetitionCount,
      edgeInfo.width,
      edgeInfo.height,
    );
  }
}
