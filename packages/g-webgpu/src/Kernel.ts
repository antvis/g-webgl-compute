import {
  AST_TOKEN_TYPES,
  DefineValuePlaceholder,
  IComputeModel,
  IConfigService,
  IRendererService,
  KernelBundle,
  STORAGE_CLASS,
  Target,
} from '@antv/g-webgpu-core';
import { isArray, isNumber, isTypedArray } from 'lodash';
import { createCanvas } from './utils/canvas';

export class Kernel {

  private model: IComputeModel;

  private dirty: boolean = true;

  private compiledBundle: KernelBundle;

  private initPromise: Promise<void>;
  constructor(
    private readonly engine: IRendererService,
    private readonly configService: IConfigService,
  ) {}

  public init() {
    const { canvas, engineOptions } = this.configService.get();

    this.initPromise = this.engine.init({
      canvas: canvas || createCanvas(),
      // swapChainFormat: WebGPUConstants.TextureFormat.BGRA8Unorm,
      antialiasing: false,
      ...engineOptions,
    });
  }

  public setBundle(bundle: KernelBundle) {
    // deep clone
    this.compiledBundle = JSON.parse(JSON.stringify(bundle));
  }

  public setDispatch(dispatch: [number, number, number]) {
    if (this.compiledBundle.context) {
      this.compiledBundle.context.dispatch = dispatch;
    }
    return this;
  }

  public setMaxIteration(maxIteration: number) {
    if (this.compiledBundle.context) {
      this.compiledBundle.context.maxIteration = maxIteration;
    }
    return this;
  }

  public setBinding(
    name:
      | string
      | Record<
          string,
          | number
          | number[]
          | Float32Array
          | Uint8Array
          | Uint16Array
          | Uint32Array
          | Int8Array
          | Int16Array
          | Int32Array
        >,
    data?:
      | number
      | number[]
      | Float32Array
      | Uint8Array
      | Uint16Array
      | Uint32Array
      | Int8Array
      | Int16Array
      | Int32Array
      | Kernel,
  ) {
    if (typeof name === 'string') {
      const isNumberLikeData =
        isNumber(data) || isTypedArray(data) || isArray(data);
      if (this.compiledBundle && this.compiledBundle.context) {
        // set define, eg. setBinding('MAX_LENGTH', 10)
        const existedDefine = this.compiledBundle.context.defines.find(
          (b) => b.name === name,
        );
        if (existedDefine) {
          existedDefine.value = data as number;
          return this;
        }

        // set uniform
        const existedBinding = this.compiledBundle.context.uniforms.find(
          (b) => b.name === name,
        );
        if (existedBinding) {
          // update uniform or buffer
          if (isNumberLikeData) {
            // @ts-ignore
            existedBinding.data = data;
            existedBinding.isReferer = false;

            if (existedBinding.storageClass === STORAGE_CLASS.Uniform) {
              if (this.model) {
                // @ts-ignore
                this.model.updateUniform(name, data);
              }
            } else {
              if (this.model) {
                // @ts-ignore
                this.model.updateBuffer(name, data);
              }
            }
          } else {
            // update with another kernel
            existedBinding.isReferer = true;
            // @ts-ignore
            existedBinding.data = data as Kernel;
          }
        }
      }
    } else {
      Object.keys(name).forEach((key) => {
        this.setBinding(key, name[key]);
      });
    }
    return this;
  }

  public async execute(iteration: number = 1) {
    if (this.dirty) {
      if (this.compiledBundle.context) {
        if (iteration > 1) {
          this.compiledBundle.context.maxIteration = iteration;
        } else {
          this.compiledBundle.context.maxIteration++;
        }
      }
      await this.compile();
      this.dirty = false;
    }

    this.engine.beginFrame();

    // 首先开启当前 frame 的 compute pass
    this.engine.clear({});

    if (this.compiledBundle.context) {
      this.compiledBundle.context.uniforms
        .filter(({ isReferer }) => isReferer)
        .forEach(({ data, name }) => {
          // @ts-ignore
          this.model.confirmInput((data as Kernel).model, name);
        });
    }
    for (let i = 0; i < iteration; i++) {
      this.model.run();
    }

    this.engine.endFrame();
    return this;
  }

  /**
   * read output from GPUBuffer
   */
  public async getOutput() {
    return this.model.readData();
  }

  private async compile() {
    await this.initPromise;

    const context = {
      ...this.compiledBundle.context!,
    };

    const target = this.engine.supportWebGPU
      ? this.engine.useWGSL
        ? Target.WGSL
        : Target.GLSL450
      : Target.GLSL100;
    let shader = this.compiledBundle.shaders[target];

    // this.bindings?.forEach(({ name, data }) => {
    //   if (name === name.toUpperCase()) {
    //     const define = context.defines.find((d) => d.name === name);
    //     if (define) {
    //       // @ts-ignore
    //       define.value = data;
    //     }
    //   }
    // });

    // 生成运行时 define
    context.defines
      .filter((define) => define.runtime)
      .forEach((define) => {
        const valuePlaceHolder = `${DefineValuePlaceholder}${define.name}`;
        shader = shader.replace(valuePlaceHolder, `${define.value}`);
      });

    context.shader = shader;

    // 添加 uniform 绑定的数据
    context.uniforms.forEach((uniform) => {
      // const binding = this.bindings.find((b) => b.name === uniform.name);
      // if (binding) {
      //   // @ts-ignore
      //   uniform.data = binding.referer || binding.data;
      //   // @ts-ignore
      //   uniform.isReferer = !!binding.referer;
      // }

      // 未指定数据，尝试根据 uniform 类型初始化
      if (!uniform.data) {
        if (uniform.storageClass === STORAGE_CLASS.StorageBuffer) {
          let sizePerElement = 1;
          if (uniform.type === AST_TOKEN_TYPES.FloatArray) {
            sizePerElement = 1;
          } else if (uniform.type === AST_TOKEN_TYPES.Vector4FloatArray) {
            sizePerElement = 4;
          }
          uniform.data = new Float32Array(
            context.output.length! * sizePerElement,
          ).fill(0);
        }
      }
    });
    // } else if (uniform.type === 'image2D') {
    //   // @ts-ignore
    //   buffer.data = new Uint8ClampedArray(context.output.length!).fill(0);
    // }

    this.compiledBundle.context = context;
    this.model = await this.engine.createComputeModel(
      this.compiledBundle.context,
    );
  }
}
