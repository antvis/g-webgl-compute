import { mat4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { createEntity, Entity } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { TransformComponent } from '../scenegraph/TransformComponent';
import { CameraComponent } from './CameraComponent';

@injectable()
export class CameraSystem implements ISystem {
  @inject(IDENTIFIER.CameraComponentManager)
  private readonly camera: ComponentManager<CameraComponent>;

  @inject(IDENTIFIER.TransformComponentManager)
  private readonly transform: ComponentManager<TransformComponent>;

  public async execute() {
    // this.runTransformUpdateSystem();
  }

  public tearDown() {
    this.camera.clear();
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
