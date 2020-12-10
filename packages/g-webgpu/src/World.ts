// tslint:disable-next-line:no-reference
/// <reference path="../../../node_modules/@webgpu/types/dist/index.d.ts" />
import {
  ComponentManager,
  createEntity,
  createWorldContainer,
  Entity,
  GeometrySystem,
  // container,
  IConfig,
  IConfigService,
  IDENTIFIER,
  IInteractorService,
  IRendererService,
  ISystem,
  ITexture2D,
  ITexture2DInitializationOptions,
  KernelBundle,
  MaterialSystem,
  MeshComponent,
  TransformComponent,
} from '@antv/g-webgpu-core';
import { WebGLEngine, WebGPUEngine } from '@antv/g-webgpu-engine';
// tslint:disable-next-line:no-submodule-imports
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { Container, inject, injectable } from 'inversify';
import { Camera } from './camera/Camera';
import { Geometry, IGeometry } from './geometry';
import { Box } from './geometry/Box';
import { Merged } from './geometry/Merged';
import { Plane } from './geometry/Plane';
import { Sphere } from './geometry/Sphere';
import { Kernel } from './Kernel';
import { IMaterial, Material } from './material';
import { Basic } from './material/basic';
import { Grid } from './renderable/grid';
import { Line } from './renderable/line';
import { Point } from './renderable/point';
import { IRenderable, Renderable } from './renderable/Renderable';
import { Renderer } from './Renderer';
import { Scene } from './Scene';
import { TextureCache } from './texture/Cache';
import { Texture2D } from './texture/Texture2D';
import { createCanvas } from './utils/canvas';
import { View } from './View';

@injectable()
export class World {
  public static create(config: Partial<IConfig> = {}) {
    const worldContainer = createWorldContainer();

    // bind render engine, fallback to WebGL
    const engineClazz = !navigator.gpu ? WebGLEngine : WebGPUEngine;
    if (!worldContainer.isBound(IDENTIFIER.RenderEngine)) {
      worldContainer
        .bind<IRendererService>(IDENTIFIER.RenderEngine)
        // @ts-ignore
        .to(engineClazz)
        .inSingletonScope();
    }

    worldContainer.bind(Renderer).toSelf();
    worldContainer.bind(Kernel).toSelf();
    worldContainer.bind(Renderable).toSelf();
    worldContainer.bind(View).toSelf();
    worldContainer.bind(Camera).toSelf();
    worldContainer.bind(Scene).toSelf();
    worldContainer.bind(World).toSelf();
    worldContainer.bind(TextureCache).toSelf();
    worldContainer.bind(Texture2D).toSelf();

    // bind geometries
    worldContainer
      .bind<IGeometry<unknown>>(IDENTIFIER.Geometry)
      .to(Box)
      .whenTargetNamed(Geometry.BOX);
    worldContainer
      .bind<IGeometry<unknown>>(IDENTIFIER.Geometry)
      .to(Sphere)
      .whenTargetNamed(Geometry.SPHERE);
    worldContainer
      .bind<IGeometry<unknown>>(IDENTIFIER.Geometry)
      .to(Plane)
      .whenTargetNamed(Geometry.PLANE);
    worldContainer
      .bind<IGeometry<unknown>>(IDENTIFIER.Geometry)
      .to(Merged)
      .whenTargetNamed(Geometry.MERGED);

    // bind materials
    worldContainer
      .bind<IMaterial<unknown>>(IDENTIFIER.Material)
      .to(Basic)
      .whenTargetNamed(Material.BASIC);

    // bind renderables
    worldContainer
      .bind<IRenderable<unknown>>(IDENTIFIER.Renderable)
      .to(Point)
      .whenTargetNamed(Renderable.POINT);
    worldContainer
      .bind<IRenderable<unknown>>(IDENTIFIER.Renderable)
      .to(Line)
      .whenTargetNamed(Renderable.LINE);
    worldContainer
      .bind<IRenderable<unknown>>(IDENTIFIER.Renderable)
      .to(Grid)
      .whenTargetNamed(Renderable.GRID);

    const world = worldContainer.get(World);
    world.setContainer(worldContainer);
    world.setConfig(config);
    return world;
  }

