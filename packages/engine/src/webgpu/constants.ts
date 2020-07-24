import { gl, IModelInitializationOptions } from '@antv/g-webgpu-core';
import * as WebGPUConstants from '@webgpu/types/dist/constants';

// WebGPU 不支持 LINE_LOOP & TRIANGLE_FAN
export const primitiveMap: {
  [key: string]:
    | WebGPUConstants.PrimitiveTopology.PointList
    | WebGPUConstants.PrimitiveTopology.LineList
    | WebGPUConstants.PrimitiveTopology.LineStrip
    | WebGPUConstants.PrimitiveTopology.TriangleList
    | WebGPUConstants.PrimitiveTopology.TriangleStrip;
} = {
  [gl.POINTS]: WebGPUConstants.PrimitiveTopology.PointList,
  [gl.LINES]: WebGPUConstants.PrimitiveTopology.LineList,
  [gl.LINE_LOOP]: WebGPUConstants.PrimitiveTopology.LineList,
  [gl.LINE_STRIP]: WebGPUConstants.PrimitiveTopology.LineStrip,
  [gl.TRIANGLES]: WebGPUConstants.PrimitiveTopology.TriangleList,
  [gl.TRIANGLE_FAN]: WebGPUConstants.PrimitiveTopology.TriangleList,
  [gl.TRIANGLE_STRIP]: WebGPUConstants.PrimitiveTopology.TriangleStrip,
};

export const depthFuncMap: {
  [key: string]:
    | WebGPUConstants.CompareFunction.Never
    | WebGPUConstants.CompareFunction.Always
    | WebGPUConstants.CompareFunction.Less
    | WebGPUConstants.CompareFunction.LessEqual
    | WebGPUConstants.CompareFunction.Greater
    | WebGPUConstants.CompareFunction.GreaterEqual
    | WebGPUConstants.CompareFunction.Equal
    | WebGPUConstants.CompareFunction.NotEqual;
} = {
  [gl.NEVER]: WebGPUConstants.CompareFunction.Never,
  [gl.ALWAYS]: WebGPUConstants.CompareFunction.Always,
  [gl.LESS]: WebGPUConstants.CompareFunction.Less,
  [gl.LEQUAL]: WebGPUConstants.CompareFunction.LessEqual,
  [gl.GREATER]: WebGPUConstants.CompareFunction.Greater,
  [gl.GEQUAL]: WebGPUConstants.CompareFunction.GreaterEqual,
  [gl.EQUAL]: WebGPUConstants.CompareFunction.Equal,
  [gl.NOTEQUAL]: WebGPUConstants.CompareFunction.NotEqual,
};

export const blendEquationMap: {
  [key: string]:
    | WebGPUConstants.BlendOperation.Add
    | WebGPUConstants.BlendOperation.Min
    | WebGPUConstants.BlendOperation.Max
    | WebGPUConstants.BlendOperation.Subtract
    | WebGPUConstants.BlendOperation.ReverseSubtract;
} = {
  [gl.FUNC_ADD]: WebGPUConstants.BlendOperation.Add,
  [gl.MIN_EXT]: WebGPUConstants.BlendOperation.Min,
  [gl.MAX_EXT]: WebGPUConstants.BlendOperation.Max,
  [gl.FUNC_SUBTRACT]: WebGPUConstants.BlendOperation.Subtract,
  [gl.FUNC_REVERSE_SUBTRACT]: WebGPUConstants.BlendOperation.ReverseSubtract,
};

