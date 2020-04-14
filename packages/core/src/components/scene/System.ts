import { mat4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { createEntity, Entity, IDENTIFIER } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { ExecuteSystem } from '../../System';
import { SceneComponent } from './SceneComponent';

@injectable()
export class SceneSystem extends ExecuteSystem {
  public name = IDENTIFIER.SceneSystem;

  @inject(IDENTIFIER.SceneComponentManager)
  private readonly scene: ComponentManager<SceneComponent>;

  public async execute() {
    // this.runTransformUpdateSystem();
  }

  public createScene(camera: Entity) {
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
