export enum Target {
  WebGPU = 'WebGPU',
  WebGL = 'WebGL',
}

// http://learnwebgl.brown37.net/12_shader_language/glsl_data_types.html
export const typeCastFunctions = [
  'float',
  'int',
  'vec2',
  'vec3',
  'vec4',
  'bool',
  'ivec2',
  'ivec3',
  'ivec4',
  'bvec2',
  'bvec3',
  'bvec4',
  'mat2',
  'mat3',
  'mat4',
];

// https://stackoverflow.com/questions/12085403/whats-the-logic-for-determining-a-min-max-vector-in-glsl
// https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.30.pdf
export const componentWiseFunctions = [
  'radians',
  'degrees',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'pow',
  'exp',
  'log',
  'exp2',
  'log2',
  'sqrt',
  'abs',
  'sign',
  'floor',
  'ceil',
  'min',
  'max',
];

export const swizzling = [
  'r',
  'g',
  'b',
  'a',
  'x',
  'y',
  'z',
  'w',
  's',
  't',
  'p',
  'q',
];

export const typePriority = {
  float: 1,
  int: 2,
  vec2: 100,
  vec3: 101,
  vec4: 102,
};

export type BuiltinFunctionNames = string;

export const builtinFunctions = {
  [Target.WebGL]: `
    vec4 getThreadData(sampler2D tex) {
      return texture2D(tex, vec2(v_TexCoord.s, 1));
    }
    vec4 getThreadData(sampler2D tex, float i) {
      return texture2D(tex, vec2((i + 0.5) / u_TexSize, 1));
    }
    vec4 getThreadData(sampler2D tex, int i) {
      if (i == int(floor(v_TexCoord.s * u_TexSize + 0.5))) {
        return texture2D(tex, vec2(v_TexCoord.s, 1));
      }
      return texture2D(tex, vec2((float(i) + 0.5) / u_TexSize, 1));
    }
  `,
  [Target.WebGPU]: '',
};

export const exportFunctions = {
  [Target.WebGL]: {},
  [Target.WebGPU]: {},
};
