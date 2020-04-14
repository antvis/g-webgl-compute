import { mat4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { createEntity, Entity, IDENTIFIER } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { ExecuteSystem } from '../../System';
import { getLengthFromFormat } from '../../utils/shader';
import { WebGPUEngine } from '../../WebGPUEngine';
import { IUniform, MaterialComponent } from './MaterialComponent';
import fragmentShaderGLSL from './shaders/standard.frag.glsl';
import vertexShaderGLSL from './shaders/standard.vert.glsl';

@injectable()
export class MaterialSystem extends ExecuteSystem {
  public name = IDENTIFIER.MaterialSystem;

  @inject(IDENTIFIER.MaterialComponentManager)
  private readonly material: ComponentManager<MaterialComponent>;

  public async execute(engine: WebGPUEngine) {
    await Promise.all(
      this.material.map(async (entity, component) => {
        if (component.dirty) {
          // TODO: 使用 cache 避免同类材质的重复编译
          component.stageDescriptor = await engine.compilePipelineStageDescriptor(
            component.vertexShaderGLSL,
            component.fragmentShaderGLSL,
            null,
          );

          this.generateUniforms(engine, component);

          component.dirty = false;
        }
      }),
    );
  }

  /**
   * This material is not affected by lights.
   * @see https://threejs.org/docs/#api/en/materials/MeshBasicMaterial
   */
  public createBasicMaterial() {
    const entity = createEntity();
    this.material.create(entity, {
      vertexShaderGLSL,
      fragmentShaderGLSL,
    });

    // TODO: 暂时手动声明，后续可以优化成从 Shader 中自动提取
    this.addUniform(entity, {
      binding: 0,
      name: 'mvpMatrix',
      format: 'mat4',
      data: null,
      dirty: true,
    });
    this.addUniform(entity, {
      binding: 0,
      name: 'color',
      format: 'float4',
      data: null,
      dirty: true,
    });
    return entity;
  }

  public createShaderMaterial(vs: string, fs: string) {
    const entity = createEntity();
    this.material.create(entity, {
      vertexShaderGLSL: vs,
      fragmentShaderGLSL: fs,
    });
    return entity;
  }

  public addUniform(entity: Entity, uniform: IUniform) {
    const component = this.material.getComponentByEntity(entity)!;
    const { uniforms, length } = component.uniforms[uniform.binding] || {};
    if (!uniforms) {
      component.uniforms[uniform.binding] = {
        uniforms: [],
        length: 0,
      };
    }

    const uniformLength = getLengthFromFormat(uniform.format);
    component.uniforms[uniform.binding].uniforms.push({
      binding: uniform.binding,
      name: uniform.name,
      format: uniform.format,
      offset: length || 0,
      length: uniformLength,
      data: uniform.data,
      dirty: uniform.dirty,
    });

    // BytesPerElement = 4
    component.uniforms[uniform.binding].length += uniformLength * 4;
  }

  public setUniform(
    engine: WebGPUEngine,
    entity: Entity,
    name: string,
    data: ArrayBufferView,
    force: boolean = false,
  ) {
    const component = this.material.getComponentByEntity(entity)!;
    for (const binding of component.uniforms) {
      const targetUniform = binding.uniforms.find((u) => u.name === name);
      if (targetUniform) {
        if (!force) {
          // 暂时标记，实际数据更新在 frame 中完成
          targetUniform.dirty = true;
          targetUniform.data = data;
        } else if (binding.buffer && data) {
          engine.setSubData(binding.buffer, targetUniform.offset || 0, data);
          targetUniform.dirty = false;
        }
        return;
      }
    }
  }

  private generateUniforms(engine: WebGPUEngine, component: MaterialComponent) {
    const entries: GPUBindGroupLayoutEntry[] = component.uniforms.map(
      (uniform, i) => ({
        binding: i,
        visibility: 1 | 2, // TODO: 暂时 VS 和 FS 都可见
        type: 'uniform-buffer',
      }),
    );
    component.uniformsBindGroupLayout = engine
      .getDevice()
      .createBindGroupLayout({
        // 最新 API 0.0.22 版本使用 entries。Chrome Canary 84.0.4110.0 已实现。
        // 使用 bindings 会报 Warning: GPUBindGroupLayoutDescriptor.bindings is deprecated: renamed to entries
        // @see https://github.com/antvis/GWebGPUEngine/issues/5
        entries,
      });

    component.pipelineLayout = engine.getDevice().createPipelineLayout({
      bindGroupLayouts: [component.uniformsBindGroupLayout],
    });

    const bindGroupBindings = component.uniforms.map((uniform, i) => {
      const uniformBuffer = engine.createUniformBuffer(
        new Float32Array(uniform.length),
      );

      // 保存 GPUBuffer 便于后续更新
      uniform.buffer = uniformBuffer;
      return {
        binding: i,
        resource: {
          buffer: uniformBuffer,
        },
      };
    });

    component.uniformBindGroup = engine.getDevice().createBindGroup({
      layout: component.uniformsBindGroupLayout,
      entries: bindGroupBindings,
    });
  }
}
