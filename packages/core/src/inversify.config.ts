/**
 * Root Container
 * @see /dev-docs/IoC 容器、依赖注入与服务说明.md
 */
import 'reflect-metadata';

import { Container, decorate, injectable, interfaces } from 'inversify';
import getDecorators from 'inversify-inject-decorators';
import { ISystem } from '.';
import { ComponentManager } from './ComponentManager';
import { CameraComponent } from './components/camera/CameraComponent';
import { CameraSystem } from './components/camera/System';
import { ComputeComponent } from './components/compute/ComputeComponent';
import { IComputeStrategy } from './components/compute/IComputeStrategy';
import { LayoutComputeStrategy } from './components/compute/LayoutComputeStrategy';
import { ParticleComputeStrategy } from './components/compute/ParticleComputeStrategy';
import { ComputeSystem } from './components/compute/System';
import { PassNodeComponent } from './components/framegraph/PassNodeComponent';
import { ResourceHandleComponent } from './components/framegraph/ResourceHandleComponent';
import { FrameGraphSystem } from './components/framegraph/System';
import { GeometryComponent } from './components/geometry/GeometryComponent';
import { GeometrySystem } from './components/geometry/System';
// import { InteractionSystem } from './components/interaction/System';
import { MaterialComponent } from './components/material/MaterialComponent';
import { MaterialSystem } from './components/material/System';
import { CullableComponent } from './components/mesh/CullableComponent';
import { MeshComponent } from './components/mesh/MeshComponent';
import { MeshSystem } from './components/mesh/System';
import { ForwardRenderPath } from './components/renderpath/Forward';
import { IRenderPath } from './components/renderpath/RenderPath';
import { SceneComponent } from './components/scene/SceneComponent';
import { SceneSystem } from './components/scene/System';
import { HierarchyComponent } from './components/scenegraph/HierarchyComponent';
import { NameComponent } from './components/scenegraph/NameComponent';
import { SceneGraphSystem } from './components/scenegraph/System';
import { TransformComponent } from './components/scenegraph/TransformComponent';
import { IDENTIFIER } from './identifier';
import { IRenderEngine } from './IRenderEngine';

// @see https://github.com/inversify/InversifyJS/blob/master/wiki/container_api.md#defaultscope
export const container = new Container();

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
  .bind<ComponentManager<CameraComponent>>(IDENTIFIER.CameraComponentManager)
  .toConstantValue(new ComponentManager(CameraComponent));
container
  .bind<ComponentManager<ResourceHandleComponent>>(
    IDENTIFIER.ResourceHandleComponentManager,
  )
  .toConstantValue(new ComponentManager(ResourceHandleComponent));
container
  .bind<ComponentManager<PassNodeComponent>>(
    IDENTIFIER.PassNodeComponentManager,
  )
  .toConstantValue(new ComponentManager(PassNodeComponent));
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
container
  .bind<ComponentManager<SceneComponent>>(IDENTIFIER.SceneComponentManager)
  .toConstantValue(new ComponentManager(SceneComponent));
container
  .bind<ComponentManager<ComputeComponent>>(IDENTIFIER.ComputeComponentManager)
  .toConstantValue(new ComponentManager(ComputeComponent));

/**
 * bind systems
 */
container
  .bind<ISystem>(IDENTIFIER.Systems)
  .to(SceneGraphSystem)
  .whenTargetNamed(IDENTIFIER.SceneGraphSystem);

container
  .bind<ISystem>(IDENTIFIER.Systems)
  .to(SceneSystem)
  .whenTargetNamed(IDENTIFIER.SceneSystem);

container
  .bind<ISystem>(IDENTIFIER.Systems)
  .to(CameraSystem)
  .whenTargetNamed(IDENTIFIER.CameraSystem);

container
  .bind<ISystem>(IDENTIFIER.Systems)
  .to(FrameGraphSystem)
  .whenTargetNamed(IDENTIFIER.FrameGraphSystem);

container
  .bind<ISystem>(IDENTIFIER.Systems)
  .to(MeshSystem)
  .whenTargetNamed(IDENTIFIER.MeshSystem);

container
  .bind<ISystem>(IDENTIFIER.Systems)
  .to(GeometrySystem)
  .whenTargetNamed(IDENTIFIER.GeometrySystem);

container
  .bind<ISystem>(IDENTIFIER.Systems)
  .to(MaterialSystem)
  .whenTargetNamed(IDENTIFIER.MaterialSystem);

// container
//   .bind<ISystem>(IDENTIFIER.Systems)
//   .to(InteractionSystem)
//   .whenTargetNamed(IDENTIFIER.InteractionSystem);

container
  .bind<ISystem>(IDENTIFIER.Systems)
  .to(ComputeSystem)
  .whenTargetNamed(IDENTIFIER.ComputeSystem);

container
  .bind<IRenderPath>(IDENTIFIER.ForwardRenderPath)
  .to(ForwardRenderPath)
  .inSingletonScope();

/**
 * bind compute strategy
 */
container
  .bind<IComputeStrategy>(IDENTIFIER.ComputeStrategy)
  .to(ParticleComputeStrategy)
  .whenTargetNamed('particle');
container
  .bind<IComputeStrategy>(IDENTIFIER.ComputeStrategy)
  .to(LayoutComputeStrategy)
  .whenTargetNamed('layout');
