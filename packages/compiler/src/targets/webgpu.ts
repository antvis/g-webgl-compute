import { GLSLContext } from '../index';
import { IShaderGenerator } from './IShaderGenerator';

/**
 * 生成供 WebGPU 使用的 GLSL 450
 * 内容大致为：
 * 1. WorkGroup 声明 layout (local_size_x
 * 2. 常量 #define
 * 3. 变量 layout(std140, set = 0, binding = 0) uniform GWebGPUParams
 * 4. Buffers
 * 5. 全局变量声明
 * 6. 函数声明
 *   6.1 内置 import
 *   6.2 用户自定义
 * 7. main 函数
 */
export class WebGPUShaderGenerator implements IShaderGenerator {
  public static GWEBGPU_UNIFORM_PARAMS = 'gWebGPUUniformParams';
  public static GWEBGPU_BUFFER = 'gWebGPUBuffer';

  private bufferBindingIndex = -1;

  public generateShaderCode(glslContext: GLSLContext, main: string): string {
    this.bufferBindingIndex = -1;
    return `
${this.generateWorkGroups(glslContext)}
${this.generateDefines(glslContext)}
${this.generateUniforms(glslContext)}
${this.generateBuffers(glslContext)}
${this.generateGlobalVariableDeclarations(glslContext)}

bool gWebGPUDebug = false;
vec4 gWebGPUDebugOutput = vec4(0.0);

${main}
`.replace(/this\./g, ''); // 替换掉所有 'this.' 全局作用域;
  }

  public generateWorkGroups(glslContext: GLSLContext): string {
    return `layout (
  local_size_x = ${glslContext.threadGroupSize[0]},
  local_size_y = ${glslContext.threadGroupSize[1]},
  local_size_z = ${glslContext.threadGroupSize[2]}
) in;
`;
  }

  public generateDebugCode(): string {
    // 在 main 函数末尾添加输出代码
    return `
if (gWebGPUDebug) {
  // gWebGPUBuffer0.u_Data[i] = gWebGPUDebugOutput;
}
`;
  }

  public generateMainPrepend(): string {
    return '';
  }

  public generateDefines(glslContext: GLSLContext): string {
    // 生成编译时 defines
    return glslContext.defines
      .filter((define) => !define.runtime)
      .map((define) => `#define ${define.name} ${define.value}`)
      .join('\n');
  }

  public generateUniforms(glslContext: GLSLContext): string {
    const uniformDeclarations = glslContext.uniforms
      .map((uniform) => {
        if (
          uniform.type !== 'image2D' &&
          uniform.type !== 'sampler2D' // WebGPU Compute Shader 使用 buffer 而非 uniform
        ) {
          return `${uniform.type} ${uniform.name};`;
        }
        return '';
      })
      .join('\n  ')
      .trim();

    return (
      uniformDeclarations &&
      `layout(std140, set = 0, binding = ${++this
        .bufferBindingIndex}) uniform GWebGPUParams {
  ${uniformDeclarations}
} ${WebGPUShaderGenerator.GWEBGPU_UNIFORM_PARAMS};`
    );
  }

  public generateBuffers(glslContext: GLSLContext) {
    let bufferIndex = -1;
    return glslContext.uniforms
      .map((u) => {
        if (u.type === 'sampler2D') {
          bufferIndex++;
          return `layout(std430, set = 0, binding = ${++this
            .bufferBindingIndex}) buffer ${(u.readonly && 'readonly') ||
            ''} ${(u.writeonly && 'writeonly') ||
            ''} GWebGPUBuffer${bufferIndex} {
  ${u.format.replace('[]', '')} ${u.name}[];
} ${WebGPUShaderGenerator.GWEBGPU_BUFFER}${bufferIndex};
`;
        } else if (u.type === 'image2D') {
          return `layout(set = 0, binding = ${++this
            .bufferBindingIndex}) uniform texture2D ${u.name};
layout(set = 0, binding = ${++this.bufferBindingIndex}) uniform sampler ${
            u.name
          }Sampler;
`;
        }
        return '';
      })
      .join('\n');
  }

  public generateGlobalVariableDeclarations(glslContext: GLSLContext) {
    return `
ivec3 globalInvocationID = ivec3(gl_GlobalInvocationID);
ivec3 workGroupSize = ivec3(gl_WorkGroupSize);
ivec3 workGroupID = ivec3(gl_WorkGroupID);
ivec3 localInvocationID = ivec3(gl_LocalInvocationID);
ivec3 numWorkGroups = ivec3(gl_NumWorkGroups);
int localInvocationIndex = int(gl_LocalInvocationIndex);
${glslContext.globalDeclarations
  .map(
    (gd) =>
      `${(gd.shared && 'shared') || ''} ${gd.type.replace('[]', '')} ${
        gd.name
      }[${gd.value}];`,
  )
  .join('\n')}
`;
  }
}
