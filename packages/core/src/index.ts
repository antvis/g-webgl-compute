import 'reflect-metadata';
import { Component, ComponentManager } from './ComponentManager';
import { CameraSystem } from './components/camera/System';
import { ComputeSystem } from './components/compute/System';
import { FrameGraphSystem } from './components/framegraph/System';
import {
  GeometrySystem,
  IBoxGeometryParams,
} from './components/geometry/System';
// import { InteractionSystem } from './components/interaction/System';
import { IMaterialParams, MaterialSystem } from './components/material/System';
import { IMeshParams, MeshSystem } from './components/mesh/System';
import { SceneSystem } from './components/scene/System';
import { SceneGraphSystem } from './components/scenegraph/System';

import { CameraComponent } from './components/camera/CameraComponent';
import {
  ComputeComponent,
  ComputeType,
} from './components/compute/ComputeComponent';
import {
  IUniform,
  MaterialComponent,
} from './components/material/MaterialComponent';
import { CullableComponent } from './components/mesh/CullableComponent';
import { MeshComponent } from './components/mesh/MeshComponent';
import { TransformComponent } from './components/scenegraph/TransformComponent';

import { IRenderPath } from './components/renderpath/RenderPath';
import { createEntity, Entity } from './Entity';
import { IDENTIFIER } from './identifier';
import { container, lazyInject, lazyMultiInject } from './inversify.config';
import { IRenderEngine, IWebGPUEngineOptions } from './IRenderEngine';
import { ISystem } from './ISystem';
import { isSafari } from './utils/isSafari';

export {
  container,
  lazyInject,
  lazyMultiInject,
  createEntity,
  Component,
  ComponentManager,
  Entity,
  ISystem,
  IRenderEngine,
  IWebGPUEngineOptions,
  IBoxGeometryParams,
  IUniform,
  IMeshParams,
  IMaterialParams,
  IRenderPath,
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
};
