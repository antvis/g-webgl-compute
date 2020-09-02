import 'reflect-metadata';
import { Component, ComponentManager } from './ComponentManager';
import { CameraSystem } from './components/camera/System';
import { ComputeSystem } from './components/compute/System';
import { FrameGraphSystem } from './components/framegraph/System';
import { IBoxGeometryParams } from './components/geometry/interface';
import { GeometrySystem } from './components/geometry/System';
// import { InteractionSystem } from './components/interaction/System';
import { IUniformBinding } from './components/material/interface';
import { MaterialSystem } from './components/material/System';
import { IMeshParams } from './components/mesh/interface';
import { MeshSystem } from './components/mesh/System';
import { SceneSystem } from './components/scene/System';
import { SceneGraphSystem } from './components/scenegraph/System';

import { CameraComponent } from './components/camera/CameraComponent';
import { ComputeComponent } from './components/compute/ComputeComponent';
import { ComputeType } from './components/compute/interface';

import { MaterialComponent } from './components/material/MaterialComponent';
import { CullableComponent } from './components/mesh/CullableComponent';
import { MeshComponent } from './components/mesh/MeshComponent';
import { TransformComponent } from './components/scenegraph/TransformComponent';

import { gl } from './components/renderer/gl';
import {
  IAttribute,
  IAttributeInitializationOptions,
} from './components/renderer/IAttribute';
import {
  IBuffer,
  IBufferInitializationOptions,
} from './components/renderer/IBuffer';
import { IComputeModel } from './components/renderer/IComputeModel';
import {
  IElements,
  IElementsInitializationOptions,
} from './components/renderer/IElements';
import {
  IFramebuffer,
  IFramebufferInitializationOptions,
} from './components/renderer/IFramebuffer';
import {
  IModel,
  IModelDrawOptions,
  IModelInitializationOptions,
} from './components/renderer/IModel';
import {
  IRenderbuffer,
  IRenderbufferInitializationOptions,
} from './components/renderer/IRenderbuffer';
import {
  BufferData,
  IClearOptions,
  IReadPixelsOptions,
  IRendererConfig,
  IRendererService,
} from './components/renderer/IRendererService';
import {
  ITexture2D,
  ITexture2DInitializationOptions,
} from './components/renderer/ITexture2D';
import { IUniform } from './components/renderer/IUniform';

import { PixelPickingPass } from './components/renderer/passes/PixelPickingPass';
import { createEntity } from './Entity';
import { IDENTIFIER } from './identifier';
import {
  container,
  createContainerModule,
  lazyInject,
  lazyMultiInject,
} from './inversify.config';
import { ISystem } from './ISystem';
import { IConfig, IConfigService } from './services/config/IConfigService';
import { IShaderModuleService } from './services/shader-module/IShaderModuleService';
import { isSafari } from './utils/isSafari';

type Entity = number;

export {
  container,
  createContainerModule,
  lazyInject,
  lazyMultiInject,
  createEntity,
  Component,
  ComponentManager,
  Entity,
  ISystem,
  IBoxGeometryParams,
  IUniform,
  IMeshParams,
  IUniformBinding,
  IDENTIFIER,
  CameraSystem,
  ComputeSystem,
  ComputeType,
  FrameGraphSystem,
  GeometrySystem,
  // InteractionSystem,
  MaterialSystem,
  MeshSystem,
  SceneSystem,
  SceneGraphSystem,
  CameraComponent,
  ComputeComponent,
  CullableComponent,
  MeshComponent,
  TransformComponent,
  MaterialComponent,
  isSafari,
  // renderer service
  gl,
  IAttribute,
  IAttributeInitializationOptions,
  IBuffer,
  IBufferInitializationOptions,
  IClearOptions,
  IElements,
  IElementsInitializationOptions,
  IFramebuffer,
  IFramebufferInitializationOptions,
  IRenderbuffer,
  IRenderbufferInitializationOptions,
  IModel,
  IModelInitializationOptions,
  IModelDrawOptions,
  IReadPixelsOptions,
  IRendererConfig,
  IRendererService,
  ITexture2D,
  ITexture2DInitializationOptions,
  IComputeModel,
  BufferData,
  IShaderModuleService,
  IConfigService,
  IConfig,
  PixelPickingPass,
};
