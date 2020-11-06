import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { BufferData } from '../renderer/IRendererService';
import { IUniformBinding } from './interface';

export class MaterialComponent extends Component<MaterialComponent> {
  public vertexShaderGLSL: string;

  public fragmentShaderGLSL: string;

  public dirty = true;

  public uniforms: IUniformBinding[] = [];

  constructor(data: Partial<NonFunctionProperties<MaterialComponent>>) {
    super(data);

    Object.assign(this, data);
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
