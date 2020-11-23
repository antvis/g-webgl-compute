/**
 * Root Container
 * @see /dev-docs/IoC 容器、依赖注入与服务说明.md
 */
import 'reflect-metadata';

import { EventEmitter } from 'eventemitter3';
import {
  Container,
  ContainerModule,
  decorate,
  injectable,
  interfaces,
} from 'inversify';
import getDecorators from 'inversify-inject-decorators';
import { ISystem } from '.';
import { ComponentManager } from './ComponentManager';
import { ResourcePool } from './components/framegraph/ResourcePool';
import { FrameGraphSystem } from './components/framegraph/System';
import { GeometryComponent } from './components/geometry/GeometryComponent';
import { GeometrySystem } from './components/geometry/System';
// import { InteractionSystem } from './components/interaction/System';
import { MaterialComponent } from './components/material/MaterialComponent';
import { MaterialSystem } from './components/material/System';
import { CullableComponent } from './components/mesh/CullableComponent';
import { MeshComponent } from './components/mesh/MeshComponent';
import { MeshSystem } from './components/mesh/System';
import { CopyPass } from './components/renderer/passes/CopyPass';
import { IRenderPass } from './components/renderer/passes/IRenderPass';
import { PixelPickingPass } from './components/renderer/passes/PixelPickingPass';
import { RenderPass } from './components/renderer/passes/RenderPass';
import { RendererSystem } from './components/renderer/System';
import { HierarchyComponent } from './components/scenegraph/HierarchyComponent';
import { NameComponent } from './components/scenegraph/NameComponent';
import { SceneGraphSystem } from './components/scenegraph/System';
import { TransformComponent } from './components/scenegraph/TransformComponent';
import { IDENTIFIER } from './identifier';
import { ConfigService } from './services/config/ConfigService';
import { InteractorService } from './services/interactor/IteractorService';
import ShaderModuleService from './services/shader-module/ShaderModuleService';

// @see https://github.com/inversify/InversifyJS/blob/master/wiki/container_api.md#defaultscope
export const container = new Container();

// @see https://github.com/inversify/InversifyJS/blob/master/wiki/inheritance.md#what-can-i-do-when-my-base-class-is-provided-by-a-third-party-module
decorate(injectable(), EventEmitter);
container.bind(IDENTIFIER.IEventEmitter).to(EventEmitter);
// 支持使用 new 而非容器实例化的场景，同时禁止 lazyInject cache
// @see https://github.com/inversify/inversify-inject-decorators#caching-vs-non-caching-behaviour
const DECORATORS = getDecorators(container, false);

interface IBabelPropertyDescriptor extends PropertyDescriptor {
  initializer(): any;
}
// Add babel legacy decorators support
// @see https://github.com/inversify/InversifyJS/issues/1050
// @see https://github.com/inversify/InversifyJS/issues/1026#issuecomment-504936034
export const lazyInject = (
  serviceIdentifier: interfaces.ServiceIdentifier<any>,
) => {
  const original = DECORATORS.lazyInject(serviceIdentifier);
  // the 'descriptor' parameter is actually always defined for class fields for Babel, but is considered undefined for TSC
  // so we just hack it with ?/! combination to avoid "TS1240: Unable to resolve signature of property decorator when called as an expression"
  return function(
    this: any,
    proto: any,
    key: string,
    descriptor?: IBabelPropertyDescriptor,
  ): void {
    // make it work as usual
    original.call(this, proto, key);
    // return link to proto, so own value wont be 'undefined' after component's creation
    if (descriptor) {
      descriptor.initializer = () => {
        return proto[key];
      };
    }
  };
};

export const lazyMultiInject = (
  serviceIdentifier: interfaces.ServiceIdentifier<any>,
) => {
  const original = DECORATORS.lazyMultiInject(serviceIdentifier);
  // the 'descriptor' parameter is actually always defined for class fields for Babel, but is considered undefined for TSC
  // so we just hack it with ?/! combination to avoid "TS1240: Unable to resolve signature of property decorator when called as an expression"
  return function(
    this: any,
    proto: any,
    key: string,
    descriptor?: IBabelPropertyDescriptor,
  ): void {
    // make it work as usual
    original.call(this, proto, key);
    if (descriptor) {
      // return link to proto, so own value wont be 'undefined' after component's creation
      descriptor!.initializer = () => {
        return proto[key];
      };
    }
  };
};

