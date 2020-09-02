import { CameraComponent } from '@antv/g-webgpu-core';
import Hammer from 'hammerjs';

export interface IMouseData {
  deltaX: number;
  deltaY: number;
  deltaZ: number;
}

export class InteractionSystem {
  public static UP_EVENT = 'mouseup';
  public static MOVE_EVENT = 'mousemove';
  public static DOWN_EVENT = 'mousedown';
  public static OUT_EVENT = 'mouseout';
  public static WHEEL_EVENT = 'mousewheel';

  private isMoving: boolean = false;
  private lastX: number = -1;
  private lastY: number = -1;
  private deltaX: number = 0;
  private deltaY: number = 0;
  private deltaZ: number = 0;

  private hammertime: HammerManager;

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: CameraComponent,
    private onCameraChanged: () => void,
  ) {}

  public initialize() {
    const hammertime = new Hammer(this.canvas);
    hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });
    hammertime.get('pinch').set({ enable: true });
    hammertime.on('panstart', this.onPanstart);
    hammertime.on('panmove', this.onPanmove);
    hammertime.on('panend', this.onPanend);
    hammertime.on('pinch', this.onPinch);
    this.hammertime = hammertime;
    this.canvas.addEventListener('wheel', this.onMousewheel);
  }

  public tearDown() {
    this.hammertime.off('panstart', this.onPanstart);
    this.hammertime.off('panmove', this.onPanmove);
    this.hammertime.off('panend', this.onPanend);
    this.hammertime.off('pinch', this.onPinch);
    this.canvas.removeEventListener('wheel', this.onMousewheel);
  }

  private onPanend = (e: HammerInput) => {
    this.isMoving = false;
  };

  private onPanstart = (e: HammerInput) => {
    this.lastX = e.center.x;
    this.lastY = e.center.y;
    this.isMoving = true;
    this.deltaZ = 0;
  };

  private onPanmove = (e: HammerInput) => {
    if (this.isMoving) {
      this.deltaX = e.center.x - this.lastX;
      this.deltaY = e.center.y - this.lastY;

      this.lastX = e.center.x;
      this.lastY = e.center.y;

      this.onChangeCamera({
        deltaX: this.deltaX,
        // deltaY: this.deltaY,
        deltaY: 0,
        deltaZ: this.deltaZ,
      });
    }
  };

  private onMousewheel = (e: WheelEvent) => {
    this.deltaZ = e.deltaY;
    this.onChangeCamera({
      deltaX: this.deltaX,
      deltaY: this.deltaY,
      deltaZ: this.deltaZ,
    });
  };

  private onPinch = (e: HammerInput) => {
    this.deltaZ = (1 - e.scale) * 10;
  };

  private onChangeCamera = (data: IMouseData) => {
    const { deltaX, deltaY, deltaZ } = data;
    this.camera.rotate(deltaX, deltaY, 0);
    this.camera.dolly(deltaZ);
    this.onCameraChanged();
  };
}
