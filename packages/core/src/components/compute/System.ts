import { Parser, Target } from '@antv/g-webgpu-compiler';
import { inject, injectable } from 'inversify';
import { isArray, isNumber, isTypedArray } from 'lodash';
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

  private parser: Parser = new Parser();

  public async execute() {
    // 考虑多个计算程序之间的依赖关系
    // 先找到多个计算程序中最大的迭代次数，然后按顺序执行
    let maxIteration = 0;
    this.compute.map((entity, component) => {
      if (component.maxIteration > maxIteration) {
        maxIteration = component.maxIteration;
      }
    });

    // 首先所有计算程序依次初始化
    for (let j = 0; j < this.compute.getCount(); j++) {
      const component = this.compute.getComponent(j);
      if (!component.finished) {
        if (component.dirty) {
          await this.compile(component);
          component.strategy.init(component.compiledBundle.context);
          component.dirty = false;
        }
      }
    }

    for (let i = 0; i < maxIteration; i++) {
      for (let j = 0; j < this.compute.getCount(); j++) {
        const component = this.compute.getComponent(j);
        if (!component.finished) {
          if (component.iteration <= component.maxIteration - 1) {
            this.engine.setComputePipeline(
              `compute-${this.compute.getEntity(j)}`,
              {
                layout: component.pipelineLayout,
                ...component.stageDescriptor,
              },
            );
            this.engine.setComputeBindGroups([
              component.strategy.getBindingGroup(),
            ]);

            await component.strategy.run();
            component.iteration++;
          } else {
            component.finished = true;
            if (component.onCompleted) {
              component.onCompleted(
                await this.engine.readData(component.compiledBundle.context),
              );
            }
          }
        }
      }
    }
  }

  public tearDown() {
    this.compute.forEach((_, compute) => {
      compute.strategy.destroy();
    });
    this.compute.clear();
  }

  public createComputePipeline({
    type = 'layout',
    shader,
    precompiled = false,
    dispatch = [1, 1, 1],
    maxIteration = 1,
    onCompleted = null,
    onIterationCompleted = null,
  }: {
    type: ComputeType;
    shader: string;
    precompiled?: boolean;
    dispatch: [number, number, number];
    maxIteration?: number;
    onCompleted?: ((particleData: ArrayBufferView) => void) | null;
    onIterationCompleted?: ((iteration: number) => Promise<void>) | null;
  }) {
    const entity = createEntity();
    const strategy = container.getNamed<IComputeStrategy>(
      IDENTIFIER.ComputeStrategy,
      type,
    );

    this.compute.create(entity, {
      type,
      strategy,
      rawShaderCode: shader,
      precompiled,
      dispatch,
      maxIteration,
      onCompleted,
      onIterationCompleted,
    });

    strategy.component = this.compute.getComponentByEntity(entity)!;

    return entity;
  }

  public setBinding(
    entity: Entity,
    name: string,
    data:
      | number
      | number[]
      | Float32Array
      | Uint8Array
      | Uint16Array
      | Uint32Array
      | Int8Array
      | Int16Array
      | Int32Array
      | {
          entity: Entity;
        },
  ) {
    const compute = this.compute.getComponentByEntity(entity);

    if (compute) {
      const isNumberLikeData =
        isNumber(data) || isTypedArray(data) || isArray(data);
      if (compute.compiledBundle) {
        const existedBinding = compute.compiledBundle.context.uniforms.find(
          (b) => b.name === name,
        );
        if (existedBinding) {
          if (isNumberLikeData) {
            // TODO: 只允许非 float[] int[] vec4[] 数据类型在运行时更新
            // @ts-ignore
            existedBinding.data = data;

            // @ts-ignore
            compute.strategy.updateUniformGPUBuffer(name, data);
          } else {
            const existedIndex = compute.bindings.findIndex(
              (b) => b.name === name,
            );
            if (existedIndex > -1) {
              // @ts-ignore
              compute.bindings[existedIndex].referer = data;
            } else {
              compute.bindings.push({
                name,
                // @ts-ignore
                referer: data,
              });
            }

            const { entity: referEntity } = data as {
              entity: Entity;
            };

            const referCompute = this.compute.getComponentByEntity(referEntity);
            const referContextName = referCompute?.compiledBundle.context.name;
            // @ts-ignore
            const contextName = compute?.compiledBundle.context.name;

            if (referContextName) {
              this.engine.confirmInput(contextName, name, referContextName);
            }
          }
        }
      } else {
        if (isNumberLikeData) {
          compute.bindings.push({
            name,
            // @ts-ignore
            data,
          });
        }
      }
    }
  }

  public async readOutputData(entity: Entity) {
    const compute = this.compute.getComponentByEntity(entity)!;
    return this.engine.readData(compute.compiledBundle.context);
  }

  public getParticleBuffer(entity: Entity) {
    const compute = this.compute.getComponentByEntity(entity)!;
    return compute.strategy.getGPUBuffer();
  }

  public getPrecompiledBundle(entity: Entity): string {
    const component = this.compute.getComponentByEntity(entity)!;
    Object.keys(component.compiledBundle.shaders).forEach((target) => {
      // @ts-ignore
      if (!component.compiledBundle.shaders[target]) {
        this.parser.setTarget(target as Target);
        // @ts-ignore
        component.compiledBundle.shaders[target] = this.parser.generateCode(
          this.parser.parse(component.rawShaderCode)!,
          {
            dispatch: component.dispatch,
            maxIteration: component.maxIteration,
            // @ts-ignore
            bindings: component.bindings,
          },
        );
        this.parser.clear();
      }
    });

    // 需要剔除掉不可序列化的内容，例如上下文中保存的数据
    component.compiledBundle.context.uniforms.forEach((uniform) => {
      if (uniform.data) {
        delete uniform.data;
      }
    });
    return JSON.stringify(component.compiledBundle).replace(/\\n/g, '\\\\n');
  }

  private async compile(
    component: Component<ComputeComponent> & ComputeComponent,
  ) {
    if (!component.precompiled) {
      const target = this.engine.supportWebGPU ? Target.WebGPU : Target.WebGL;
      this.parser.setTarget(target);
      component.compiledBundle = {
        shaders: {
          [Target.WebGPU]: '',
          [Target.WebGL]: '',
        },
        context: this.parser.getGLSLContext(),
      };
      component.compiledBundle.shaders[target] = this.parser.generateCode(
        this.parser.parse(component.rawShaderCode)!,
        {
          dispatch: component.dispatch,
          maxIteration: component.maxIteration,
          // @ts-ignore
          bindings: component.bindings,
        },
      );
    } else {
      // 预编译的结果应该包含所有目标平台的 GLSL 代码
      component.compiledBundle = JSON.parse(component.rawShaderCode);
      // 添加 uniform 绑定的数据
      component.compiledBundle.context.uniforms.forEach((uniform) => {
        const binding = component.bindings.find((b) => b.name === uniform.name);
        if (binding && binding.data) {
          // @ts-ignore
          uniform.data = binding.data;
        }
      });
    }

    component.stageDescriptor = await this.engine.compileComputePipelineStageDescriptor(
      // 添加运行时 define 常量
      `${component.compiledBundle.context.defines
        .filter((define) => define.runtime)
        .map((define) => `#define ${define.name} ${define.value}`)
        .join('\n')}
      ${
        component.compiledBundle.shaders[
          this.engine.supportWebGPU ? Target.WebGPU : Target.WebGL
        ]
      }`,
      component.compiledBundle.context,
    );

    if (!component.precompiled) {
      this.parser.clear();
    }
    component.precompiled = true;
  }
}
