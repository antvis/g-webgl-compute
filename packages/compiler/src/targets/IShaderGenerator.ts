import { GLSLContext } from '../index';

export interface IShaderGenerator {
  generateShaderCode(glslContext: GLSLContext, main: string): string;
  generateDebugCode(): string;
  generateMainPrepend(glslContext: GLSLContext): string;
}
