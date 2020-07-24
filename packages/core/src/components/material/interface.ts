import { BufferData } from '../renderer/IRendererService';

export interface IUniformBinding {
  dirty: boolean;
  data: BufferData;
  binding?: number;
  name: string;
  format?: string;
  offset?: number;
  length?: number;
}
