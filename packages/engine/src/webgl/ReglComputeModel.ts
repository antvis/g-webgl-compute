import { GLSLContext } from '@antv/g-webgpu-compiler';
import {
  gl,
  IComputeModel,
  IModelDrawOptions,
  IModelInitializationOptions,
  IUniform,
} from '@antv/g-webgpu-core';
import { isPlainObject, isTypedArray } from 'lodash';
import regl from 'regl';
import quadVert from './shaders/quad.vert.glsl';

/**
 * adaptor for regl.DrawCommand
 */
export default class ReglComputeModel implements IComputeModel {
  private texOutput: regl.Texture2D;
  private texInput: regl.Texture2D;
  private texFBO: regl.Framebuffer2D;
  private computeCommand: regl.DrawCommand;
  private textureCache: {
    [textureName: string]: regl.Texture2D;
  } = {};

  constructor(private reGl: regl.Regl, private context: GLSLContext) {
    const uniforms = {};

    let outputTextureName = '';
    let outputTextureData;
    let outputTextureSize;
    let outputTextureTypedArrayConstructor;
    let outputDataLength;
    let outputTexelCount;
    let outputElementsPerTexel;
    this.context.uniforms.forEach((uniform) => {
      const { name, type, data, format } = uniform;
      // 使用纹理存储
      if (type === 'sampler2D') {
        let elementsPerTexel = 1;
        if (format.endsWith('ec4[]')) {
          elementsPerTexel = 4;
        } else if (format.endsWith('ec3[]')) {
          elementsPerTexel = 3;
        } else if (format.endsWith('ec2[]')) {
          elementsPerTexel = 2;
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

        const originalDataLength = (data as ArrayLike<number>).length;
        const texelCount = Math.ceil(originalDataLength / elementsPerTexel);
        const width = Math.ceil(Math.sqrt(texelCount));
        const paddingTexelCount = width * width;
        if (texelCount < paddingTexelCount) {
          paddingData.push(
            ...new Array((paddingTexelCount - texelCount) * 4).fill(0),
          );
        }

        if (name === this.context.output.name) {
          outputTextureName = name;
          outputTextureData = paddingData;
          outputDataLength = originalDataLength;
          outputTextureSize = width;
          outputTexelCount = texelCount;
          outputElementsPerTexel = elementsPerTexel;
          if (isTypedArray(data)) {
            outputTextureTypedArrayConstructor = data!.constructor;
          }
        }

        const uniformTexture = this.reGl.texture({
          width,
          height: width,
          data: paddingData,
          type: 'float',
        });
        this.textureCache[name] = uniformTexture;
        // 需要动态获取，有可能在运行时通过 setBinding 关联到另一个计算程序的输出
        // @ts-ignore
        uniforms[name] =
          this.context.maxIteration > 1 && this.context.needPingpong
            ? this.textureCache[name]
            : () => this.textureCache[name];
        // @ts-ignore
        uniforms[`${name}Size`] = [width, width];
      } else {
        if (
          data &&
          (Array.isArray(data) || isTypedArray(data)) &&
          (data as ArrayLike<number>).length > 16
        ) {
          // 最多支持到 mat4 包含 16 个元素
          throw new Error(`invalid data type ${type}`);
        }
        // @ts-ignore
        uniforms[name] = () => uniform.data;
      }
    });

    // 传入 output 纹理尺寸和数据长度，便于多余的 texel 提前退出
    // @ts-ignore
    uniforms.u_OutputTextureSize = [outputTextureSize, outputTextureSize];
    // @ts-ignore
    uniforms.u_OutputTexelCount = outputTexelCount;

    // 大于一次且 输入输出均为自身的 认为需要 pingpong
    if (this.context.maxIteration > 1 && this.context.needPingpong) {
      // @ts-ignore
      this.texInput = uniforms[outputTextureName];
      // @ts-ignore
      uniforms[outputTextureName] = () => this.texInput;
      this.texOutput = this.reGl.texture({
        width: outputTextureSize,
        height: outputTextureSize,
        data: outputTextureData,
        type: 'float',
      });
    } else {
      this.texOutput = this.reGl.texture({
        width: outputTextureSize,
        height: outputTextureSize,
        type: 'float',
      });
    }

    this.context.output.typedArrayConstructor = outputTextureTypedArrayConstructor;
    this.context.output.length = outputDataLength;
    this.context.output.outputElementsPerTexel = outputElementsPerTexel;

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
      frag: this.context.shader,
      uniforms,
      vert: quadVert,
      // TODO: use a fullscreen triangle instead.
      primitive: 'triangle strip',
      count: 4,
    };

    this.computeCommand = this.reGl(drawParams);
  }

  public run() {
    this.texFBO = this.reGl.framebuffer({
      color: this.texOutput,
    });
    this.texFBO.use(() => {
      this.computeCommand();
    });

    // 需要 swap
    if (this.context.maxIteration > 1 && this.context.needPingpong) {
      const tmp = this.texOutput;
      this.texOutput = this.texInput!;
      this.texInput = tmp;
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
        output: {
          length,
          outputElementsPerTexel,
          typedArrayConstructor = Float32Array,
        },
      } = this.context;

      let formattedPixels = [];
      if (outputElementsPerTexel !== 4) {
        for (let i = 0; i < pixels.length; i += 4) {
          if (outputElementsPerTexel === 1) {
            formattedPixels.push(pixels[i]);
          } else if (outputElementsPerTexel === 2) {
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
      return new typedArrayConstructor(formattedPixels.slice(0, length));
    }

    return new Float32Array();
  }

  public confirmInput(model: IComputeModel, inputName: string) {
    // 需要 pingpong 的都有 texInput
    this.textureCache[inputName] =
      (model as ReglComputeModel).texInput ||
      (model as ReglComputeModel).texOutput;
  }

  public updateUniform() {
    // 在创建 regl uniforms 时已经使用了运行时动态获取
  }

  public destroy() {
    // 交给 regl 销毁
  }
}
