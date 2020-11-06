// import { AST_TOKEN_TYPES, DefineValuePlaceholder, GLSLContext, STORAGE_CLASS, Target } from '@antv/g-webgpu-compiler';
// import { isArray, isNumber, isTypedArray } from 'lodash';
// import { Component, Entity } from '../..';
// import { NonFunctionProperties } from '../../ComponentManager';
// import { IComputeModel } from '../renderer/IComputeModel';
// import { IRendererService } from '../renderer/IRendererService';
// import { IComputeStrategy } from './IComputeStrategy';
// import { ComputeType } from './interface';

// export class ComputeComponent extends Component<ComputeComponent> {
//   public engine: IRendererService;
  

//   /**
//    * when finished, send back final particles' data
//    */
//   public onCompleted?:
//     | ((
//         particleData:
//           | Float32Array
//           | Float64Array
//           | Int8Array
//           | Uint8Array
//           | Uint8ClampedArray
//           | Int16Array
//           | Uint16Array
//           | Int32Array
//           | Uint32Array,
//       ) => void)
//     | null;

//   /**
//    * when every iteration finished, send back final particles' data
//    */
//   public onIterationCompleted?: ((iteration: number) => Promise<void>) | null;

//   constructor(data: Partial<NonFunctionProperties<ComputeComponent>>) {
//     super(data);

//     Object.assign(this, data);
//   }

  
// }
