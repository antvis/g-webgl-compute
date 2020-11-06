import { Entity, IScene } from '@antv/g-webgpu-core';
import { injectable } from 'inversify';

@injectable()
export class Scene implements IScene {
  private entities: Entity[] = [];

  public getEntities() {
    return this.entities;
  }

  public addEntity(entity: Entity) {
    if (this.entities.indexOf(entity) === -1) {
      this.entities.push(entity);
    }
    return this;
  }

  public removeEntity(entity: Entity) {
    const index = this.entities.indexOf(entity);
    this.entities.splice(index, 1);
    return this;
  }
}
