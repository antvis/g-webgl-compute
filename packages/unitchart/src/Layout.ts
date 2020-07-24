import { Container } from './Container';

type LayoutType = 'gridxy' | 'flatten';
type SubgroupType = 'groupby' | 'bin' | 'passthrough' | 'flatten';
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
type SortType = 'categorical' | 'numerical';

export interface ILayoutInitializationOptions {
  type: LayoutType;
  subgroup: {
    type: SubgroupType;
    key: string;
    isShared: boolean;
  };
  size: {
    type: string;
    isShared: boolean;
    key: string;
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
  public subgroup: {
    type: SubgroupType;
    key: string;
    isShared: boolean;
  };
  public size: {
    type: string;
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
    this.size = options?.size;
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
      ...defaultLayout.sort,
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
}
