import { Component, NonFunctionProperties } from '../../ComponentManager';

export class TestComponent extends Component<TestComponent> {
  public prop1: number;
  public prop2: string;

  constructor(data: Partial<NonFunctionProperties<TestComponent>>) {
    super(data);
    this.prop1 = data.prop1 || 1;
    this.prop2 = data.prop2 || 'test';
  }
}
