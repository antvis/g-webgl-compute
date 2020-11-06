// import { AST_TOKEN_TYPES, DefineValuePlaceholder, GLSLContext, STORAGE_CLASS, Target } from '@antv/g-webgpu-compiler';
// import { inject, injectable } from 'inversify';
// import { Component, container, createEntity, Entity } from '../..';
// import { ComponentManager } from '../../ComponentManager';
// import { IDENTIFIER } from '../../identifier';
// import { ISystem } from '../../ISystem';
// import { isSafari } from '../../utils/isSafari';
// import { IRendererService } from '../renderer/IRendererService';
// import { ComputeComponent } from './ComputeComponent';
// import { IComputeStrategy } from './IComputeStrategy';
// import { ComputeType } from './interface';

// @injectable()
// export class ComputeSystem implements ISystem {
//   @inject(IDENTIFIER.ComputeComponentManager)
//   private readonly compute: ComponentManager<ComputeComponent>;

//   @inject(IDENTIFIER.RenderEngine)
//   private readonly engine: IRendererService;

//   public async execute() {
//     // 首先开启当前 frame 的 compute pass
//     this.engine.clear({});

//     // // 考虑多个计算程序之间的依赖关系
//     // // 先找到多个计算程序中最大的迭代次数，然后按顺序执行
//     // let maxIteration = 0;
//     // this.compute.map((entity, component) => {
//     //   if (component.maxIteration > maxIteration) {
//     //     maxIteration = component.maxIteration;
//     //   }
//     // });

//     // // 首先所有计算程序依次初始化
//     // for (let j = 0; j < this.compute.getCount(); j++) {
//     //   const component = this.compute.getComponent(j);
//     //   if (!component.finished) {
//     //     if (component.dirty) {
//     //       await this.compile(component);
//     //       component.dirty = false;
//     //     }
//     //   }
//     // }

//     // for (let i = 0; i < maxIteration; i++) {
//     //   for (let j = 0; j < this.compute.getCount(); j++) {
//     //     const component = this.compute.getComponent(j);
//     //     if (!component.finished) {
//     //       if (component.iteration <= component.maxIteration - 1) {
//     //         component.model.run();
//     //         if (component.onIterationCompleted) {
//     //           await component.onIterationCompleted(component.iteration);
//     //         }
//     //         component.iteration++;
//     //       } else {
//     //         component.finished = true;
//     //         if (component.onCompleted) {
//     //           component.onCompleted(await component.model.readData());
//     //         }
//     //       }
//     //     }
//     //   }
//     // }
//   }

//   public tearDown() {
//     this.compute.forEach((_, compute) => {
//       compute.model.destroy();
//     });
//     this.compute.clear();
//   }

//   public createComputePipeline({
//     type = 'layout',
//     target,
//     precompiledBundle,
//     dispatch = [1, 1, 1],
//     maxIteration = 1,
//     onCompleted = null,
//     onIterationCompleted = null,
//   }: {
//     type: ComputeType;
//     target?: Target;
//     precompiledBundle: string;
//     dispatch: [number, number, number];
//     maxIteration?: number;
//     onCompleted?:
//       | ((
//           particleData:
//             | Float32Array
//             | Float64Array
//             | Int8Array
//             | Uint8Array
//             | Uint8ClampedArray
//             | Int16Array
//             | Uint16Array
//             | Int32Array
//             | Uint32Array,
//         ) => void)
//       | null;
//     onIterationCompleted?: ((iteration: number) => Promise<void>) | null;
//   }) {
//     const entity = createEntity();
//     // 默认优先使用 WebGPU
//     const currentTarget =
//       target || (this.engine.supportWebGPU ? Target.WGSL : Target.GLSL100);

//     const computeData = {
//       type,
//       target: currentTarget,
//       compiledBundle: {
//         shaders: {
//           [Target.WGSL]: '',
//           [Target.GLSL450]: '',
//           [Target.GLSL100]: '',
//         },
//         context: undefined,
//       },
//       dispatch,
//       maxIteration,
//       engine: this.engine,
//       // onCompleted,
//       // onIterationCompleted,
//     };

//     if (precompiledBundle) {
//       // 预编译的结果应该包含所有目标平台的 Shader 代码
//       computeData.compiledBundle = JSON.parse(precompiledBundle);
//     }

//     return this.compute.create(entity, computeData);
//   }
// }
