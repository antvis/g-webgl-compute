import { IFramebuffer } from './IFramebuffer';
import { BufferData } from './IRendererService';
import { ITexture2D } from './ITexture2D';

interface IStruct {
  [structPropName: string]: number | number[] | boolean | IStruct | IStruct[];
}

export type IUniform =
  | BufferData
  | boolean
  | IFramebuffer
  | ITexture2D
  | IStruct;
