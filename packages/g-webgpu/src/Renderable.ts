import {
  ComponentManager,
  container,
  createEntity,
  CullableComponent,
  Entity,
  GeometryComponent,
  IDENTIFIER,
  MaterialComponent,
  MeshComponent,
  TransformComponent,
} from '@antv/g-webgpu-core';
import { inject, injectable } from 'inversify';

export interface IRenderable {

}

@injectable()
export class Renderable implements IRenderable {
  @inject(IDENTIFIER.MeshComponentManager)
  private readonly mesh: ComponentManager<MeshComponent>;

  @inject(IDENTIFIER.CullableComponentManager)
  private readonly cullable: ComponentManager<CullableComponent>;

  @inject(IDENTIFIER.TransformComponentManager)
  private readonly transform: ComponentManager<TransformComponent>;

  private meshComponent: MeshComponent;
  private transformComponent: TransformComponent;
  private entity: Entity;

  public getEntity() {
    return this.entity;
  }

  public getTransformComponent() {
    return this.transformComponent;
  }

  public setEntity(entity: Entity) {
    this.entity = entity;
    this.cullable.create(entity);
    this.meshComponent = this.mesh.create(entity);
    this.transformComponent = this.transform.create(entity);
  }

  public setMaterial(material: MaterialComponent) {
    this.meshComponent.material = material;
    return this;
  }

  public setGeometry(geometry: GeometryComponent) {
    this.meshComponent.geometry = geometry;
    return this;
  }
}
