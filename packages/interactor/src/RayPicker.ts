import { Camera, World } from '@antv/g-webgpu';
import {
  ICamera,
  IDENTIFIER,
  IInteractorEvent,
  IRendererService,
  IView,
  Ray,
  RendererSystem,
} from '@antv/g-webgpu-core';
import EventEmitter from 'eventemitter3';
import { mat4, vec3 } from 'gl-matrix';
import { Container } from 'inversify';
import { InteractorService } from './InteractorService';

/**
 * Collision Picking
 * @see https://developer.playcanvas.com/en/tutorials/entity-picking/
 */
export class RayPicker extends EventEmitter {
  public static create(world: World) {
    const picker = new RayPicker();
    const worldContainer = world.getContainer();
    worldContainer
      .rebind(IDENTIFIER.InteractorService)
      .to(InteractorService)
      .inSingletonScope();

    picker.container = worldContainer;
    return picker;
  }

  public container: Container;
  private ray: Ray;

  public attachControl(view: IView) {
    const engine = this.container.get<IRendererService>(
      IDENTIFIER.RenderEngine,
    );

    const interactor = this.container.get<InteractorService>(
      IDENTIFIER.InteractorService,
    );
    interactor.listen(engine.getCanvas());

    const rendererSystem = this.container.getNamed<RendererSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.RendererSystem,
    );

    interactor.on(IInteractorEvent.HOVER, (center) => {
      // const id = rendererSystem.pick(
      //   {
      //     x: center.x,
      //     y: center.y,
      //   },
      //   view,
      // );
      this.setFromCamera(view.getCamera(), center);

      // this.emit('pick', {
      //   id,
      //   x: Math.floor(center.x),
      //   y: Math.floor(center.y),
      // });
    });
    return this;
  }

  private setFromCamera(camera: ICamera, { x, y }: { x: number; y: number }) {
    const projectionMode = camera.getProjectionMode();
    if (projectionMode === Camera.ProjectionMode.PERSPECTIVE) {
      this.ray.origin = camera.getPosition();
      vec3.copy(this.ray.direction, [x, y, 0.5]);
      vec3.transformMat4()
    } else if (projectionMode === Camera.ProjectionMode.ORTHOGRAPHIC) {

    }

    // if ( ( camera && camera.isPerspectiveCamera ) ) {

		// 	this.ray.origin.setFromMatrixPosition( camera.matrixWorld );
		// 	this.ray.direction.set( coords.x, coords.y, 0.5 ).unproject( camera ).sub( this.ray.origin ).normalize();
		// 	this.camera = camera;

		// } else if ( ( camera && camera.isOrthographicCamera ) ) {

		// 	this.ray.origin.set( coords.x, coords.y, ( camera.near + camera.far ) / ( camera.near - camera.far ) ).unproject( camera ); // set origin in plane of camera
		// 	this.ray.direction.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
		// 	this.camera = camera;

		// }
  }
}
