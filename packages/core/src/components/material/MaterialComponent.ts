import { Component } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
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
}
