import { Component, Entity } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';

export class PassNodeComponent extends Component<PassNodeComponent> {
  public writer: string;

  public inputResources: Entity[] = [];
  public outputResources: Entity[] = [];
  public nexts: Entity[] = [];
  public prevs: Entity[] = [];

  /**
   * 是否经过编译阶段
   */
  public compiled: boolean = false;

  /**
   * 引用计数
   */
  public ref = 0;

  constructor(data: Partial<NonFunctionProperties<PassNodeComponent>>) {
    super(data);
  }

  public setup() {
    // TODO: 处理输入资源的初始化
    // this.inputResources.forEach();
  }

  public execute() {
    // TODO: 处理输出资源，通过 Passes
  }
}
