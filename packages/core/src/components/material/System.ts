import { mat4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { createEntity, Entity, IRenderEngine } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { getLengthFromFormat } from '../../utils/shader';
import { IUniform, MaterialComponent } from './MaterialComponent';
import fragmentShaderGLSL from './shaders/basic.frag.glsl';
import vertexShaderGLSL from './shaders/basic.vert.glsl';

export interface IMaterialParams {
  colorStates: Pick<GPURenderPipelineDescriptor, 'colorStates'>;
  primitiveTopology:
    | 'point-list'
    | 'line-list'
    | 'line-strip'
    | 'triangle-list'
    | 'triangle-strip'
    | undefined;
  depthStencilState: GPUDepthStencilStateDescriptor;
  rasterizationState: GPURasterizationStateDescriptor;
}

@injectable()
export class MaterialSystem implements ISystem {
  @inject(IDENTIFIER.MaterialComponentManager)
  private readonly material: ComponentManager<MaterialComponent>;

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRenderEngine;

  public async execute() {
    await Promise.all(
      this.material.map(async (entity, component) => {
        if (component.dirty) {
          // TODO: 使用 cache 避免同类材质的重复编译
          component.stageDescriptor = await this.engine.compilePipelineStageDescriptor(
            component.vertexShaderGLSL,
            component.fragmentShaderGLSL,
            null,
          );

          this.generateUniforms(component);

          component.dirty = false;
        }
      }),
    );
  }

  public tearDown() {
    this.material.clear();
  }

  /**
   * This material is not affected by lights.
   * @see https://threejs.org/docs/#api/en/materials/MeshBasicMaterial
   */
  public createBasicMaterial(params?: IMaterialParams) {
    const entity = createEntity();
    this.material.create(entity, {
      vertexShaderGLSL,
      fragmentShaderGLSL,
      ...params,
    });

    this.addBuiltinUniforms(entity);
    return entity;
  }

  /**
   * @see https://threejs.org/docs/#api/en/materials/ShaderMaterial
   */
  public createShaderMaterial(
    params: { vertexShader: string; fragmentShader: string } & IMaterialParams,
  ) {
    const entity = createEntity();
    this.material.create(entity, {
      vertexShaderGLSL: params.vertexShader,
      fragmentShaderGLSL: params.fragmentShader,
      ...params,
    });

    this.addBuiltinUniforms(entity);
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
          this.engine.setSubData(
            binding.buffer,
            targetUniform.offset || 0,
            data,
          );
          targetUniform.dirty = false;
        }
        return;
      }
    }
  }

  /**
   * 添加内置 uniform，例如 mvp 矩阵
   *
   * 在 Shader 中可以通过 Uniform 访问：
   * @example
   *
   * layout(set = 0, binding = 0) uniform Builtin {
   *   mat4 projectionMatrix;
   *   mat4 modelViewMatrix;
   * } builtin;
   *
   * 后续可以改成自动添加到用户自定义 Shader 的头部，类似 Three.js chunk
   */
  private addBuiltinUniforms(entity: Entity) {
    this.addUniform(entity, {
      binding: 0,
      name: 'projectionMatrix',
      format: 'mat4',
      data: null,
      dirty: true,
    });
    this.addUniform(entity, {
      binding: 0,
      name: 'modelViewMatrix',
      format: 'mat4',
      data: null,
      dirty: true,
    });
  }

  private generateUniforms(component: MaterialComponent) {
    const entries: GPUBindGroupLayoutEntry[] = component.uniforms.map(
      (uniform, i) => ({
        binding: i,
        visibility: 1 | 2, // TODO: 暂时 VS 和 FS 都可见
        type: 'uniform-buffer',
      }),
    );

    component.uniformsBindGroupLayout = this.engine
      .getDevice()
      .createBindGroupLayout({
        // 最新 API 0.0.22 版本使用 entries。Chrome Canary 84.0.4110.0 已实现。
        // 使用 bindings 会报 Warning: GPUBindGroupLayoutDescriptor.bindings is deprecated: renamed to entries
        // @see https://github.com/antvis/GWebGPUEngine/issues/5
        entries,
      });

    component.pipelineLayout = this.engine.getDevice().createPipelineLayout({
      bindGroupLayouts: [component.uniformsBindGroupLayout],
    });

    const bindGroupBindings = component.uniforms.map((uniform, i) => {
      const uniformBuffer = this.engine.createUniformBuffer(
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

    component.uniformBindGroup = this.engine.getDevice().createBindGroup({
      layout: component.uniformsBindGroupLayout,
      entries: bindGroupBindings,
    });
  }
}
