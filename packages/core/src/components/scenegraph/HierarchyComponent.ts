import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { Entity } from '../../Entity';

export class HierarchyComponent extends Component<HierarchyComponent> {
  public parentID: Entity;

  constructor(data: Partial<NonFunctionProperties<HierarchyComponent>>) {
    super(data);
    this.parentID = data.parentID || -1;
  }
}
