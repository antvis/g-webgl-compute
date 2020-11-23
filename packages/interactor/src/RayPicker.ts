import { World } from '@antv/g-webgpu';
import {
  ICamera,
  IDENTIFIER,
  IInteractorEvent,
  IRendererService,
  IView,
  RendererSystem,
} from '@antv/g-webgpu-core';
import EventEmitter from 'eventemitter3';
import { Container } from 'inversify';
import { InteractorService } from './InteractorService';

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

      // this.emit('pick', {
      //   id,
      //   x: Math.floor(center.x),
      //   y: Math.floor(center.y),
      // });
    });
    return this;
  }
}
