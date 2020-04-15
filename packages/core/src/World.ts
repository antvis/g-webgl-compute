// tslint:disable-next-line:no-reference
/// <reference path="../../../node_modules/@webgpu/types/dist/index.d.ts" />
// tslint:disable-next-line:no-submodule-imports
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { EventEmitter } from 'eventemitter3';
import { ComponentManager, container, createEntity, Entity, System } from '.';
import { CameraComponent } from './components/camera/CameraComponent';
import { CameraSystem } from './components/camera/System';
import {
  GeometrySystem,
  IBoxGeometryParams,
} from './components/geometry/System';
import { IUniform } from './components/material/MaterialComponent';
import { MaterialSystem } from './components/material/System';
import { IMeshParams, MeshSystem } from './components/mesh/System';
import { ForwardRenderPath } from './components/renderpath/Forward';
import { IRenderPath } from './components/renderpath/RenderPath';
import { SceneSystem } from './components/scene/System';
import { SceneGraphSystem } from './components/scenegraph/System';
import { TransformComponent } from './components/scenegraph/TransformComponent';
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
  private canvas: HTMLCanvasElement;

  private forwardRenderPath: IRenderPath;

  private inited: boolean = false;
  private onInit: ((engine: WebGPUEngine) => void) | null;
  private onUpdate: ((engine: WebGPUEngine) => void) | null;
  private rafHandle: number;
  private useRenderBundle: boolean = false;
  private renderBundleRecorded: boolean = false;
  private renderBundle: GPURenderBundle;

  constructor(
    canvas: HTMLCanvasElement,
    options: {
      useRenderBundle?: boolean;
      engineOptions?: IWebGPUEngineOptions;
      onInit?: (engine: WebGPUEngine) => void;
      onUpdate?: (engine: WebGPUEngine) => void;
    },
  ) {
    super();

    // TODO: fallback to WebGL
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
    this.forwardRenderPath = container.get<IRenderPath>(
      IDENTIFIER.ForwardRenderPath,
    );

    this.canvas = canvas;
    this.init(canvas);
    if (options.onInit) {
      this.onInit = options.onInit;
    }
    if (options.onUpdate) {
      this.onUpdate = options.onUpdate;
    }
    this.useRenderBundle = !!options.useRenderBundle;
  }

  public getCamera(entity: Entity) {
    const manager = container.get<ComponentManager<CameraComponent>>(
      IDENTIFIER.CameraComponentManager,
    );
    return manager.getComponentByEntity(entity);
  }

  public getTransform(entity: Entity) {
    const manager = container.get<ComponentManager<TransformComponent>>(
      IDENTIFIER.TransformComponentManager,
    );
    return manager.getComponentByEntity(entity);
  }

  public createScene(camera: Entity) {
    const sceneSystem = this.systems.find(
      (s) => s.name === IDENTIFIER.SceneSystem,
    );
    return (sceneSystem as SceneSystem).createScene(camera);
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
    return (cameraSystem as CameraSystem).createCamera(cameraParams);
  }

  public createMesh(params: IMeshParams) {
    const meshSystem = this.systems.find(
      (s) => s.name === IDENTIFIER.MeshSystem,
    );
    return (meshSystem as MeshSystem).createMesh(params);
  }

  public createBoxGeometry(params: IBoxGeometryParams) {
    const geometrySystem = this.systems.find(
      (s) => s.name === IDENTIFIER.GeometrySystem,
    );
    return (geometrySystem as GeometrySystem).createBox(params);
  }

  public createBufferGeometry() {
    const geometrySystem = this.systems.find(
      (s) => s.name === IDENTIFIER.GeometrySystem,
    );
    return (geometrySystem as GeometrySystem).createBufferGeometry();
  }

  public createInstancedBufferGeometry(params: { maxInstancedCount: number }) {
    const geometrySystem = this.systems.find(
      (s) => s.name === IDENTIFIER.GeometrySystem,
    );
    return (geometrySystem as GeometrySystem).createInstancedBufferGeometry(
      params,
    );
  }

  public createBasicMaterial() {
    const materialSystem = this.systems.find(
      (s) => s.name === IDENTIFIER.MaterialSystem,
    );
    return (materialSystem as MaterialSystem).createBasicMaterial();
  }

  public createShaderMaterial(vs: string, fs: string) {
    const materialSystem = this.systems.find(
      (s) => s.name === IDENTIFIER.MaterialSystem,
    );
    return (materialSystem as MaterialSystem).createShaderMaterial(vs, fs);
  }

  public createAttribute(
    entity: Entity,
    name: string,
    data: ArrayBufferView,
    descriptor: GPUVertexBufferLayoutDescriptor,
  ) {
    const geometrySystem = this.systems.find(
      (s) => s.name === IDENTIFIER.GeometrySystem,
    );
    return (geometrySystem as GeometrySystem).createAttribute(
      entity,
      name,
      data,
      descriptor,
    );
  }

  public addUniform(entity: Entity, uniform: IUniform) {
    const materialSystem = this.systems.find(
      (s) => s.name === IDENTIFIER.MaterialSystem,
    );
    (materialSystem as MaterialSystem).addUniform(entity, uniform);
  }

  public setUniform(
    materialEntity: Entity,
    uniformName: string,
    data: unknown,
  ) {
    const materialSystem = this.systems.find(
      (s) => s.name === IDENTIFIER.MaterialSystem,
    );
    return (materialSystem as MaterialSystem).setUniform(
      this.engine,
      materialEntity,
      uniformName,
      // @ts-ignore
      data,
    );
  }

  public add(sceneEntity: Entity, meshEntity: Entity) {
    const sceneSystem = this.systems.find(
      (s) => s.name === IDENTIFIER.SceneSystem,
    );

    (sceneSystem as SceneSystem).addMesh(sceneEntity, meshEntity);
  }

  public attach(
    entity: Entity,
    parent: Entity,
    isChildAlreadyInLocalSpace?: boolean,
  ) {
    const sceneGraphSystem = this.systems.find(
      (s) => s.name === IDENTIFIER.SceneGraphSystem,
    );

    (sceneGraphSystem as SceneGraphSystem).attach(
      entity,
      parent,
      isChildAlreadyInLocalSpace,
    );
  }

  public async init(canvas: HTMLCanvasElement) {
    await this.engine.init();
    this.update();
  }

  public update = async () => {
    await this.render();

    this.systems.forEach((system) => {
      if (system.type === CleanupSystem.TYPE) {
        (system as CleanupSystem).cleanup();
      }
    });

    this.rafHandle = window.requestAnimationFrame(this.update);
  };

  public destroy() {
    this.off('init');
    this.off('update');
    this.engine.dispose();
    this.systems.forEach((system) => {
      system.destroy();
      if (system.type === TearDownSystem.TYPE) {
        (system as TearDownSystem).tearDown();
      }
    });

    window.cancelAnimationFrame(this.rafHandle);
  }

  private async render() {
    this.engine.beginFrame();

    if (!this.inited) {
      this.systems.forEach((system) => {
        if (system.type === InitializeSystem.TYPE) {
          (system as InitializeSystem).initialize(this.canvas);
        }
      });
      this.emit('init', this.engine);
      if (this.onInit) {
        await this.onInit(this.engine);
      }
      this.inited = true;
    }

    for (const system of this.systems) {
      if (system.type === ExecuteSystem.TYPE) {
        await (system as ExecuteSystem).execute(this.engine);
      }
    }

    // 录制一遍绘制命令，后续直接播放
    if (this.useRenderBundle) {
      if (!this.renderBundleRecorded) {
        this.engine.startRecordBundle();
        if (this.onUpdate) {
          await this.onUpdate(this.engine);
        }
        this.renderBundle = this.engine.stopRecordBundle();
        this.renderBundleRecorded = true;
      }
      this.engine.executeBundles([this.renderBundle]);
    } else {
      this.emit('update', this.engine);
      if (this.onUpdate) {
        await this.onUpdate(this.engine);
      }

      this.forwardRenderPath.render(this.engine, this.systems);
    }

    this.engine.endFrame();
  }
}
