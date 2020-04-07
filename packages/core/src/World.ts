// tslint:disable-next-line:no-reference
/// <reference path="../../../node_modules/@webgpu/types/dist/index.d.ts" />
// tslint:disable-next-line:no-submodule-imports
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { EventEmitter } from 'eventemitter3';
import { container, System } from '.';
import { CameraSystem } from './components/camera/System';
import { IDENTIFIER } from './identifier';
import {
  CleanupSystem,
  ExecuteSystem,
  InitializeSystem,
  TearDownSystem,
} from './System';
import { IWebGPUEngineOptions, WebGPUEngine } from './WebGPUEngine';

interface ILifeCycle {
  init(canvas: HTMLCanvasElement): void;
  update(): void;
  destroy(): void;
}

export class World extends EventEmitter implements ILifeCycle {
  private systems: System[];

  private engine: WebGPUEngine;

  private inited: boolean = false;
  private onInit: (engine: WebGPUEngine) => void;
  private onUpdate: (engine: WebGPUEngine) => void;
  private rafHandle: number;
  private useRenderBundle: boolean = false;
  private renderBundleRecorded: boolean = false;
  private renderBundle: GPURenderBundle;

  constructor(
    canvas: HTMLCanvasElement,
    options: {
      useRenderBundle?: boolean;
      engineOptions?: IWebGPUEngineOptions;
      onInit: (engine: WebGPUEngine) => void;
      onUpdate: (engine: WebGPUEngine) => void;
    },
  ) {
    super();

    if (!navigator.gpu) {
      window.alert('WebGPU is not supported by your browser.');
      return;
    }

    this.engine = new WebGPUEngine(canvas, {
      swapChainFormat: WebGPUConstants.TextureFormat.BGRA8Unorm,
      antialiasing: true,
      ...options.engineOptions,
    });

    this.systems = container.getAll<System>(IDENTIFIER.Systems);
    this.init(canvas);
    this.onInit = options.onInit;
    this.onUpdate = options.onUpdate;
    this.useRenderBundle = !!options.useRenderBundle;
  }

  public createCamera(cameraParams: {
    near: number;
    far: number;
    angle: number;
    aspect: number;
  }) {
    const cameraSystem = this.systems.find(
      (s) => s.name === IDENTIFIER.CameraSystem,
    );
    if (cameraSystem) {
      return (cameraSystem as CameraSystem).createCamera(cameraParams);
    }
    return null;
  }

  public async init(canvas: HTMLCanvasElement) {
    await this.engine.init();

    this.systems.forEach((system) => {
      if (system.type === InitializeSystem.TYPE) {
        (system as InitializeSystem).initialize(canvas);
      }
    });

    this.update();
  }

  public update = async () => {
    this.systems.forEach((system) => {
      if (system.type === ExecuteSystem.TYPE) {
        (system as ExecuteSystem).execute();
      }
    });

    this.systems.forEach((system) => {
      if (system.type === CleanupSystem.TYPE) {
        (system as CleanupSystem).cleanup();
      }
    });

    await this.render();

    this.rafHandle = window.requestAnimationFrame(this.update);
  };

  public destroy() {
    this.off('init');
    this.off('update');
    this.engine.dispose();
    this.systems.forEach((system) => {
      if (system.type === TearDownSystem.TYPE) {
        (system as TearDownSystem).tearDown();
      }
    });

    window.cancelAnimationFrame(this.rafHandle);
  }

  private async render() {
    this.engine.beginFrame();

    if (!this.inited) {
      this.emit('init', this.engine);
      await this.onInit(this.engine);
      this.inited = true;
    }

    // 录制一遍绘制命令，后续直接播放
    if (this.useRenderBundle) {
      if (!this.renderBundleRecorded) {
        this.engine.startRecordBundle();
        await this.onUpdate(this.engine);
        this.renderBundle = this.engine.stopRecordBundle();
        this.renderBundleRecorded = true;
      }
      this.engine.executeBundles([this.renderBundle]);
    } else {
      this.emit('update', this.engine);
      await this.onUpdate(this.engine);
    }

    this.engine.endFrame();
  }
}
