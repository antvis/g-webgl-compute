import { Component, Entity, gl } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { IModelInitializationOptions } from '../renderer/IModel';
import { BufferData } from '../renderer/IRendererService';
import { IUniformBinding } from './interface';

export class MaterialComponent extends Component<MaterialComponent> {
  public vertexShaderGLSL: string;

  public fragmentShaderGLSL: string;

  // control flow in shaders, eg. USE_UV, USE_MAP...
  public defines: Record<string, boolean | number> = {};

  public dirty = true;

  public uniforms: IUniformBinding[] = [];

  public cull: IModelInitializationOptions['cull'] = {
    enable: true,
    face: gl.BACK,
  };

  public depth: IModelInitializationOptions['depth'] = {
    enable: true,
  };

  public blend: IModelInitializationOptions['blend'];

  public entity: Entity;

  public type: string;

  constructor(data: Partial<NonFunctionProperties<MaterialComponent>>) {
    super(data);

    Object.assign(this, data);
  }

  public setDefines(defines: Record<string, boolean | number>) {
    this.defines = { ...this.defines, ...defines };
    return this;
  }

  public setCull(cull: IModelInitializationOptions['cull']) {
    this.cull = cull;
    return this;
  }

  public setDepth(depth: IModelInitializationOptions['depth']) {
    this.depth = depth;
    return this;
  }

  public setBlend(blend: IModelInitializationOptions['blend']) {
    this.blend = blend;
    return this;
  }

  public setUniform(
    name: string | Record<string, BufferData>,
    data?: BufferData,
  ) {
    if (typeof name !== 'string') {
      Object.keys(name).forEach((key) => this.setUniform(key, name[key]));
      return this;
    }

    const existedUniform = this.uniforms.find((u) => u.name === name);
    if (!existedUniform) {
      this.uniforms.push({
        name,
        dirty: true,
        data: data!,
      });
    } else {
      existedUniform.dirty = true;
      existedUniform.data = data!;
    }

    this.dirty = true;
    return this;
  }
}
