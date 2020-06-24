import { Component, Entity } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { EMPTY } from '../../Entity';

export class ResourceHandleComponent extends Component<
  ResourceHandleComponent
> {
  public writer: Entity;

  constructor(data: Partial<NonFunctionProperties<ResourceHandleComponent>>) {
    super(data);
    this.writer = data.writer || EMPTY;
  }
}
