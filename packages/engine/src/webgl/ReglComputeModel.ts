import {
  AST_TOKEN_TYPES,
  createEntity,
  DataType,
  GLSLContext,
  IComputeModel,
  STORAGE_CLASS,
} from '@antv/g-webgpu-core';
import { isTypedArray } from 'lodash';
import regl from 'regl';
import quadVert from './shaders/quad.vert.glsl';

interface DataTextureDescriptor {
  id: number;
  data:
    | number
    | number[]
    | Float32Array
    | Uint8Array
    | Uint16Array
    | Uint32Array
    | Int8Array
    | Int16Array
    | Int32Array
    | undefined;
  textureWidth: number;
  texture: regl.Texture2D;
  texelCount: number;
  originalDataLength: number;
  elementsPerTexel: number;
  typedArrayConstructor?: Function;
  isOutput: boolean;
}

let textureId = 0;
const debug = false;

/**
 * adaptor for regl.DrawCommand
 */
export default class ReglComputeModel implements IComputeModel {
  private entity = createEntity();
  private texFBO: regl.Framebuffer2D;
  private computeCommand: regl.DrawCommand;
  private textureCache: {
    [textureName: string]: DataTextureDescriptor;
  } = {};
  private outputTextureName: string;
  private swapOutputTextureName: string;
  private compiledPingpong: boolean;
  private dynamicPingpong: boolean;

  constructor(private reGl: regl.Regl, private context: GLSLContext) {
    const uniforms: Record<string, any> = {};
    this.context.uniforms.forEach((uniform) => {
      const { name, type, data, isReferer, storageClass } = uniform;
      // store data with a 2D texture
      if (storageClass === STORAGE_CLASS.StorageBuffer) {
        if (!isReferer) {
          this.textureCache[name] = this.calcDataTexture(name, type, data!);
          const { textureWidth: width, isOutput } = this.textureCache[name];
          uniforms[`${name}Size`] = [width, width];

          if (isOutput) {
            this.outputTextureName = name;
            if (this.context.needPingpong) {
              this.outputTextureName = `${name}Output`;
              this.textureCache[this.outputTextureName] = this.calcDataTexture(
                name,
                type,
                data!,
              );
            }
          }
        } else {
          // @ts-ignore
          this.textureCache[name] = {
            data: undefined,
          };
          // refer to another kernel's output,
          // the referred kernel may not have been initialized, so we use dynamic way here
          uniforms[`${name}Size`] = () =>
            // @ts-ignore
            data.compiledBundle.context.output.textureSize;
        }

        uniforms[name] = () => {
          if (debug) {
            console.log(
              `[${this.entity}]: ${name} ${this.textureCache[name].id}`,
            );
          }
          return this.textureCache[name].texture;
        };
      } else if (storageClass === STORAGE_CLASS.Uniform) {
        if (
          data &&
          (Array.isArray(data) || isTypedArray(data)) &&
          (data as ArrayLike<number>).length > 16
        ) {
          // up to mat4 which includes 16 elements
          throw new Error(`invalid data type ${type}`);
        }
        // get uniform dynamically
        uniforms[name] = () => uniform.data;
      }
    });

    const { textureWidth, texelCount } = this.getOuputDataTexture();

    // 传入 output 纹理尺寸和数据长度，便于多余的 texel 提前退出
    uniforms.u_OutputTextureSize = [textureWidth, textureWidth];
    uniforms.u_OutputTexelCount = texelCount;

    // 保存在 Kernel 的上下文中，供其他 Kernel 引用
    this.context.output.textureSize = [textureWidth!, textureWidth!];

    const drawParams: regl.DrawConfig = {
      attributes: {
        a_Position: [
          [-1, 1, 0],
          [-1, -1, 0],
          [1, 1, 0],
          [1, -1, 0],
        ],
        a_TexCoord: [
          [0, 1],
          [0, 0],
          [1, 1],
          [1, 0],
        ],
      },
      frag: `#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif
${this.context.shader}`,
      uniforms,
      vert: quadVert,
      // TODO: use a fullscreen triangle instead.
      primitive: 'triangle strip',
      count: 4,
    };

    this.computeCommand = this.reGl(drawParams);
  }

  public run() {
    if (this.context.maxIteration > 1 && this.context.needPingpong) {
      this.compiledPingpong = true;
    }
    // need pingpong when (@in@out and execute(10)) or use `setBinding('out', self)`
    // this.needPingpong =
    //   !!(this.context.maxIteration > 1 && this.context.needPingpong);

    // if (this.relativeOutputTextureNames.length) {
    //   const { id, texture } = this.getOuputDataTexture();
    //   this.relativeOutputTextureNames.forEach((name) => {
    //     this.textureCache[name].id = id;
    //     this.textureCache[name].texture = texture;
    //   });
    //   this.swap();
    // }

    if (this.compiledPingpong || this.dynamicPingpong) {
      this.swap();
    }

    this.texFBO = this.reGl.framebuffer({
      color: this.getOuputDataTexture().texture,
    });
    this.texFBO.use(() => {
      this.computeCommand();
    });
    if (debug) {
      console.log(`[${this.entity}]: output ${this.getOuputDataTexture().id}`);
    }
  }

