// tslint:disable-next-line:no-reference
/// <reference path="../../../node_modules/@webgpu/types/dist/index.d.ts" />
import {
  CameraComponent,
  CameraSystem,
  ComponentManager,
  ComputeSystem,
  ComputeType,
  container,
  Entity,
  GeometrySystem,
  IBoxGeometryParams,
  IDENTIFIER,
  IMaterialParams,
  IMeshParams,
  IRenderEngine,
  IRenderPath,
  ISystem,
  IUniform,
  IWebGPUEngineOptions,
  MaterialSystem,
  MeshSystem,
  SceneGraphSystem,
  SceneSystem,
  TransformComponent,
} from '@antv/g-webgpu-core';
import { WebGLEngine, WebGPUEngine } from '@antv/g-webgpu-engine';
// tslint:disable-next-line:no-submodule-imports
import * as WebGPUConstants from '@webgpu/types/dist/constants';

interface ILifeCycle {
  init(canvas: HTMLCanvasElement): void;
  update(): void;
  destroy(): void;
}

export class World implements ILifeCycle {
  private systems: ISystem[];

  private engine: IRenderEngine;
  private canvas: HTMLCanvasElement;

  private forwardRenderPath: IRenderPath;

  private inited: boolean = false;
  private onInit: ((engine: IRenderEngine) => void) | null;
  private onUpdate: ((engine: IRenderEngine) => void) | null;
  private rafHandle: number;
  private useRenderBundle: boolean = false;
  private renderBundleRecorded: boolean = false;
  private renderBundle: GPURenderBundle;

  constructor(
    canvas: HTMLCanvasElement,
    options: Partial<{
      useRenderBundle: boolean;
      engineOptions: IWebGPUEngineOptions;
      onInit: (engine: IRenderEngine) => void;
      onUpdate: (engine: IRenderEngine) => void;
    }> = {},
  ) {
    // TODO: fallback to WebGL
    const engineClazz = !navigator.gpu ? WebGLEngine : WebGPUEngine;

    if (!container.isBound(IDENTIFIER.RenderEngine)) {
      container
        .bind<IRenderEngine>(IDENTIFIER.RenderEngine)
        // @ts-ignore
        .to(engineClazz)
        .inSingletonScope();
    }

    this.engine = container.get<IRenderEngine>(IDENTIFIER.RenderEngine);

    this.systems = container.getAll<ISystem>(IDENTIFIER.Systems);
    this.forwardRenderPath = container.get<IRenderPath>(
      IDENTIFIER.ForwardRenderPath,
    );

    this.canvas = canvas;
    this.init(canvas, options.engineOptions);
    if (options.onInit) {
      this.onInit = options.onInit;
    }
    if (options.onUpdate) {
      this.onUpdate = options.onUpdate;
    }
    this.useRenderBundle = !!options.useRenderBundle;
  }

  public isFloatSupported() {
    return this.engine.isFloatSupported();
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

  public createScene(sceneParams: { camera: Entity }) {
    const sceneSystem = container.getNamed<SceneSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.SceneSystem,
    );
    return sceneSystem.createScene(sceneParams);
  }

