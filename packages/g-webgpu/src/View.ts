import { ICamera, IScene, IView, IViewport } from '@antv/g-webgpu-core';
import { injectable } from 'inversify';

@injectable()
export class View implements IView {
  private camera: ICamera;
  private scene: IScene;
  private viewport: IViewport = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  public getCamera() {
    return this.camera;
  }

  public getScene() {
    return this.scene;
  }

  public getViewport() {
    return this.viewport;
  }

  public setCamera(camera: ICamera) {
    this.camera = camera;
    return this;
  }

  public setScene(scene: IScene) {
    this.scene = scene;
    return this;
  }

  public setViewport(viewport: IViewport) {
    this.viewport = viewport;
    return this;
  }
}
