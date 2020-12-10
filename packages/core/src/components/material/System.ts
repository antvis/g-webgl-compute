import { mat4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { createEntity, Entity, IUniformBinding } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { IShaderModuleService } from '../../services/shader-module/IShaderModuleService';
import { getLengthFromFormat } from '../../utils/shader';
import { IModelInitializationOptions } from '../renderer/IModel';
import { BufferData, IRendererService } from '../renderer/IRendererService';
import { MaterialComponent } from './MaterialComponent';

@injectable()
export class MaterialSystem implements ISystem {
  @inject(IDENTIFIER.MaterialComponentManager)
  private readonly material: ComponentManager<MaterialComponent>;

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  @inject(IDENTIFIER.ShaderModuleService)
  private readonly shaderModule: IShaderModuleService;

  public async execute() {
    // await Promise.all(
    //   this.material.map(async (entity, component) => {
    //     // if (component.dirty) {
    //     // TODO: 使用 cache 避免同类材质的重复编译
    //     // component.stageDescriptor = await this.engine.compilePipelineStageDescriptor(
    //     //   component.vertexShaderGLSL,
    //     //   component.fragmentShaderGLSL,
    //     //   null,
    //     // );
    //     // this.generateUniforms(component);
    //     //   component.dirty = false;
    //     // }
    //   }),
    // );
  }

  public tearDown() {
    this.material.clear();
  }

  /**
   * @see https://threejs.org/docs/#api/en/materials/ShaderMaterial
   */
  public createShaderMaterial(params: {
    vertexShader: string;
    fragmentShader: string;
    cull?: IModelInitializationOptions['cull'];
    depth?: IModelInitializationOptions['depth'];
    blend?: IModelInitializationOptions['blend'];
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
      vertexShaderGLSL = materialModule.vs!;
      fragmentShaderGLSL = materialModule.fs!;
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
}
