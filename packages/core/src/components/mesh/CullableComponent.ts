import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';

/**
 * @see https://doc.babylonjs.com/how_to/optimizing_your_scene#changing-mesh-culling-strategy
 */
export enum Strategy {
  Standard,
}

export class CullableComponent extends Component<CullableComponent> {
  public strategy: Strategy = Strategy.Standard;

  public visibilityPlaneMask = 0;

  public visible = false;

  constructor(data: Partial<NonFunctionProperties<CullableComponent>>) {
    super(data);

    Object.assign(this, data);
  }
}
