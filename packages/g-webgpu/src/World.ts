// tslint:disable-next-line:no-reference
/// <reference path="../../../node_modules/@webgpu/types/dist/index.d.ts" />
import {
  BufferData,
  CameraComponent,
  CameraSystem,
  ComponentManager,
  ComputeSystem,
  ComputeType,
  // container,
  createContainerModule,
  Entity,
  GeometrySystem,
  IBoxGeometryParams,
  IConfig,
  IConfigService,
  IDENTIFIER,
  IMeshParams,
  IRendererConfig,
  IRendererService,
  IShaderModuleService,
  ISystem,
  IUniform,
  MaterialSystem,
  MeshSystem,
  PixelPickingPass,
  SceneGraphSystem,
  SceneSystem,
  TransformComponent,
} from '@antv/g-webgpu-core';
import { WebGLEngine, WebGPUEngine } from '@antv/g-webgpu-engine';
// tslint:disable-next-line:no-submodule-imports
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { Container, ContainerModule } from 'inversify';
import { createCanvas } from './utils/canvas';

interface ILifeCycle {
  init(canvas: HTMLCanvasElement): void;
  update(): void;
  destroy(): void;
}

export class World implements ILifeCycle {
  private systems: ISystem[];

  private engine: IRendererService;
  private canvas: HTMLCanvasElement;

  private inited: boolean = false;
  private destroyed: boolean = false;
  private onInit: ((engine: IRendererService) => void) | null;
  private onUpdate: ((engine: IRendererService) => void) | null;
  private rafHandle: number;
  private containerModule: ContainerModule;
  private container: Container;
  private useRenderBundle: boolean = false;
  private renderBundleRecorded: boolean = false;
  private renderBundle: GPURenderBundle;

  constructor(options: Partial<IConfig> = {}) {
    this.container = new Container();
    const containerModule = createContainerModule();
    this.containerModule = containerModule;
    this.container.load(containerModule);

    // TODO: fallback to WebGL
    const engineClazz = !navigator.gpu ? WebGLEngine : WebGPUEngine;

    if (!this.container.isBound(IDENTIFIER.RenderEngine)) {
      this.container
        .bind<IRendererService>(IDENTIFIER.RenderEngine)
        // @ts-ignore
        .to(engineClazz)
        .inSingletonScope();
    }

    this.engine = this.container.get<IRendererService>(IDENTIFIER.RenderEngine);

    const configService = this.container.get<IConfigService>(
      IDENTIFIER.ConfigService,
    );
    configService.set(options);

    this.systems = this.container.getAll<ISystem>(IDENTIFIER.Systems);

    this.canvas = options.canvas || createCanvas();
    this.init(this.canvas, options.engineOptions);
    if (options.onInit) {
      this.onInit = options.onInit;
    }
    if (options.onUpdate) {
      this.onUpdate = options.onUpdate;
    }
    this.useRenderBundle = !!options.useRenderBundle;
  }

  public getCamera(entity: Entity) {
    const manager = this.container.get<ComponentManager<CameraComponent>>(
      IDENTIFIER.CameraComponentManager,
    );
    return manager.getComponentByEntity(entity);
  }

  public getTransform(entity: Entity) {
    const manager = this.container.get<ComponentManager<TransformComponent>>(
      IDENTIFIER.TransformComponentManager,
    );
    return manager.getComponentByEntity(entity);
  }

  public createScene(sceneParams: { camera: Entity }) {
    const sceneSystem = this.container.getNamed<SceneSystem>(
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
    const cameraSystem = this.container.getNamed<CameraSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.CameraSystem,
    );
    return cameraSystem.createCamera(cameraParams);
  }

