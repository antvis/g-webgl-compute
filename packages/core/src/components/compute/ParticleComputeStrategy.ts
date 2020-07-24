// import { inject, injectable } from 'inversify';
// import { IRenderEngine } from '../..';
// import { IDENTIFIER } from '../../identifier';
// import { ComputeComponent } from './ComputeComponent';
// import { IComputeStrategy } from './IComputeStrategy';

// /**
//  * 适合粒子特效场景，由于需要配合渲染，因此：
//  * 1. 每一帧只需要 dispatch 一次
//  * 2. 使用两个 buffer 进行 Ping-pong 操作
//  * 3. 通常不需要设置最大迭代次数
//  */
// @injectable()
// export class ParticleComputeStrategy implements IComputeStrategy {
//   public component: ComputeComponent;

//   @inject(IDENTIFIER.RenderEngine)
//   private readonly engine: IRenderEngine;

//   public init() {
//     const component = this.component;

//     // create particleBuffers
//     // component.particleBuffers = [
//     //   this.engine.createVertexBuffer(component.particleData, 128),
//     //   this.engine.createVertexBuffer(component.particleData, 128),
//     // ];

//     // create GPUBuffers for uniform & storeage buffers
//     // component.bindings.forEach((binding) => {
//     //   if (binding.type === 'uniform-buffer' && binding.data) {
//     //     binding.buffer = this.engine.createUniformBuffer(binding.data);
//     //   } else if (binding.type === 'storage-buffer' && binding.data) {
//     //     binding.buffer = this.engine.createVertexBuffer(binding.data, 128);
//     //   }
//     // });

//     // create compute pipeline layout
//     const computeBindGroupLayout = this.engine
//       .getDevice()
//       .createBindGroupLayout({
//         entries: [
//           {
//             binding: 0,
//             visibility: 4, // ShaderStage.Compute
//             type: 'storage-buffer',
//           },
//           {
//             binding: 1,
//             visibility: 4,
//             type: 'storage-buffer',
//           },
//           // ...component.bindings.map((binding) => ({
//           //   binding: binding.binding,
//           //   visibility: 4,
//           //   type: binding.type,
//           // })),
//         ],
//       });
//     component.pipelineLayout = this.engine.getDevice().createPipelineLayout({
//       bindGroupLayouts: [computeBindGroupLayout],
//     });

//     // for (let i = 0; i < 2; i++) {
//     //   component.particleBindGroups[i] = this.engine
//     //     .getDevice()
//     //     .createBindGroup({
//     //       layout: computeBindGroupLayout,
//     //       entries: [
//     //         {
//     //           binding: 0,
//     //           resource: {
//     //             buffer: component.particleBuffers[i],
//     //             offset: 0,
//     //             size: component.particleData.byteLength,
//     //           },
//     //         },
//     //         {
//     //           binding: 1,
//     //           resource: {
//     //             buffer: component.particleBuffers[(i + 1) % 2],
//     //             offset: 0,
//     //             size: component.particleData.byteLength,
//     //           },
//     //         },
//     //         ...component.bindings.map((binding) => ({
//     //           binding: binding.binding,
//     //           resource: {
//     //             buffer: binding.buffer!,
//     //             offset: 0,
//     //             size: binding.data?.byteLength || 0,
//     //           },
//     //         })),
//     //       ],
//     //     });
//     // }
//   }

//   public async run() {
//     this.engine.dispatch(this.component.compiledBundle.context);
//     this.component.iteration++;
//   }

//   public getBindingGroup() {
//     return this.component.particleBindGroups[this.component.iteration % 2];
//   }

//   public getGPUBuffer() {
//     return this.component.particleBuffers[this.component.iteration % 2];
//   }

//   public updateUniformGPUBuffer() {
//     //
//   }

//   public destroy() {
//     this.component.particleBuffers.forEach((buffer) => buffer.destroy());
//   }
// }
