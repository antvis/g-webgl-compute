import { builtinFunctions, Target } from '../builtin-functions';
import { GLSLContext } from '../index';
import { IShaderGenerator } from './IShaderGenerator';

/**
 * 生成供 WebGL 使用的 GLSL 100
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
export class WHLSLShaderGenerator implements IShaderGenerator {
  public static GWEBGPU_UNIFORM_PARAMS = 'gWebGPUUniformParams';
  public static GWEBGPU_UNIFORM_PARAMS_STRUCT = 'GWebGPUParams';

  public generateShaderCode(glslContext: GLSLContext, main: string): string {
    const [localSizeX, localSizeY, localSizeZ] = glslContext.threadGroupSize;
    return `${this.generateDefines(glslContext)}
${builtinFunctions[Target.WHLSL]}
${this.generateUniformStruct(glslContext)}
${main}
`
      .replace(
        'void main()',
        `
[numthreads(${localSizeX}, ${localSizeY}, ${localSizeZ})]
compute void main(
  ${this.generateBuffers(glslContext)},
  float3 svGlobalInvocationID : SV_DispatchThreadID,
  float3 svWorkGroupID : SV_GroupID,
  float3 svLocalInvocationID : SV_GroupThreadID,
  uint localInvocationIndex : SV_GroupIndex 
)`,
      )
      .replace(/this\./g, '')
      .replace(/vec2/g, 'float2')
      .replace(/vec3/g, 'float3')
      .replace(/vec4/g, 'float4')
      .replace(/ivec2/g, 'int2')
      .replace(/ivec3/g, 'int3')
      .replace(/ivec4/g, 'int4')
      .replace(/bvec2/g, 'bool2')
      .replace(/bvec3/g, 'bool3')
      .replace(/bvec4/g, 'bool4');
  }

  public generateDebugCode(): string {
    // 在 main 函数末尾添加输出代码
    return '';
  }

  public generateMainPrepend(glslContext: GLSLContext): string {
    const [localSizeX, localSizeY, localSizeZ] = glslContext.threadGroupSize;
    const [dispatchX, dispatchY, dispatchZ] = glslContext.dispatch;
    const hasUniforms = glslContext.uniforms.find(
      (uniform) => uniform.type !== 'image2D' && uniform.type !== 'sampler2D',
    );
    const uniformContent =
      (hasUniforms &&
        `${WHLSLShaderGenerator.GWEBGPU_UNIFORM_PARAMS_STRUCT} ${WHLSLShaderGenerator.GWEBGPU_UNIFORM_PARAMS} = ${WHLSLShaderGenerator.GWEBGPU_UNIFORM_PARAMS}Buffer[0];`) ||
      '';
    return `
  int3 globalInvocationID = int3(int(svGlobalInvocationID.x), int(svGlobalInvocationID.y), int(svGlobalInvocationID.z));
  int3 workGroupID = int3(int(svWorkGroupID.x), int(svWorkGroupID.y), int(svWorkGroupID.z));
  int3 localInvocationID = int3(int(svLocalInvocationID.x), int(svLocalInvocationID.y), int(svLocalInvocationID.z));
  int3 workGroupSize = int3(${localSizeX}, ${localSizeY}, ${localSizeZ});
  int3 numWorkGroups = int3(${dispatchX}, ${dispatchY}, ${dispatchZ});
  ${uniformContent}
`;
  }

  public generateDefines(glslContext: GLSLContext): string {
    // 生成编译时 defines
    return glslContext.defines
      .filter((define) => !define.runtime)
      .map((define) => `float ${define.name} = ${define.value};`)
      .join('\n');
  }

  public generateUniformStruct(glslContext: GLSLContext): string {
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
      `struct ${WHLSLShaderGenerator.GWEBGPU_UNIFORM_PARAMS_STRUCT} {
  ${uniformDeclarations}
}`
    );
  }

  public generateBuffers(glslContext: GLSLContext): string {
    let bufferIndex = -1;

    const buffers = glslContext.uniforms.filter((u) => u.type === 'sampler2D');
    const hasUniforms = glslContext.uniforms.find(
      (uniform) => uniform.type !== 'image2D' && uniform.type !== 'sampler2D',
    );

    let bufferContent = '';
    if (hasUniforms) {
      bufferContent += `constant ${
        WHLSLShaderGenerator.GWEBGPU_UNIFORM_PARAMS_STRUCT
      }[] ${
        WHLSLShaderGenerator.GWEBGPU_UNIFORM_PARAMS
      }Buffer : register(b${++bufferIndex}),`;
    }
    bufferContent += buffers
      .map((u) => {
        bufferIndex++;
        return `device ${u.format} ${u.name} : register(u${bufferIndex})`;
      })
      .join(',');
    return bufferContent;
  }
}
