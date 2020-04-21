import { vec3 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import {
  Component,
  container,
  createEntity,
  Entity,
  IRenderEngine,
} from '../..';
import { ComponentManager } from '../../ComponentManager';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { ComputeComponent, ComputeType } from './ComputeComponent';
import { IComputeStrategy } from './IComputeStrategy';

@injectable()
export class ComputeSystem implements ISystem {
  @inject(IDENTIFIER.ComputeComponentManager)
  private readonly compute: ComponentManager<ComputeComponent>;

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRenderEngine;

  public async execute() {
    await Promise.all(
      this.compute.map(async (entity, component) => {
        if (!component.finished) {
          if (component.dirty) {
            await this.compile(component);
            component.strategy.init();
            component.dirty = false;
          }

          if (component.iteration <= component.maxIteration) {
            this.engine.setComputePipeline(`compute-${entity}`, {
              layout: component.pipelineLayout,
              ...component.stageDescriptor,
            });
            this.engine.setComputeBindGroups([
              component.strategy.getBindingGroup(),
            ]);

            component.strategy.run();
          } else {
            component.finished = true;
            if (component.onCompleted) {
              component.onCompleted(
                await this.engine.readData(
                  this.getParticleBuffer(entity),
                  component.particleData.byteLength,
                  component.particleDataConstructor,
                ),
              );
            }
          }
        }
      }),
    );
  }

  public tearDown() {
    this.compute.forEach((_, compute) => {
      compute.bindings.forEach((binding) => {
        if (binding.buffer) {
          binding.buffer.destroy();
        }
      });
      compute.strategy.destroy();
    });
    this.compute.clear();
  }

  public createComputePipeline({
    type,
    shader,
    particleCount,
    particleData,
    maxIteration = Number.MAX_VALUE,
    onCompleted = null,
  }: {
    type: ComputeType;
    shader: string;
    particleCount: number;
    particleData: ArrayBufferView;
    maxIteration?: number;
    onCompleted?: ((particleData: ArrayBufferView) => void) | null;
  }) {
    const entity = createEntity();
    const strategy = container.getNamed<IComputeStrategy>(
      IDENTIFIER.ComputeStrategy,
      type,
    );

    this.compute.create(entity, {
      type,
      strategy,
      // 在头部加上 #define PARTICLE_NUM particleCount
      shaderGLSL: `#define PARTICLE_NUM ${particleCount} \n ${shader}`,
      particleCount,
      particleData,
      // @ts-ignore
      particleDataConstructor: particleData.constructor,
      maxIteration,
      onCompleted,
    });

    strategy.component = this.compute.getComponentByEntity(entity)!;

    return entity;
  }

  public addBinding(
    entity: Entity,
    name: string,
    data: ArrayBufferView,
    descriptor: GPUBindGroupLayoutEntry,
  ) {
    const compute = this.compute.getComponentByEntity(entity);

    if (compute) {
      compute.bindings.push({
        name,
        data,
        ...descriptor,
      });
    }
  }

  public getParticleBuffer(entity: Entity) {
    const compute = this.compute.getComponentByEntity(entity)!;
    return compute.strategy.getGPUBuffer();
  }

  private async compile(
    component: Component<ComputeComponent> & ComputeComponent,
  ) {
    component.stageDescriptor = await this.engine.compileComputePipelineStageDescriptor(
      component.shaderGLSL,
      null,
    );
  }
}