  @inject(IDENTIFIER.ConfigService)
  private readonly configService: IConfigService;

  private container: Container;

  public async getEngine() {
    const engine = this.container.get<IRendererService>(
      IDENTIFIER.RenderEngine,
    );
    const { canvas, engineOptions } = this.configService.get();
    await engine.init({
      canvas: canvas || createCanvas(),
      swapChainFormat: WebGPUConstants.TextureFormat.BGRA8Unorm,
      antialiasing: false,
      ...engineOptions,
    });
    return engine;
  }

  /**
   * get transform component
   * @param entity
   */
  public getTransformComponent(entity: Entity) {
    const manager = this.container.get<ComponentManager<TransformComponent>>(
      IDENTIFIER.TransformComponentManager,
    );
    return manager.getComponentByEntity(entity);
  }

  public getMeshComponent(entity: Entity) {
    const manager = this.container.get<ComponentManager<MeshComponent>>(
      IDENTIFIER.MeshComponentManager,
    );
    return manager.getComponentByEntity(entity);
  }

  public setConfig(config: Partial<IConfig>) {
    this.configService.set(config);
  }

  public setContainer(container: Container) {
    this.container = container;
  }

  public getContainer() {
    return this.container;
  }

  public createEntity() {
    return createEntity();
  }

  public createScene() {
    return this.container.get(Scene);
  }

  public createCamera() {
    return this.container.get(Camera);
  }

  public createView() {
    return this.container.get(View);
  }

  // public createLight(type: string,) {
  //   return this.container.getNamed(IDENTIFIER.Light, type)
  // }

  public createRenderable<T>(type?: string, config?: T) {
    const renderable: Renderable = type
      ? this.container.getNamed(IDENTIFIER.Renderable, type)
      : this.container.get(Renderable);
    const entity = createEntity();
    renderable.setConfig(config || {});
    renderable.setEntity(entity);
    return renderable;
  }

  public createGeometry<T>(type: string, config?: T) {
    const geometry: Geometry = this.container.getNamed(
      IDENTIFIER.Geometry,
      type,
    );
    const entity = createEntity();
    geometry.setConfig(config || {});
    geometry.setEntity(entity);
    return geometry.getComponent();
  }

  public createMaterial<T>(type: string, config?: T) {
    const material: Material = this.container.getNamed(
      IDENTIFIER.Material,
      type,
    );
    const entity = createEntity();
    material.setConfig(config || {});
    material.setEntity(entity, type);
    return material.getComponent();
  }

  public createTexture2D(
    config: ITexture2DInitializationOptions & { url: string },
  ) {
    const texture = this.container.get(Texture2D);
    texture.setConfig(config);
    return texture;
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

  public createKernel(precompiledBundle: KernelBundle | string) {
    const kernel = this.container.get(Kernel);
    if (typeof precompiledBundle === 'string') {
      kernel.setBundle(JSON.parse(precompiledBundle));
    } else {
      kernel.setBundle(precompiledBundle);
    }
    kernel.init();
    return kernel;
  }

  public createRenderer() {
    const renderer = this.container.get(Renderer);
    renderer.container = this.container;
    renderer.init();
    return renderer;
  }

  public destroy() {
    const systems = this.container.getAll<ISystem>(IDENTIFIER.Systems);
    systems.forEach((system) => {
      if (system.tearDown) {
        system.tearDown();
      }
    });
    const engine = this.container.get<IRendererService>(
      IDENTIFIER.RenderEngine,
    );
    engine.destroy();
    const interactor = this.container.get<IInteractorService>(
      IDENTIFIER.InteractorService,
    );
    interactor.destroy();
  }
}
