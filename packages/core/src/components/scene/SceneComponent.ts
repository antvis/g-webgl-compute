import { Component, Entity } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';

export class SceneComponent extends Component<SceneComponent> {
  public camera: Entity;

  public meshes: Entity[] = [];

  constructor(data: Partial<NonFunctionProperties<SceneComponent>>) {
    super(data);

    Object.assign(this, data);
  }
}
