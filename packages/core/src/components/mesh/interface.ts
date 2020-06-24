import { NonFunctionProperties } from '../../ComponentManager';
import { MeshComponent } from './MeshComponent';

export interface IMeshParams
  extends Partial<NonFunctionProperties<MeshComponent>> {}
