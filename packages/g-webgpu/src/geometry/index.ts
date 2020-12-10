import {
  ComponentManager,
  Entity,
  GeometryComponent,
  IDENTIFIER,
} from '@antv/g-webgpu-core';
import { inject, injectable } from 'inversify';

export interface IGeometry<T> {
  setConfig(config: T): void;
}

@injectable()
export class Geometry<T = {}> implements IGeometry<T> {
  public static BOX = 'box';
  public static SPHERE = 'sphere';
  public static PLANE = 'plane';
  public static MERGED = 'merged';

  protected config: T;

  @inject(IDENTIFIER.GeometryComponentManager)
  private readonly geometry: ComponentManager<GeometryComponent>;

  private entity: Entity;
  private component: GeometryComponent;

  public getEntity() {
    return this.entity;
  }

  public getComponent() {
    return this.component;
  }

  public setConfig(config: T) {
    this.config = config;
  }

  public setEntity(entity: Entity) {
    this.entity = entity;
    this.component = this.geometry.create(entity);
    this.component.entity = entity;
    this.onEntityCreated();
  }

  protected onEntityCreated() {
    //
  }
}
