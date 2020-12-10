import {
  ComponentManager,
  Entity,
  IDENTIFIER,
  MaterialComponent,
} from '@antv/g-webgpu-core';
import { inject, injectable } from 'inversify';

export interface IMaterial<T> {
  setConfig(config: T): void;
}

@injectable()
export class Material<T = {}> implements IMaterial<T> {
  public static BASIC = 'basic';

  protected config: T;

  @inject(IDENTIFIER.MaterialComponentManager)
  private readonly material: ComponentManager<MaterialComponent>;

  private entity: Entity;
  private component: MaterialComponent;

  public getEntity() {
    return this.entity;
  }

  public getComponent() {
    return this.component;
  }

  public setConfig(config: T) {
    this.config = config;
  }

  public setEntity(entity: Entity, type: string) {
    this.entity = entity;
    this.component = this.material.create(entity);
    this.component.entity = entity;
    this.component.type = type;
    this.onEntityCreated();
  }

  protected onEntityCreated() {
    //
  }
}
