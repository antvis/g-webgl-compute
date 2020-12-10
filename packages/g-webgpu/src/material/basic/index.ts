import {
  IDENTIFIER,
  IRendererService,
  IShaderModuleService,
} from '@antv/g-webgpu-core';
import { mat3 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { Material } from '..';
import { Texture2D } from '../../texture/Texture2D';
import webglFragmentShaderGLSL from './shaders/webgl.basic.frag.glsl';
import webglVertexShaderGLSL from './shaders/webgl.basic.vert.glsl';
import webgpuFragmentShaderGLSL from './shaders/webgpu.basic.frag.glsl';
import webgpuVertexShaderGLSL from './shaders/webgpu.basic.vert.glsl';

export interface IBasicMaterialParams {
  map: Texture2D;
}

@injectable()
/**
 * This material is not affected by lights.
 * @see https://threejs.org/docs/#api/en/materials/MeshBasicMaterial
 */
export class Basic extends Material<Partial<IBasicMaterialParams>> {
  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  @inject(IDENTIFIER.ShaderModuleService)
  private readonly shaderModuleService: IShaderModuleService;

  protected onEntityCreated() {
    const component = this.getComponent();
    const vertexShaderGLSL = this.engine.supportWebGPU
      ? webgpuVertexShaderGLSL
      : webglVertexShaderGLSL;
    const fragmentShaderGLSL = this.engine.supportWebGPU
      ? webgpuFragmentShaderGLSL
      : webglFragmentShaderGLSL;

    this.shaderModuleService.registerModule('material-basic', {
      vs: vertexShaderGLSL,
      fs: fragmentShaderGLSL,
    });
    const {
      vs,
      fs,
      uniforms: extractedUniforms,
    } = this.shaderModuleService.getModule('material-basic');

    component.vertexShaderGLSL = vs!;
    component.fragmentShaderGLSL = fs!;
    // @ts-ignore
    component.setUniform(extractedUniforms);

    if (this.config.map) {
      component.setDefines({
        USE_UV: 1,
        USE_MAP: 1,
      });
      component.setUniform({
        map: this.config.map,
        uvTransform: mat3.create(),
      });
    }
  }
}
