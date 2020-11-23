import { Component, Entity } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';

export class HierarchyComponent extends Component<HierarchyComponent> {
  public parentID: Entity;

  constructor(data: Partial<NonFunctionProperties<HierarchyComponent>>) {
    super(data);
    Object.assign(this, data);
  }
}
