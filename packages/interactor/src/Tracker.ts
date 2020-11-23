import { World } from '@antv/g-webgpu';
import {
  ICamera,
  IDENTIFIER,
  IInteractorEvent,
  IRendererService,
  IView,
} from '@antv/g-webgpu-core';
import { Container } from 'inversify';
import { InteractorService } from './InteractorService';

const MOTION_FACTOR = 10;
// https://gist.github.com/handleman/3c99e754065f647b082f
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export class Tracker {
  public static create(world: World) {
    const tracker = new Tracker();
    const worldContainer = world.getContainer();
    worldContainer
      .rebind(IDENTIFIER.InteractorService)
      .to(InteractorService)
      .inSingletonScope();
    tracker.container = worldContainer;
    return tracker;
  }

  public container: Container;
  private isMoving: boolean = false;
  private lastX: number = -1;
  private lastY: number = -1;
  private ctrlKey: boolean;
  private shiftKey: boolean;
  private altKey: boolean;

  private canvas: HTMLCanvasElement;
  private views: IView[] = [];
  private attached = false;

  public detachControl(...views: IView[]) {
    for (const view of views) {
      const index = this.views.indexOf(view);
      this.views = this.views.splice(index, 1);
    }
    return this;
  }

  public attachControl(...views: IView[]) {
    for (const view of views) {
      if (this.views.indexOf(view) === -1) {
        this.views.push(view);
      }
    }

    if (this.attached) {
      return this;
    }

    const engine = this.container.get<IRendererService>(
      IDENTIFIER.RenderEngine,
    );
    this.canvas = engine.getCanvas();
    const interactor = this.container.get<InteractorService>(
      IDENTIFIER.InteractorService,
    );
    interactor.listen(this.canvas);

    interactor.on(IInteractorEvent.PANEND, () => {
      this.isMoving = false;
    });

    interactor.on(
      IInteractorEvent.PANSTART,
      (center: { x: number; y: number }) => {
        this.lastX = center.x;
        this.lastY = center.y;
        this.isMoving = true;
      },
    );

    interactor.on(
      IInteractorEvent.PANMOVE,
      (
        center: { x: number; y: number },
        { altKey, shiftKey, ctrlKey, metaKey },
      ) => {
        this.ctrlKey = ctrlKey;
        if (isMac && metaKey) {
          this.ctrlKey = true;
        }
        this.altKey = altKey;
        this.shiftKey = shiftKey;

        if (this.isMoving) {
          const deltaX = center.x - this.lastX;
          const deltaY = center.y - this.lastY;
          this.lastX = center.x;
          this.lastY = center.y;

          const effectedViews = this.getViewsByEventCenter(center);

          if (this.ctrlKey && !this.shiftKey) {
            effectedViews.forEach((view) => {
              this.dolly(view.getCamera(), deltaY);
            });
          } else if (this.shiftKey && !this.ctrlKey) {
            effectedViews.forEach((view) => {
              this.pan(view.getCamera(), deltaX, deltaY);
            });
          } else if (this.ctrlKey && this.shiftKey) {
            effectedViews.forEach((view) => {
              this.roll(view.getCamera(), deltaY);
            });
          } else {
            effectedViews.forEach((view) => {
              this.rotate(view.getCamera(), deltaX, deltaY);
            });
          }
        }
      },
    );

    interactor.on(
      IInteractorEvent.PINCH,
      (delta: number, center: { x: number; y: number }) => {
        this.getViewsByEventCenter(center).forEach((view) => {
          this.dolly(view.getCamera(), delta);
        });
      },
    );

    interactor.on(IInteractorEvent.KEYDOWN, (key: string) => {
      switch (key) {
        case 'CtrlLeft':
          this.ctrlKey = false;
          break;
        case 'CtrlRight':
          this.ctrlKey = false;
          break;
      }
    });

    interactor.on(
      IInteractorEvent.KEYDOWN,
      (key: string, { altKey, shiftKey, ctrlKey }) => {
        this.altKey = altKey;
        this.shiftKey = shiftKey;

        if (!this.altKey && !this.shiftKey) {
          switch (key) {
            case 'ArrowLeft':
              for (const view of this.views) {
                view.getCamera().changeAzimuth(-10);
              }
              break;
            case 'ArrowUp':
              for (const view of this.views) {
                view.getCamera().changeElevation(10);
              }
              break;
            case 'ArrowRight':
              for (const view of this.views) {
                view.getCamera().changeAzimuth(10);
              }
              break;
            case 'ArrowDown':
              for (const view of this.views) {
                view.getCamera().changeElevation(-10);
              }
              break;
          }
        } else if (this.shiftKey && key !== 'CtrlLeft' && key !== 'CtrlRight') {
          let px = 0;
          let py = 0;
          switch (key) {
            case 'ArrowLeft':
              px = -10;
              break;
            case 'ArrowUp':
              py = -10;
              break;
            case 'ArrowRight':
              px = 10;
              break;
            case 'ArrowDown':
              py = 10;
              break;
          }
          if (px !== 0 || py !== 0) {
            for (const view of this.views) {
              this.pan(view.getCamera(), px, py);
            }
          }
        }
      },
    );

    this.attached = true;
    return this;
  }

  private rotate(camera: ICamera, rx: number, ry: number) {
    const dx = -20.0 / this.canvas.height;
    const dy = -20.0 / this.canvas.width;
    let motionFactorX = MOTION_FACTOR;
    let motionFactorY = MOTION_FACTOR;
    if (rx * rx > 2 * ry * ry) {
      motionFactorY *= 0.5;
    } else if (ry * ry > 2 * rx * rx) {
      motionFactorX *= 0.5;
    }

    const rotX = rx * dx * motionFactorX;
    const rotY = ry * dy * motionFactorY;

    camera.rotate(rotX, rotY, 0);
  }

  private dolly(camera: ICamera, z: number) {
    camera.dolly(z);
  }

  private pan(camera: ICamera, dx: number, dy: number) {
    const dimMax = Math.max(this.canvas.width, this.canvas.height);
    const deltaX = 1 / dimMax;
    const deltaY = 1 / dimMax;
    const ndx = (dx * deltaX * MOTION_FACTOR) / 2;
    const ndy = (-dy * deltaY * MOTION_FACTOR) / 2;

    camera.pan(ndx, ndy);
  }

  private roll(camera: ICamera, dy: number) {
    camera.rotate(0, 0, (-20.0 / this.canvas.width) * dy * MOTION_FACTOR);
  }

  private getViewsByEventCenter(center: { x: number; y: number }) {
    return this.views.filter((view) => {
      const { x, y, width, height } = view.getViewport();
      const dpr = window.devicePixelRatio;
      return (
        center.x * dpr >= x &&
        center.x * dpr <= x + width &&
        center.y * dpr >= y &&
        center.y * dpr <= y + height
      );
    });
  }
}