  public createCamera(cameraParams: {
    near: number;
    far: number;
    angle: number;
    aspect: number;
  }) {
    const cameraSystem = container.getNamed<CameraSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.CameraSystem,
    );
    return cameraSystem.createCamera(cameraParams);
  }

  public createMesh(params: IMeshParams) {
    const meshSystem = container.getNamed<MeshSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.MeshSystem,
    );
    return meshSystem.createMesh(params);
  }

  public createBoxGeometry(params: IBoxGeometryParams) {
    const geometrySystem = container.getNamed<GeometrySystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.GeometrySystem,
    );
    return geometrySystem.createBox(params);
  }

  public createBufferGeometry(params?: { vertexCount: number }) {
    const geometrySystem = container.getNamed<GeometrySystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.GeometrySystem,
    );
    return geometrySystem.createBufferGeometry(params);
  }

  public createInstancedBufferGeometry(params: {
    maxInstancedCount: number;
    vertexCount: number;
  }) {
    const geometrySystem = container.getNamed<GeometrySystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.GeometrySystem,
    );
    return geometrySystem.createInstancedBufferGeometry(params);
  }

  public createBasicMaterial() {
    const materialSystem = container.getNamed<MaterialSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.MaterialSystem,
    );
    return materialSystem.createBasicMaterial();
  }

  public createShaderMaterial(
    params: {
      vertexShader: string;
      fragmentShader: string;
    } & IMaterialParams,
  ) {
    const materialSystem = container.getNamed<MaterialSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.MaterialSystem,
    );
    return materialSystem.createShaderMaterial(params);
  }

  public setAttribute(
    entity: Entity,
    name: string,
    data: ArrayBufferView,
    descriptor: GPUVertexBufferLayoutDescriptor,
    bufferGetter?: () => GPUBuffer,
  ) {
    const geometrySystem = container.getNamed<GeometrySystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.GeometrySystem,
    );
    return geometrySystem.setAttribute(
      entity,
      name,
      data,
      descriptor,
      bufferGetter,
    );
  }

  public createComputePipeline(params: {
    type?: ComputeType;
    precompiled?: boolean;
    shader: string;
    dispatch: [number, number, number];
    maxIteration?: number;
    onCompleted?: ((particleData: ArrayBufferView) => void) | null;
    onIterationCompleted?: ((iteration: number) => Promise<void>) | null;
  }) {
    const computeSystem = container.getNamed<ComputeSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.ComputeSystem,
    );
    return computeSystem.createComputePipeline({
      ...params,
      type: params.type || 'layout',
    });
  }

  public getPrecompiledBundle(entity: Entity): string {
    const computeSystem = container.getNamed<ComputeSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.ComputeSystem,
    );
    return computeSystem.getPrecompiledBundle(entity);
  }

  public addUniform(entity: Entity, uniform: IUniform) {
    const materialSystem = container.getNamed<MaterialSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.MaterialSystem,
    );
    materialSystem.addUniform(entity, uniform);
  }

  public setUniform(
    materialEntity: Entity,
    uniformName: string,
    data: unknown,
  ) {
    const materialSystem = container.getNamed<MaterialSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.MaterialSystem,
    );
    return materialSystem.setUniform(
      materialEntity,
      uniformName,
      // @ts-ignore
      data,
    );
  }

  public setIndex(entity: Entity, data: ArrayBufferView) {
    const geometrySystem = container.getNamed<GeometrySystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.GeometrySystem,
    );
    geometrySystem.setIndex(entity, data);
  }

  public setBinding(
    entity: Entity,
    name: string,
    data:
      | number
      | number[]
      | Float32Array
      | Uint8Array
      | Uint16Array
      | Uint32Array
      | Int8Array
      | Int16Array
      | Int32Array,
  ) {
    const computeSystem = container.getNamed<ComputeSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.ComputeSystem,
    );

    return computeSystem.setBinding(entity, name, data);
  }

  public async readOutputData(entity: Entity) {
    const computeSystem = container.getNamed<ComputeSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.ComputeSystem,
    );

    return computeSystem.readOutputData(entity);
  }

  public getParticleBuffer(entity: Entity) {
    const computeSystem = container.getNamed<ComputeSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.ComputeSystem,
    );

    return computeSystem.getParticleBuffer(entity);
  }

  public add(sceneEntity: Entity, meshEntity: Entity) {
    const sceneSystem = container.getNamed<SceneSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.SceneSystem,
    );

    sceneSystem.addMesh(sceneEntity, meshEntity);
  }

  public attach(
    entity: Entity,
    parent: Entity,
    isChildAlreadyInLocalSpace?: boolean,
  ) {
    const sceneGraphSystem = container.getNamed<SceneGraphSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.SceneGraphSystem,
    );

    sceneGraphSystem.attach(entity, parent, isChildAlreadyInLocalSpace);
  }

  public async init(
    canvas: HTMLCanvasElement,
    engineOptions?: IWebGPUEngineOptions,
  ) {
    await this.engine.init(canvas, {
      swapChainFormat: WebGPUConstants.TextureFormat.BGRA8Unorm,
      antialiasing: true,
      ...engineOptions,
    });
    await this.update();
  }

  public update = async () => {
    await this.render();

    this.systems.forEach((system) => {
      if (system.cleanup) {
        system.cleanup();
      }
    });

    this.rafHandle = window.requestAnimationFrame(this.update);
  };

  public destroy() {
    this.engine.dispose();
    this.systems.forEach((system) => {
      if (system.tearDown) {
        system.tearDown();
      }
    });

    window.cancelAnimationFrame(this.rafHandle);
  }

  private async render() {
    this.engine.beginFrame();

    // clear first, also start render & compute pass
    this.engine.clear({ r: 0.0, g: 0.0, b: 0.0, a: 1.0 }, true, true, true);

    if (!this.inited) {
      this.systems.forEach((system) => {
        if (system.initialize) {
          system.initialize(this.canvas);
        }
      });
      if (this.onInit) {
        await this.onInit(this.engine);
      }
      this.inited = true;
    }

    for (const system of this.systems) {
      if (system.execute) {
        await system.execute();
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
      if (this.onUpdate) {
        await this.onUpdate(this.engine);
      }

      this.forwardRenderPath.render();
    }

    this.engine.endFrame();
  }
}