/** global services */
container
  .bind(IDENTIFIER.ShaderModuleService)
  .to(ShaderModuleService)
  .inSingletonScope();

/**
 * bind global component managers in root container
 */
container
  .bind<ComponentManager<NameComponent>>(IDENTIFIER.NameComponentManager)
  .toConstantValue(new ComponentManager(NameComponent));
container
  .bind<ComponentManager<HierarchyComponent>>(
    IDENTIFIER.HierarchyComponentManager,
  )
  .toConstantValue(new ComponentManager(HierarchyComponent));
container
  .bind<ComponentManager<TransformComponent>>(
    IDENTIFIER.TransformComponentManager,
  )
  .toConstantValue(new ComponentManager(TransformComponent));
container
  .bind<ComponentManager<MeshComponent>>(IDENTIFIER.MeshComponentManager)
  .toConstantValue(new ComponentManager(MeshComponent));
container
  .bind<ComponentManager<CullableComponent>>(
    IDENTIFIER.CullableComponentManager,
  )
  .toConstantValue(new ComponentManager(CullableComponent));
container
  .bind<ComponentManager<GeometryComponent>>(
    IDENTIFIER.GeometryComponentManager,
  )
  .toConstantValue(new ComponentManager(GeometryComponent));
container
  .bind<ComponentManager<MaterialComponent>>(
    IDENTIFIER.MaterialComponentManager,
  )
  .toConstantValue(new ComponentManager(MaterialComponent));

// https://github.com/inversify/InversifyJS/blob/master/wiki/hierarchical_di.md#support-for-hierarchical-di-systems
export function createWorldContainer() {
  const worldContainer = new Container();
  worldContainer.parent = container;

  /**
   * bind systems
   */
  worldContainer
    .bind<ISystem>(IDENTIFIER.Systems)
    .to(SceneGraphSystem)
    .inSingletonScope()
    .whenTargetNamed(IDENTIFIER.SceneGraphSystem);

  worldContainer
    .bind<ISystem>(IDENTIFIER.Systems)
    .to(FrameGraphSystem)
    .inSingletonScope()
    .whenTargetNamed(IDENTIFIER.FrameGraphSystem);

  worldContainer
    .bind<ISystem>(IDENTIFIER.Systems)
    .to(MeshSystem)
    .inSingletonScope()
    .whenTargetNamed(IDENTIFIER.MeshSystem);

  worldContainer
    .bind<ISystem>(IDENTIFIER.Systems)
    .to(GeometrySystem)
    .inSingletonScope()
    .whenTargetNamed(IDENTIFIER.GeometrySystem);

  worldContainer
    .bind<ISystem>(IDENTIFIER.Systems)
    .to(MaterialSystem)
    .inSingletonScope()
    .whenTargetNamed(IDENTIFIER.MaterialSystem);

  worldContainer
    .bind<ISystem>(IDENTIFIER.Systems)
    .to(RendererSystem)
    .inSingletonScope()
    .whenTargetNamed(IDENTIFIER.RendererSystem);

  // 资源池
  worldContainer
    .bind(IDENTIFIER.ResourcePool)
    .to(ResourcePool)
    .inSingletonScope();
  worldContainer
    .bind(IDENTIFIER.ConfigService)
    .to(ConfigService)
    .inSingletonScope();
  worldContainer
    .bind(IDENTIFIER.InteractorService)
    .to(InteractorService)
    .inSingletonScope();

  /**
   * bind render passes
   */
  worldContainer
    .bind<IRenderPass<any>>(IDENTIFIER.RenderPass)
    .to(RenderPass)
    .inSingletonScope()
    .whenTargetNamed(RenderPass.IDENTIFIER);
  worldContainer
    .bind<IRenderPass<any>>(IDENTIFIER.RenderPass)
    .to(CopyPass)
    .inSingletonScope()
    .whenTargetNamed(CopyPass.IDENTIFIER);
  worldContainer
    .bind<IRenderPass<any>>(IDENTIFIER.RenderPass)
    .to(PixelPickingPass)
    .inSingletonScope()
    .whenTargetNamed(PixelPickingPass.IDENTIFIER);

  worldContainer
    .bind<interfaces.Factory<IRenderPass<any>>>(IDENTIFIER.RenderPassFactory)
    .toFactory<IRenderPass<any>>((context: interfaces.Context) => {
      return (name: string) => {
        return context.container.getNamed(IDENTIFIER.RenderPass, name);
      };
    });

  return worldContainer;
}
