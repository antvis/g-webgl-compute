import * as d3 from 'd3';
import { Layout, SortType, SubgroupType } from './Layout';

export interface IContainerInitializationOptions {
  parent: Container | undefined;
  children: Container[] | undefined;
  visualspace: {
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
  };
  label: string;
  data: Array<d3.DSVRowString<string>>;
}

export class Container {
  public parent: Container | undefined;
  public children: Container[];
  public visualspace: {
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
  };
  public data: Array<d3.DSVRowString<string>>;
  public label: string;

  constructor(private options: IContainerInitializationOptions) {
    this.parent = options.parent;
    this.children = options.children || [];
    this.visualspace = options.visualspace;
    this.data = options.data;
    this.label = options.label;
  }

  public applyLayout(layout: Layout) {
    let l = layout;
    while (l && !l.isEndOf()) {
      this.children = layout.apply(
        (this.children.length && this.children) || [this],
      );
      l = layout.getChild();
    }
  }

  public getAvailableSpace(layout: Layout): number {
    let width;
    let height;
    switch (layout.aspectRatio) {
      case 'fillX':
        return (
          this.visualspace.width -
          this.visualspace.padding.left -
          this.visualspace.padding.right
        );
      case 'fillY':
        return (
          this.visualspace.height -
          this.visualspace.padding.top -
          this.visualspace.padding.bottom
        );
      case 'maxfill':
      case 'parent':
        width =
          this.visualspace.width -
          this.visualspace.padding.left -
          this.visualspace.padding.right;
        height =
          this.visualspace.height -
          this.visualspace.padding.top -
          this.visualspace.padding.bottom;
        return width * height;
      case 'square':
        width =
          this.visualspace.width -
          this.visualspace.padding.left -
          this.visualspace.padding.right;
        height =
          this.visualspace.height -
          this.visualspace.padding.top -
          this.visualspace.padding.bottom;
        return Math.pow(Math.min(width, height), 2);
    }
    return 0;
  }

  public makeContainersForPassthrough() {
    return [
      new Container({
        data: this.data,
        label: this.label,
        visualspace: {
          width: 0,
          height: 0,
          posX: 0,
          posY: 0,
          padding: {
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          },
        },
        parent: this,
        children: this.children,
      }),
    ];
  }

  public makeContainersForCategoricalVar(
    sharingDomain: d3.DSVRowArray<string>,
    // layout: Layout,
    key: string,
  ): Container[] {
    const newContainers = this.emptyContainersFromKeys(
      sharingDomain,
      // layout.subgroup.key,
      key,
    );

    newContainers.forEach((c: Container) => {
      c.data = this.data.filter((d) => {
        // return d[layout.subgroup.key] === c.label;
        return d[key] === c.label;
      });
      c.parent = this;
    });

    return newContainers;
  }

  public makeContainersForFlatten(sort?: {
    type: SortType;
    key: string;
    direction: 'ascending' | 'descending';
  }): Container[] {
    const leaves = this.data.map((c, i) => {
      return new Container({
        data: [c],
        label: `${i}`,
        visualspace: {
          width: 0,
          height: 0,
          posX: 0,
          posY: 0,
          padding: {
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          },
        },
        parent: this,
        children: undefined,
      });
    });

    if (sort) {
      leaves.sort((a, b) => {
        const v1 = a.data[0][sort.key] || '';
        const v2 = b.data[0][sort.key] || '';

        const ascending = sort.direction === 'ascending' ? 1 : -1;

        return (sort.type === 'numerical'
        ? Number(v1) > Number(v2)
        : v1 > v2)
          ? ascending
          : -1 * ascending;
      });
    }

    return leaves;
  }

  public makeContainersForNumericalVar(
    sharingDomain: d3.DSVRowArray<string>,
    subgroup: {
      type: SubgroupType;
      key: string;
      isShared: boolean;
      numBin?: number;
    },
  ) {
    const extent = d3.extent(sharingDomain, (d) => {
      return Number(d[subgroup.key]);
    });
    let containers: Container[] = [];
    if (subgroup.numBin) {
      const tempScale = d3
        .scaleLinear()
        .domain([0, subgroup.numBin])
        .range(extent as [number, number]);
      const tickArray = d3.range(subgroup.numBin + 1).map(tempScale);

      // const nullGroup = this.data.filter((d) => d[subgroup.key] === '');
      const valueGroup = this.data.filter((d) => d[subgroup.key] !== '');

      const bins = d3
        .histogram()
        .domain(extent as [number, number])
        .thresholds(tickArray)
        .value((d) => {
          // @ts-ignore
          return Number(d[subgroup.key]);
          // @ts-ignore
        })(valueGroup);

      containers = bins.map((d) => {
        return new Container({
          // @ts-ignore
          data: d,
          label: `${d.x0}-${d.x1}`,
          visualspace: {
            width: 0,
            height: 0,
            posX: 0,
            posY: 0,
            padding: {
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
            },
          },
          parent: this,
          children: undefined,
        });
      });
    }

    return containers;
  }

  private getKeys(data: Array<d3.DSVRowArray<string>>, groupby: string) {
    const myNest = d3
      .nest()
      .key((d) => {
        // @ts-ignore
        return d[groupby];
      })
      .entries(data);
    return myNest.map((d) => {
      return d.key;
    });
  }

  private emptyContainersFromKeys(
    data: d3.DSVRowArray<string>,
    groupby: string,
  ): Container[] {
    // @ts-ignore
    return this.getKeys(data, groupby).map((key) => {
      return new Container({
        parent: undefined,
        children: undefined,
        label: key,
        data: [],
        visualspace: {
          width: 0,
          height: 0,
          posX: 0,
          posY: 0,
          padding: {
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          },
        },
      });
    });
  }
}