  public async readData() {
    let pixels: Uint8Array | Float32Array;
    this.reGl({
      framebuffer: this.texFBO,
    })(() => {
      pixels = this.reGl.read();
    });

    // @ts-ignore
    if (pixels) {
      const {
        originalDataLength,
        elementsPerTexel,
        typedArrayConstructor = Float32Array,
      } = this.getOuputDataTexture();

      let formattedPixels = [];
      if (elementsPerTexel !== 4) {
        for (let i = 0; i < pixels.length; i += 4) {
          if (elementsPerTexel === 1) {
            formattedPixels.push(pixels[i]);
          } else if (elementsPerTexel === 2) {
            formattedPixels.push(pixels[i], pixels[i + 1]);
          } else {
            formattedPixels.push(pixels[i], pixels[i + 1], pixels[i + 2]);
          }
        }
      } else {
        // @ts-ignore
        formattedPixels = pixels;
      }

      // 截取多余的部分
      // @ts-ignore
      return new typedArrayConstructor(
        formattedPixels.slice(0, originalDataLength),
      );
    }

    return new Float32Array();
  }

  public confirmInput(model: IComputeModel, inputName: string) {
    let inputModel: ReglComputeModel;
    // refer to self, same as pingpong
    if (this.entity === (model as ReglComputeModel).entity) {
      this.dynamicPingpong = true;
      inputModel = this;
    } else {
      inputModel = model as ReglComputeModel;
    }

    this.textureCache[inputName].id = inputModel.getOuputDataTexture().id;
    this.textureCache[
      inputName
    ].texture = inputModel.getOuputDataTexture().texture;

    if (debug) {
      console.log(
        `[${this.entity}]: confirm input ${inputName} from model ${
          inputModel.entity
        }, ${(inputModel as ReglComputeModel).getOuputDataTexture().id}`,
      );
    }
  }

  public updateUniform() {
    // already get uniform's data dynamically when created, do nothing here
  }

  public updateBuffer(
    bufferName: string,
    data:
      | number[]
      | Float32Array
      | Uint8Array
      | Uint16Array
      | Uint32Array
      | Int8Array
      | Int16Array
      | Int32Array,
    offset: number = 0,
  ) {
    // regenerate data texture
    const buffer = this.context.uniforms.find(
      ({ name }) => name === bufferName,
    );
    if (buffer) {
      const { texture, data: paddingData } = this.calcDataTexture(
        bufferName,
        buffer.type,
        data,
      );

      // TODO: destroy outdated texture
      this.textureCache[bufferName].data = paddingData;
      this.textureCache[bufferName].texture = texture;
    }
  }

  public destroy() {
    // regl will destroy all resources
  }

  private swap() {
    if (!this.swapOutputTextureName) {
      this.createSwapOutputDataTexture();
    }

    if (this.compiledPingpong) {
      const outputTextureUniformName = this.context.output.name;
      this.textureCache[
        outputTextureUniformName
      ].id = this.getOuputDataTexture().id;
      this.textureCache[
        outputTextureUniformName
      ].texture = this.getOuputDataTexture().texture;
    }

    const tmp = this.outputTextureName;
    this.outputTextureName = this.swapOutputTextureName;
    this.swapOutputTextureName = tmp;

    if (debug) {
      console.log(
        `[${this.entity}]: after swap, output ${this.getOuputDataTexture().id}`,
      );
    }
  }

  private getOuputDataTexture() {
    return this.textureCache[this.outputTextureName];
  }

  private createSwapOutputDataTexture() {
    const texture = this.cloneDataTexture(this.getOuputDataTexture());
    this.swapOutputTextureName = `${this.entity}-swap`;
    this.textureCache[this.swapOutputTextureName] = texture;
  }

  private cloneDataTexture(texture: DataTextureDescriptor) {
    const { data, textureWidth } = texture;
    return {
      ...texture,
      id: textureId++,
      // @ts-ignore
      texture: this.reGl.texture({
        width: textureWidth,
        height: textureWidth,
        data,
        type: 'float',
      }),
    };
  }

  private calcDataTexture(
    name: string,
    type: DataType,
    data:
      | number
      | number[]
      | Float32Array
      | Uint8Array
      | Uint16Array
      | Uint32Array
      | Int8Array
      | Int16Array
      | Int32Array,
  ) {
    let elementsPerTexel = 1;
    if (type === AST_TOKEN_TYPES.Vector4FloatArray) {
      elementsPerTexel = 4;
    }

    // 用 0 补全不足 vec4 的部分
    const paddingData: number[] = [];
    for (let i = 0; i < (data as number[]).length; i += elementsPerTexel) {
      if (elementsPerTexel === 1) {
        paddingData.push((data as number[])[i], 0, 0, 0);
      } else if (elementsPerTexel === 2) {
        paddingData.push(
          (data as number[])[i],
          (data as number[])[i + 1],
          0,
          0,
        );
      } else if (elementsPerTexel === 3) {
        paddingData.push(
          (data as number[])[i],
          (data as number[])[i + 1],
          (data as number[])[i + 2],
          0,
        );
      } else if (elementsPerTexel === 4) {
        paddingData.push(
          (data as number[])[i],
          (data as number[])[i + 1],
          (data as number[])[i + 2],
          (data as number[])[i + 3],
        );
      }
    }

    // 使用纹理存储，例如 Array(8) 使用 3 * 3 纹理，末尾空白使用 0 填充
    const originalDataLength = (data as ArrayLike<number>).length;
    const texelCount = Math.ceil(originalDataLength / elementsPerTexel);
    const width = Math.ceil(Math.sqrt(texelCount));
    const paddingTexelCount = width * width;
    if (texelCount < paddingTexelCount) {
      paddingData.push(
        ...new Array((paddingTexelCount - texelCount) * 4).fill(0),
      );
    }

    const texture = this.reGl.texture({
      width,
      height: width,
      data: paddingData,
      type: 'float',
    });

    return {
      id: textureId++,
      data: paddingData,
      originalDataLength,
      typedArrayConstructor: isTypedArray(data) ? data!.constructor : undefined,
      textureWidth: width,
      texture,
      texelCount,
      elementsPerTexel,
      isOutput: name === this.context.output.name,
    };
  }
}
