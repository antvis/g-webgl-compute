import { Layout } from './Layout';

export interface IContainerInitializationOptions {
  layout: Layout;
  parent: Container | undefined;
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
  contents: unknown;
}

export class Container {
  public parent: Container | undefined;
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
  public contents: Container[];
  public label: string;

  constructor(private options: IContainerInitializationOptions) {
    this.parent = options.parent;
    this.visualspace = options.visualspace;
    this.contents = options.contents;
    this.label = options.label;
  }
}
