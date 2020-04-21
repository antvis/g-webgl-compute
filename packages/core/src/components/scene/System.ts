import { mat4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { createEntity, Entity } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { SceneComponent } from './SceneComponent';

@injectable()
export class SceneSystem implements ISystem {
  @inject(IDENTIFIER.SceneComponentManager)
  private readonly scene: ComponentManager<SceneComponent>;

  public async execute() {
    // this.runTransformUpdateSystem();
  }

  public tearDown() {
    this.scene.clear();
  }

  public createScene({ camera }: { camera: Entity }) {
    const entity = createEntity();
    this.scene.create(entity, {
      camera,
    });
    return entity;
  }

  public addMesh(sceneEntity: Entity, meshEntity: Entity) {
    const scene = this.scene.getComponentByEntity(sceneEntity);
    if (scene) {
      scene.meshes.push(meshEntity);
    }
  }
}
