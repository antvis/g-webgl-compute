/**
 * Root Container
 * @see /dev-docs/IoC 容器、依赖注入与服务说明.md
 */
import 'reflect-metadata';

import { Container, decorate, injectable, interfaces } from 'inversify';
import getDecorators from 'inversify-inject-decorators';
import { System, World } from '.';
import { ComponentManager } from './ComponentManager';
import { CameraComponent } from './components/camera/CameraComponent';
import { CameraSystem } from './components/camera/System';
import { PassNodeComponent } from './components/framegraph/PassNodeComponent';
import { ResourceHandleComponent } from './components/framegraph/ResourceHandleComponent';
import { FrameGraphSystem } from './components/framegraph/System';
import { HierarchyComponent } from './components/scenegraph/HierarchyComponent';
import { NameComponent } from './components/scenegraph/NameComponent';
import { SceneGraphSystem } from './components/scenegraph/System';
import { TransformComponent } from './components/scenegraph/TransformComponent';
import { IDENTIFIER } from './identifier';

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
  .bind<System>(IDENTIFIER.Systems)
  .to(SceneGraphSystem)
  .inSingletonScope();
container
  .bind<System>(IDENTIFIER.Systems)
  .to(CameraSystem)
  .inSingletonScope();
container
  .bind<System>(IDENTIFIER.Systems)
  .to(FrameGraphSystem)
  .inSingletonScope();
