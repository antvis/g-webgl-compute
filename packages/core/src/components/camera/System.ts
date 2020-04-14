import { mat4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { createEntity, Entity, IDENTIFIER } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { ExecuteSystem } from '../../System';
import { TransformComponent } from '../scenegraph/TransformComponent';
import { CameraComponent } from './CameraComponent';

@injectable()
export class CameraSystem extends ExecuteSystem {
  public name = IDENTIFIER.CameraSystem;

  @inject(IDENTIFIER.CameraComponentManager)
  private readonly camera: ComponentManager<CameraComponent>;

  @inject(IDENTIFIER.TransformComponentManager)
  private readonly transform: ComponentManager<TransformComponent>;

  public async execute() {
    // this.runTransformUpdateSystem();
  }

  public createCamera(cameraParams: {
    near: number;
    far: number;
    angle: number;
    aspect: number;
  }) {
    const entity = createEntity();
    this.camera.create(entity, {});
    this.transform.create(entity, {});

    const cameraComponent = this.camera.getComponentByEntity(entity);

    const { near, far, angle, aspect } = cameraParams;
    cameraComponent?.setPerspective(near, far, angle, aspect);

    return entity;
  }

  public getTransformComponentManager() {
    return this.transform;
  }
}
