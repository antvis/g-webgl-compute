import { mat4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { createEntity, Entity, IUniformBinding } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { IShaderModuleService } from '../../services/shader-module/IShaderModuleService';
import { getLengthFromFormat } from '../../utils/shader';
import { BufferData, IRendererService } from '../renderer/IRendererService';
import { MaterialComponent } from './MaterialComponent';
import webglFragmentShaderGLSL from './shaders/webgl.basic.frag.glsl';
import webglVertexShaderGLSL from './shaders/webgl.basic.vert.glsl';
import webgpuFragmentShaderGLSL from './shaders/webgpu.basic.frag.glsl';
import webgpuVertexShaderGLSL from './shaders/webgpu.basic.vert.glsl';

@injectable()
export class MaterialSystem implements ISystem {
  @inject(IDENTIFIER.MaterialComponentManager)
  private readonly material: ComponentManager<MaterialComponent>;

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  @inject(IDENTIFIER.ShaderModuleService)
  private readonly shaderModule: IShaderModuleService;

  public async execute() {
    await Promise.all(
      this.material.map(async (entity, component) => {
        // if (component.dirty) {
        // TODO: 使用 cache 避免同类材质的重复编译
        // component.stageDescriptor = await this.engine.compilePipelineStageDescriptor(
        //   component.vertexShaderGLSL,
        //   component.fragmentShaderGLSL,
        //   null,
        // );
        // this.generateUniforms(component);
        //   component.dirty = false;
        // }
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
  public createBasicMaterial() {
    const entity = createEntity();
    return this.material.create(entity, {
      vertexShaderGLSL: this.engine.supportWebGPU
        ? webgpuVertexShaderGLSL
        : webglVertexShaderGLSL,
      fragmentShaderGLSL: this.engine.supportWebGPU
        ? webgpuFragmentShaderGLSL
        : webglFragmentShaderGLSL,
    });
  }

  /**
   * @see https://threejs.org/docs/#api/en/materials/ShaderMaterial
   */
  public createShaderMaterial(params: {
    vertexShader: string;
    fragmentShader: string;
  }) {
    const entity = createEntity();

    let vertexShaderGLSL = params.vertexShader;
    let fragmentShaderGLSL = params.fragmentShader;
    let uniforms: IUniformBinding[] = [];

    if (!this.engine.supportWebGPU) {
      const moduleName = `material-${entity}`;
      this.shaderModule.registerModule(moduleName, {
        vs: params.vertexShader,
        fs: params.fragmentShader,
      });

      const materialModule = this.shaderModule.getModule(moduleName);
      vertexShaderGLSL = materialModule.vs;
      fragmentShaderGLSL = materialModule.fs;
      if (materialModule.uniforms) {
        // @ts-ignore
        uniforms = Object.keys(materialModule.uniforms).map((uniformName) => ({
          dirty: true,
          name: uniformName,
          // @ts-ignore
          data: materialModule.uniforms[uniformName],
        }));
      }
    }

    return this.material.create(entity, {
      vertexShaderGLSL,
      fragmentShaderGLSL,
      ...params,
      uniforms,
    });
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
  // private addBuiltinUniforms(entity: Entity) {
  //   this.addUniform(entity, {
  //     binding: 0,
  //     name: 'projectionMatrix',
  //     format: 'mat4',
  //     data: null,
  //     dirty: true,
  //   });
  //   this.addUniform(entity, {
  //     binding: 0,
  //     name: 'modelViewMatrix',
  //     format: 'mat4',
  //     data: null,
  //     dirty: true,
  //   });
  // }
}
