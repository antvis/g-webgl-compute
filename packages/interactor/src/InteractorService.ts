import { IInteractorEvent, IInteractorService } from '@antv/g-webgpu-core';
import EventEmitter from 'eventemitter3';
import Hammer from 'hammerjs';
import { injectable } from 'inversify';

@injectable()
export class InteractorService extends EventEmitter
  implements IInteractorService {
  private connected: boolean = true;
  private canvas: HTMLCanvasElement;
  private hammertime: HammerManager;

  public listen(canvas: HTMLCanvasElement) {
    if (this.canvas === canvas) {
      return;
    }

    this.canvas = canvas;
    const hammertime = new Hammer(canvas);
    hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });
    hammertime.get('pinch').set({ enable: true });
    hammertime.on('panstart', this.onPanstart);
    hammertime.on('panmove', this.onPanmove);
    hammertime.on('panend', this.onPanend);
    hammertime.on('pinch', this.onPinch);
    this.hammertime = hammertime;
    canvas.addEventListener('wheel', this.onMousewheel);
    canvas.addEventListener('mousemove', this.onHover);
    document.addEventListener('keyup', this.onKeyup);
    document.addEventListener('keydown', this.onKeydown);
  }

  public connect() {
    this.connected = true;
  }
  public disconnect() {
    this.connected = false;
  }

  public destroy() {
    this.hammertime.off('panstart', this.onPanstart);
    this.hammertime.off('panmove', this.onPanmove);
    this.hammertime.off('panend', this.onPanend);
    this.hammertime.off('pinch', this.onPinch);
    this.canvas.removeEventListener('wheel', this.onMousewheel);
    document.removeEventListener('keyup', this.onKeyup);
    document.removeEventListener('keydown', this.onKeydown);
  }

  private onHover = (e: MouseEvent) => {
    if (this.connected) {
      this.emit(
        IInteractorEvent.HOVER,
        this.offset({ x: e.clientX, y: e.clientY }),
      );
    }
  };

  private onKeyup = (e: KeyboardEvent) => {
    if (this.connected) {
      this.emit(IInteractorEvent.KEYUP, e.code);
    }
  };

  private onKeydown = (e: KeyboardEvent) => {
    if (this.connected) {
      this.emit(IInteractorEvent.KEYDOWN, e.code, {
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
      });
    }
  };

  private onPanend = (e: HammerInput) => {
    if (this.connected) {
      this.emit(IInteractorEvent.PANEND, this.offset(e.center));
    }
  };

  private onPanstart = (e: HammerInput) => {
    if (this.connected) {
      this.emit(IInteractorEvent.PANSTART, this.offset(e.center));
    }
  };

  private onPanmove = (e: HammerInput) => {
    if (this.connected) {
      this.emit(IInteractorEvent.PANMOVE, this.offset(e.center), {
        altKey: e.srcEvent.altKey,
        shiftKey: e.srcEvent.shiftKey,
        ctrlKey: e.srcEvent.ctrlKey,
        metaKey: e.srcEvent.metaKey,
      });
    }
  };

  private onMousewheel = (e: WheelEvent) => {
    if (this.connected) {
      this.emit(
        IInteractorEvent.PINCH,
        e.deltaY,
        this.offset({ x: e.clientX, y: e.clientY }),
      );
    }
  };

  private onPinch = (e: HammerInput) => {
    if (this.connected) {
      const deltaZ = (1 - e.scale) * 10;
      this.emit(IInteractorEvent.PINCH, deltaZ, this.offset(e.center));
    }
  };

  private offset(center: { x: number; y: number }) {
    let x = center.x;
    let y = center.y;
    const { top, left } = this.canvas.getBoundingClientRect();

    x = x - left - this.canvas.clientLeft;
    y = y - top - this.canvas.clientTop;

    return { x, y };
  }
}
