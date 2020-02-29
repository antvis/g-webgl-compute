import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';

export class NameComponent extends Component<NameComponent> {
  public name: string;

  constructor(data: Partial<NonFunctionProperties<NameComponent>>) {
    super(data);
    this.name = data.name || '';
  }
}
