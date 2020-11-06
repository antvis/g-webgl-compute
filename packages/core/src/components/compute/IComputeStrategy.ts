// import { GLSLContext } from '@antv/g-webgpu-compiler';
// import { ComputeComponent } from './ComputeComponent';

// export interface IComputeStrategy {
//   component: ComputeComponent;

//   /**
//    * create binding group, buffers
//    */
//   init(context: GLSLContext): void;

//   /**
//    * dispatch with different frequencies
//    */
//   run(): Promise<void>;

//   /**
//    *
//    */
//   getGPUBuffer(): GPUBuffer;

//   /**
//    *
//    */
//   getBindingGroup(): GPUBindGroup;

//   /**
//    * 通过名称更新 uniform
//    */
//   updateUniformGPUBuffer(
//     uniformName: string,
//     data:
//       | number
//       | number[]
//       | Float32Array
//       | Uint8Array
//       | Uint16Array
//       | Uint32Array
//       | Int8Array
//       | Int16Array
//       | Int32Array,
//   ): void;

//   /**
//    * destroy used GPUBuffer(s)
//    */
//   destroy(): void;
// }
