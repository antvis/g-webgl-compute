/**
 * Root Container
 * @see /dev-docs/IoC 容器、依赖注入与服务说明.md
 */
import 'reflect-metadata';

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
import { CameraComponent } from './components/camera/CameraComponent';
import { CameraSystem } from './components/camera/System';
import { ComputeComponent } from './components/compute/ComputeComponent';
import { IComputeStrategy } from './components/compute/IComputeStrategy';
// import { LayoutComputeStrategy } from './components/compute/LayoutComputeStrategy';
// import { ParticleComputeStrategy } from './components/compute/ParticleComputeStrategy';
import { ComputeSystem } from './components/compute/System';
import { ResourcePool } from './components/framegraph/ResourcePool';
// import { PassNodeComponent } from './components/framegraph/PassNodeComponent';
// import { ResourceHandleComponent } from './components/framegraph/ResourceHandleComponent';
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
import { SceneComponent } from './components/scene/SceneComponent';
import { SceneSystem } from './components/scene/System';
import { HierarchyComponent } from './components/scenegraph/HierarchyComponent';
import { NameComponent } from './components/scenegraph/NameComponent';
import { SceneGraphSystem } from './components/scenegraph/System';
import { TransformComponent } from './components/scenegraph/TransformComponent';
import { IDENTIFIER } from './identifier';
import { ConfigService } from './services/config/ConfigService';
import ShaderModuleService from './services/shader-module/ShaderModuleService';

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

export function createContainerModule() {
  return new ContainerModule(
    (bind: interfaces.Bind, unbind: interfaces.Unbind) => {
      /**
       * bind global component managers in root container
       */
      bind<ComponentManager<NameComponent>>(
        IDENTIFIER.NameComponentManager,
      ).toConstantValue(new ComponentManager(NameComponent));
      bind<ComponentManager<HierarchyComponent>>(
        IDENTIFIER.HierarchyComponentManager,
      ).toConstantValue(new ComponentManager(HierarchyComponent));
      bind<ComponentManager<TransformComponent>>(
        IDENTIFIER.TransformComponentManager,
      ).toConstantValue(new ComponentManager(TransformComponent));
      bind<ComponentManager<CameraComponent>>(
        IDENTIFIER.CameraComponentManager,
      ).toConstantValue(new ComponentManager(CameraComponent));
      // container
      //   .bind<ComponentManager<ResourceHandleComponent>>(
      //     IDENTIFIER.ResourceHandleComponentManager,
      //   )
      //   .toConstantValue(new ComponentManager(ResourceHandleComponent));
      // container
      //   .bind<ComponentManager<PassNodeComponent>>(
      //     IDENTIFIER.PassNodeComponentManager,
      //   )
      //   .toConstantValue(new ComponentManager(PassNodeComponent));
      bind<ComponentManager<MeshComponent>>(
        IDENTIFIER.MeshComponentManager,
      ).toConstantValue(new ComponentManager(MeshComponent));
      bind<ComponentManager<CullableComponent>>(
        IDENTIFIER.CullableComponentManager,
      ).toConstantValue(new ComponentManager(CullableComponent));
      bind<ComponentManager<GeometryComponent>>(
        IDENTIFIER.GeometryComponentManager,
      ).toConstantValue(new ComponentManager(GeometryComponent));
      bind<ComponentManager<MaterialComponent>>(
        IDENTIFIER.MaterialComponentManager,
      ).toConstantValue(new ComponentManager(MaterialComponent));
      bind<ComponentManager<SceneComponent>>(
        IDENTIFIER.SceneComponentManager,
      ).toConstantValue(new ComponentManager(SceneComponent));
      bind<ComponentManager<ComputeComponent>>(
        IDENTIFIER.ComputeComponentManager,
      ).toConstantValue(new ComponentManager(ComputeComponent));

      /**
       * bind systems
       */
      bind<ISystem>(IDENTIFIER.Systems)
        .to(SceneGraphSystem)
        .inSingletonScope()
        .whenTargetNamed(IDENTIFIER.SceneGraphSystem);

      bind<ISystem>(IDENTIFIER.Systems)
        .to(SceneSystem)
        .inSingletonScope()
        .whenTargetNamed(IDENTIFIER.SceneSystem);

      bind<ISystem>(IDENTIFIER.Systems)
        .to(CameraSystem)
        .inSingletonScope()
        .whenTargetNamed(IDENTIFIER.CameraSystem);

      bind<ISystem>(IDENTIFIER.Systems)
        .to(FrameGraphSystem)
        .inSingletonScope()
        .whenTargetNamed(IDENTIFIER.FrameGraphSystem);

      bind<ISystem>(IDENTIFIER.Systems)
        .to(MeshSystem)
        .inSingletonScope()
        .whenTargetNamed(IDENTIFIER.MeshSystem);

      bind<ISystem>(IDENTIFIER.Systems)
        .to(GeometrySystem)
        .inSingletonScope()
        .whenTargetNamed(IDENTIFIER.GeometrySystem);

      bind<ISystem>(IDENTIFIER.Systems)
        .to(MaterialSystem)
        .inSingletonScope()
        .whenTargetNamed(IDENTIFIER.MaterialSystem);

      bind<ISystem>(IDENTIFIER.Systems)
        .to(RendererSystem)
        .inSingletonScope()
        .whenTargetNamed(IDENTIFIER.RendererSystem);

      // container
      //   .bind<ISystem>(IDENTIFIER.Systems)
      //   .to(InteractionSystem)
      //   .whenTargetNamed(IDENTIFIER.InteractionSystem);

      bind<ISystem>(IDENTIFIER.Systems)
        .to(ComputeSystem)
        .inSingletonScope()
        .whenTargetNamed(IDENTIFIER.ComputeSystem);

      /**
       * 全局服务
       */
      // 资源池
      bind(IDENTIFIER.ResourcePool)
        .to(ResourcePool)
        .inSingletonScope();
      // Shader 模块化
      bind(IDENTIFIER.ShaderModuleService)
        .to(ShaderModuleService)
        .inSingletonScope();
      bind(IDENTIFIER.ConfigService)
        .to(ConfigService)
        .inSingletonScope();

      /**
       * bind render passes
       */
      bind<IRenderPass<any>>(IDENTIFIER.RenderPass)
        .to(RenderPass)
        .inSingletonScope()
        .whenTargetNamed(RenderPass.IDENTIFIER);
      bind<IRenderPass<any>>(IDENTIFIER.RenderPass)
        .to(CopyPass)
        .inSingletonScope()
        .whenTargetNamed(CopyPass.IDENTIFIER);
      bind<IRenderPass<any>>(IDENTIFIER.RenderPass)
        .to(PixelPickingPass)
        .inSingletonScope()
        .whenTargetNamed(PixelPickingPass.IDENTIFIER);

      bind<interfaces.Factory<IRenderPass<any>>>(
        IDENTIFIER.RenderPassFactory,
      ).toFactory<IRenderPass<any>>((context: interfaces.Context) => {
        return (name: string) => {
          return context.container.getNamed(IDENTIFIER.RenderPass, name);
        };
      });
    },
  );
}