// @see https://gpuweb.github.io/gpuweb/#blend-state
// 不支持 'constant alpha' 和 'one minus constant alpha'
export const blendFuncMap: {
  [key: string]:
    | WebGPUConstants.BlendFactor.Zero
    | WebGPUConstants.BlendFactor.One
    | WebGPUConstants.BlendFactor.SrcColor
    | WebGPUConstants.BlendFactor.OneMinusSrcColor
    | WebGPUConstants.BlendFactor.SrcAlpha
    | WebGPUConstants.BlendFactor.OneMinusSrcAlpha
    | WebGPUConstants.BlendFactor.DstColor
    | WebGPUConstants.BlendFactor.OneMinusDstColor
    | WebGPUConstants.BlendFactor.DstAlpha
    | WebGPUConstants.BlendFactor.OneMinusDstAlpha
    | WebGPUConstants.BlendFactor.BlendColor
    | WebGPUConstants.BlendFactor.OneMinusBlendColor
    | WebGPUConstants.BlendFactor.SrcAlphaSaturated;
} = {
  [gl.ZERO]: WebGPUConstants.BlendFactor.Zero,
  [gl.ONE]: WebGPUConstants.BlendFactor.One,
  [gl.SRC_COLOR]: WebGPUConstants.BlendFactor.SrcColor,
  [gl.ONE_MINUS_SRC_COLOR]: WebGPUConstants.BlendFactor.OneMinusSrcColor,
  [gl.SRC_ALPHA]: WebGPUConstants.BlendFactor.SrcAlpha,
  [gl.ONE_MINUS_SRC_ALPHA]: WebGPUConstants.BlendFactor.OneMinusSrcAlpha,
  [gl.DST_COLOR]: WebGPUConstants.BlendFactor.DstColor,
  [gl.ONE_MINUS_DST_COLOR]: WebGPUConstants.BlendFactor.OneMinusDstColor,
  [gl.DST_ALPHA]: WebGPUConstants.BlendFactor.DstAlpha,
  [gl.ONE_MINUS_DST_ALPHA]: WebGPUConstants.BlendFactor.OneMinusDstAlpha,
  [gl.CONSTANT_COLOR]: WebGPUConstants.BlendFactor.BlendColor,
  [gl.ONE_MINUS_CONSTANT_COLOR]: WebGPUConstants.BlendFactor.OneMinusBlendColor,
  // [gl.CONSTANT_ALPHA]: WebGPUConstants.BlendFactor.'constant alpha',
  // [gl.ONE_MINUS_CONSTANT_ALPHA]: WebGPUConstants.BlendFactor.'one minus constant alpha',
  [gl.SRC_ALPHA_SATURATE]: WebGPUConstants.BlendFactor.SrcAlphaSaturated,
};

export function getCullMode({
  cull,
}: Pick<IModelInitializationOptions, 'cull'>):
  | 'none'
  | 'front'
  | 'back'
  | undefined {
  if (!cull || !cull.enable) {
    return WebGPUConstants.CullMode.None;
  }

  if (cull.face) {
    return cull.face === gl.FRONT
      ? WebGPUConstants.CullMode.Front
      : WebGPUConstants.CullMode.Back;
  }
}

export function getDepthStencilStateDescriptor({
  depth,
  stencil,
}: Pick<IModelInitializationOptions, 'depth' | 'stencil'>):
  | GPUDepthStencilStateDescriptor
  | undefined {
  // TODO: stencil

  const stencilFrontBack: GPUStencilStateFaceDescriptor = {
    compare: WebGPUConstants.CompareFunction.Always,
    depthFailOp: WebGPUConstants.StencilOperation.Keep,
    failOp: WebGPUConstants.StencilOperation.Keep,
    passOp: WebGPUConstants.StencilOperation.Keep,
  };

  return {
    depthWriteEnabled: depth && depth.enable,
    depthCompare: depthFuncMap[depth?.func || gl.ALWAYS],
    format: WebGPUConstants.TextureFormat.Depth24PlusStencil8,
    stencilFront: stencilFrontBack,
    stencilBack: stencilFrontBack,
    stencilReadMask: 0xffffffff,
    stencilWriteMask: 0xffffffff,
  };
}

/**
 * @see https://gpuweb.github.io/gpuweb/#color-state
 */
export function getColorStateDescriptors(
  { blend }: Pick<IModelInitializationOptions, 'blend'>,
  swapChainFormat: GPUTextureFormat,
): GPUColorStateDescriptor[] {
  return [
    {
      format: swapChainFormat,
      // https://gpuweb.github.io/gpuweb/#blend-state
      alphaBlend: {
        srcFactor:
          blendFuncMap[(blend && blend.func && blend.func.srcAlpha) || gl.ONE],
        dstFactor:
          blendFuncMap[(blend && blend.func && blend.func.dstAlpha) || gl.ZERO],
        operation:
          blendEquationMap[
            (blend && blend.equation && blend.equation.alpha) || gl.FUNC_ADD
          ],
      },
      colorBlend: {
        srcFactor:
          blendFuncMap[(blend && blend.func && blend.func.srcRGB) || gl.ONE],
        dstFactor:
          blendFuncMap[(blend && blend.func && blend.func.dstRGB) || gl.ZERO],
        operation:
          blendEquationMap[
            (blend && blend.equation && blend.equation.rgb) || gl.FUNC_ADD
          ],
      },
      writeMask: WebGPUConstants.ColorWrite.All,
    },
  ];
}