  public createMesh(params: IMeshParams) {
    const meshSystem = this.container.getNamed<MeshSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.MeshSystem,
    );
    return meshSystem.createMesh(params);
  }

  public createBoxGeometry(params: IBoxGeometryParams) {
    const geometrySystem = this.container.getNamed<GeometrySystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.GeometrySystem,
    );
    return geometrySystem.createBox(params);
  }

  public createBufferGeometry(params?: { vertexCount: number }) {
    const geometrySystem = this.container.getNamed<GeometrySystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.GeometrySystem,
    );
    return geometrySystem.createBufferGeometry(params);
  }

  public createInstancedBufferGeometry(params: {
    maxInstancedCount: number;
    vertexCount: number;
  }) {
    const geometrySystem = this.container.getNamed<GeometrySystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.GeometrySystem,
    );
    return geometrySystem.createInstancedBufferGeometry(params);
  }

  public createBasicMaterial() {
    const materialSystem = this.container.getNamed<MaterialSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.MaterialSystem,
    );
    return materialSystem.createBasicMaterial();
  }

  public createShaderMaterial(params: {
    vertexShader: string;
    fragmentShader: string;
  }) {
    const materialSystem = this.container.getNamed<MaterialSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.MaterialSystem,
    );
    return materialSystem.createShaderMaterial(params);
  }

  public setAttribute(
    entity: Entity,
    name: string,
    data: BufferData,
    descriptor: GPUVertexBufferLayoutDescriptor,
    bufferGetter?: () => GPUBuffer,
  ) {
    const geometrySystem = this.container.getNamed<GeometrySystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.GeometrySystem,
    );
    return geometrySystem.setAttribute(
      entity,
      name,
      data,
      descriptor,
      // @ts-ignore
      bufferGetter,
    );
  }

  public createComputePipeline(params: {
    type?: ComputeType;
    precompiled?: boolean;
    shader: string;
    dispatch: [number, number, number];
    maxIteration?: number;
    onCompleted?:
      | ((
          particleData:
            | Float32Array
            | Float64Array
            | Int8Array
            | Uint8Array
            | Uint8ClampedArray
            | Int16Array
            | Uint16Array
            | Int32Array
            | Uint32Array,
        ) => void)
      | null;
    onIterationCompleted?: ((iteration: number) => Promise<void>) | null;
  }) {
    const computeSystem = this.container.getNamed<ComputeSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.ComputeSystem,
    );
    return computeSystem.createComputePipeline({
      ...params,
      type: params.type || 'layout',
    });
  }

  public getPrecompiledBundle(entity: Entity): string {
    const computeSystem = this.container.getNamed<ComputeSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.ComputeSystem,
    );
    return computeSystem.getPrecompiledBundle(entity);
  }

  // public addUniform(entity: Entity, uniform: IUniform) {
  //   const materialSystem = container.getNamed<MaterialSystem>(
  //     IDENTIFIER.Systems,
  //     IDENTIFIER.MaterialSystem,
  //   );
  //   materialSystem.addUniform(entity, uniform);
  // }

  public setUniform(
    materialEntity: Entity,
    uniformName: string,
    data: BufferData,
  ) {
    const materialSystem = this.container.getNamed<MaterialSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.MaterialSystem,
    );
    return materialSystem.setUniform(materialEntity, uniformName, data);
  }

  public setIndex(
    entity: Entity,
    data: number[] | Uint8Array | Uint16Array | Uint32Array,
  ) {
    const geometrySystem = this.container.getNamed<GeometrySystem>(
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
      | Int32Array
      | {
          entity: Entity;
        },
  ) {
    const computeSystem = this.container.getNamed<ComputeSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.ComputeSystem,
    );

    return computeSystem.setBinding(entity, name, data);
  }

  public async readOutputData(entity: Entity) {
    const computeSystem = this.container.getNamed<ComputeSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.ComputeSystem,
    );

    return computeSystem.readOutputData(entity);
  }

  public add(sceneEntity: Entity, meshEntity: Entity) {
    const sceneSystem = this.container.getNamed<SceneSystem>(
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
    const sceneGraphSystem = this.container.getNamed<SceneGraphSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.SceneGraphSystem,
    );

    sceneGraphSystem.attach(entity, parent, isChildAlreadyInLocalSpace);
  }

  public async init(
    canvas: HTMLCanvasElement,
    engineOptions?: IRendererConfig,
  ) {
    // TODO: 目前仅针对 WebGL 进行模块化处理
    if (!this.engine.supportWebGPU) {
      // 初始化 shader module
      const shaderModule = this.container.get<IShaderModuleService>(
        IDENTIFIER.ShaderModuleService,
      );
      shaderModule.registerBuiltinModules();
    }

    await this.engine.init({
      canvas,
      swapChainFormat: WebGPUConstants.TextureFormat.BGRA8Unorm,
      antialiasing: false,
      ...engineOptions,
    });

    await this.update();
  }

  public update = async () => {
    if (this.destroyed) {
      return;
    }

    await this.render();

    this.systems.forEach((system) => {
      if (system.cleanup) {
        system.cleanup();
      }
    });

    // 考虑运行在 Worker 中，不能使用 window.requestAnimationFrame
    this.rafHandle = requestAnimationFrame(this.update);
  };

  public destroy() {
    this.destroyed = true;
    if (this.engine) {
      this.engine.destroy();
    }
    this.systems.forEach((system) => {
      if (system.tearDown) {
        system.tearDown();
      }
    });

    cancelAnimationFrame(this.rafHandle);
    this.container.unload(this.containerModule);
  }

  public setSize(width: number, height: number) {
    const canvas = this.engine.getCanvas();
    const pixelRatio = window.devicePixelRatio;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    this.engine.viewport({
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    });
  }

  public pick(position: { x: number; y: number }): number | undefined {
    const pickingPass = this.container.getNamed(
      IDENTIFIER.RenderPass,
      PixelPickingPass.IDENTIFIER,
    );

    // @ts-ignore
    return pickingPass.pick(position);
  }

  private async render() {
    this.engine.beginFrame();

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

    if (this.onUpdate) {
      await this.onUpdate(this.engine);
    }

    // 录制一遍绘制命令，后续直接播放
    // if (this.useRenderBundle) {
    //   if (!this.renderBundleRecorded) {
    //     this.engine.startRecordBundle();
    //     if (this.onUpdate) {
    //       await this.onUpdate(this.engine);
    //     }
    //     this.renderBundle = this.engine.stopRecordBundle();
    //     this.renderBundleRecorded = true;
    //   }
    //   this.engine.executeBundles([this.renderBundle]);
    // } else {
    //   if (this.onUpdate) {
    //     await this.onUpdate(this.engine);
    //   }
    // }

    this.engine.endFrame();
  }
}
