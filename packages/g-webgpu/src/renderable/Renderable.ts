import {
  ComponentManager,
  CullableComponent,
  Entity,
  GeometryComponent,
  HierarchyComponent,
  IDENTIFIER,
  MaterialComponent,
  MeshComponent,
  SceneGraphSystem,
  TransformComponent,
} from '@antv/g-webgpu-core';
import { mat4 } from 'gl-matrix';
import { inject, injectable, named } from 'inversify';

export interface IRenderable<T> {
  setConfig(config: T): void;
  setEntity(entity: Entity): void;
  setMaterial(material: MaterialComponent): void;
  setGeometry(geometry: GeometryComponent): void;
}

@injectable()
export class Renderable<T = unknown> implements IRenderable<T> {
  public static POINT = 'point';
  public static LINE = 'line';

  protected config: T;

  @inject(IDENTIFIER.MeshComponentManager)
  private readonly mesh: ComponentManager<MeshComponent>;

  @inject(IDENTIFIER.CullableComponentManager)
  private readonly cullable: ComponentManager<CullableComponent>;

  @inject(IDENTIFIER.TransformComponentManager)
  private readonly transform: ComponentManager<TransformComponent>;

  @inject(IDENTIFIER.Systems)
  @named(IDENTIFIER.SceneGraphSystem)
  private readonly sceneGraphSystem: SceneGraphSystem;

  private meshComponent: MeshComponent;
  private transformComponent: TransformComponent;

  private entity: Entity;

  public getEntity() {
    return this.entity;
  }

  public getTransformComponent() {
    return this.transformComponent;
  }

  public getMeshComponent() {
    return this.meshComponent;
  }

  public setConfig(config: T) {
    this.config = config;
  }

  public setEntity(entity: Entity) {
    this.entity = entity;
    this.cullable.create(entity);
    this.meshComponent = this.mesh.create(entity);
    this.transformComponent = this.transform.create(entity);
    this.afterEntityCreated();
  }

  public setMaterial(material: MaterialComponent) {
    this.meshComponent.material = material;
    return this;
  }

  public setGeometry(geometry: GeometryComponent) {
    this.meshComponent.geometry = geometry;
    return this;
  }

  public setVisible(visible: boolean) {
    this.meshComponent.visible = visible;
    return this;
  }

  public isVisible() {
    return this.meshComponent.visible;
  }

  public attach(parentRenderable: Renderable<T>) {
    this.sceneGraphSystem.attach(this.entity, parentRenderable.entity);
    return this;
  }

  public detach() {
    this.sceneGraphSystem.detach(this.entity);
    return this;
  }

  public detachChildren() {
    this.sceneGraphSystem.detachChildren(this.entity);
    return this;
  }

  /**
   * @override
   */
  protected afterEntityCreated() {
    //
  }
}
