import {
  createContainerModule,
  IDENTIFIER,
  IRendererService,
} from '@antv/g-webgpu-core';
import { WebGLEngine, WebGPUEngine } from '@antv/g-webgpu-engine';
import { Container } from 'inversify';
import { Camera } from './Camera';
import { Kernel } from './Kernel';
import { Point } from './mesh/point/Point';
import { IRenderable, Renderable } from './Renderable';
import { Renderer } from './Renderer';
import { Scene } from './Scene';
import { View } from './View';
import { World } from './World';

export const RenderableType = {
  Point: Symbol('Point'),
  Line: Symbol('Line'),
};

const container = new Container();

container.load(createContainerModule());

// bind render engine, fallback to WebGL
const engineClazz = !navigator.gpu ? WebGLEngine : WebGPUEngine;
if (!container.isBound(IDENTIFIER.RenderEngine)) {
  container
    .bind<IRendererService>(IDENTIFIER.RenderEngine)
    // @ts-ignore
    .to(engineClazz)
    .inSingletonScope();
}

container.bind(Renderer).toSelf();
container.bind(Kernel).toSelf();
container.bind(Renderable).toSelf();
container.bind(View).toSelf();
container.bind(Camera).toSelf();
container.bind(Scene).toSelf();
container
  .bind(World)
  .toSelf()
  .inSingletonScope();

container
  .bind<IRenderable>(IDENTIFIER.Renderable)
  .to(Point)
  .whenTargetNamed(RenderableType.Point);

export { World, Kernel, Camera, container };
