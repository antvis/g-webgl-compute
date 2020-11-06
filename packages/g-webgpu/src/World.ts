// tslint:disable-next-line:no-reference
/// <reference path="../../../node_modules/@webgpu/types/dist/index.d.ts" />
import {
  ComponentManager,
  createEntity,
  Entity,
  GeometrySystem,
  // container,
  IBoxGeometryParams,
  IConfig,
  IConfigService,
  IDENTIFIER,
  IRendererService,
  ISystem,
  KernelBundle,
  MaterialSystem,
  TransformComponent,
} from '@antv/g-webgpu-core';
// tslint:disable-next-line:no-submodule-imports
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { Container, ContainerModule, inject, injectable } from 'inversify';
import { container } from '.';
import { Camera } from './Camera';
import { Kernel } from './Kernel';
import { Renderable } from './Renderable';
import { Renderer } from './Renderer';
import { Scene } from './Scene';
import { createCanvas } from './utils/canvas';
import { View } from './View';

@injectable()
export class World {
  public static create(config: Partial<IConfig> = {}) {
    const world = container.get(World);
    world.setConfig(config);
    return world;
  }

  @inject(IDENTIFIER.ConfigService)
  private readonly configService: IConfigService;

  public async getEngine() {
    const engine = container.get<IRendererService>(IDENTIFIER.RenderEngine);
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
    const manager = container.get<ComponentManager<TransformComponent>>(
      IDENTIFIER.TransformComponentManager,
    );
    return manager.getComponentByEntity(entity);
  }

  public setConfig(config: Partial<IConfig>) {
    this.configService.set(config);
  }

  public createEntity() {
    return createEntity();
  }

  public createScene() {
    return container.get(Scene);
  }

  public createCamera() {
    return new Camera();
  }

  public createView() {
    return container.get(View);
  }

  public createRenderable(entity: Entity) {
    const renderable = container.get(Renderable);
    renderable.setEntity(entity);
    return renderable;
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

  public createShaderMaterial(params: {
    vertexShader: string;
    fragmentShader: string;
  }) {
    const materialSystem = container.getNamed<MaterialSystem>(
      IDENTIFIER.Systems,
      IDENTIFIER.MaterialSystem,
    );
    return materialSystem.createShaderMaterial(params);
  }

  public createKernel(precompiledBundle: KernelBundle | string) {
    const kernel = container.get(Kernel);
    if (typeof precompiledBundle === 'string') {
      kernel.setBundle(JSON.parse(precompiledBundle));
    } else {
      kernel.setBundle(precompiledBundle);
    }
    kernel.init();
    return kernel;
  }

  public createRenderer() {
    const renderer = container.get(Renderer);
    renderer.init();
    return renderer;
  }

  public destroy() {
    const systems = container.getAll<ISystem>(IDENTIFIER.Systems);
    systems.forEach((system) => {
      if (system.tearDown) {
        system.tearDown();
      }
    });
    const engine = container.get<IRendererService>(IDENTIFIER.RenderEngine);
    engine.destroy();
    // container.unload(containerModule);
  }

  // public pick(position: { x: number; y: number }): number | undefined {
  //   const pickingPass = this.container.getNamed(
  //     IDENTIFIER.RenderPass,
  //     PixelPickingPass.IDENTIFIER,
  //   );

  //   // @ts-ignore
  //   return pickingPass.pick(position);
  // }
}
