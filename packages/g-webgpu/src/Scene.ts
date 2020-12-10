import { Entity, IScene } from '@antv/g-webgpu-core';
import { injectable } from 'inversify';
import { Renderable } from '.';

@injectable()
export class Scene implements IScene {
  private entities: Entity[] = [];

  public getEntities() {
    return this.entities;
  }

  public addRenderable(renderable: Renderable) {
    this.addEntity(renderable.getEntity());
    return this;
  }

  public removeRenderable(renderable: Renderable) {
    this.removeEntity(renderable.getEntity());
    return this;
  }

  public addLight() {

  }

  private addEntity(entity: Entity) {
    if (this.entities.indexOf(entity) === -1) {
      this.entities.push(entity);
    }
    return this;
  }

  private removeEntity(entity: Entity) {
    const index = this.entities.indexOf(entity);
    this.entities.splice(index, 1);
    return this;
  }
}
