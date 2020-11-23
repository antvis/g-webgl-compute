import { World } from '@antv/g-webgpu';
import {
  ICamera,
  IDENTIFIER,
  IInteractorEvent,
  IRendererService,
  IView,
  PixelPickingPass,
  RendererSystem,
} from '@antv/g-webgpu-core';
import EventEmitter from 'eventemitter3';
import { Container } from 'inversify';
import { InteractorService } from './InteractorService';

export class PixelPicker extends EventEmitter {
  public static create(world: World) {
    const picker = new PixelPicker();
    const worldContainer = world.getContainer();
    worldContainer
      .rebind(IDENTIFIER.InteractorService)
      .to(InteractorService)
      .inSingletonScope();

    picker.container = worldContainer;
    return picker;
  }

  public container: Container;

  public enableHighlight(enabled: boolean) {
    const renderPassFactory = this.container.get(IDENTIFIER.RenderPassFactory);
    // @ts-ignore
    const pixelPickingPass = renderPassFactory(PixelPickingPass.IDENTIFIER);
    pixelPickingPass.enableHighlight(enabled);
  }

  public setHighlightColor(color: number[]) {
    const renderPassFactory = this.container.get(IDENTIFIER.RenderPassFactory);
    // @ts-ignore
    const pixelPickingPass = renderPassFactory(PixelPickingPass.IDENTIFIER);
    pixelPickingPass.setHighlightColor(color.map((c) => c * 255));
  }

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
      const id = rendererSystem.pick(
        {
          x: center.x,
          y: center.y,
        },
        view,
      );

      this.emit('pick', {
        id,
        x: Math.floor(center.x),
        y: Math.floor(center.y),
      });
    });
    return this;
  }
}
