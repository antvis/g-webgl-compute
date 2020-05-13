import { Parser, Target } from '..';
import {
  ExportDefaultDeclaration,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  VariableDeclaration,
} from '../ts-estree';

describe('Generate Code', () => {
  const parser = new Parser();
  parser.setTarget(Target.WebGPU);

  afterEach(() => {
    parser.clear();
  });

  test('should generate define clause correctly.', () => {
    const result = parser.generateCode(
      parser.parse(`
        const AAA = 100.1;
      `)!,
    );

    expect(result).toContain('#define AAA 100.1');
  });

  test('should generate buffers correctly.', () => {
    const result = parser.generateCode(
      parser.parse(`
      const a: float;
      const b: vec4[];
      const c: vec4[];

      function test() {
        const i: int = 10;
        const t = b[i];
        c[i] = [1,2,3,4];
      }
      `)!,
    );
    // console.log(result);
    expect(result).toContain(
      'layout(std140, set = 0, binding = 1) buffer GWebGPUBuffer0',
    );
    expect(result).toContain(
      'layout(std140, set = 0, binding = 2) buffer GWebGPUBuffer1',
    );
    expect(result).toContain('vec4 t = gWebGPUBuffer0.b[i];');
    expect(result).toContain(
      'gWebGPUBuffer1.c[i] = vec4(vec4(1.0,2.0,3.0,4.0));',
    );
  });

  test('should refer uniforms correctly.', () => {
    const result = parser.generateCode(
      parser.parse(`
      const a: float;
      const b: vec4[];

      function test() {
        const c = a;
      }
      `)!,
    );
    expect(result).toContain('float c = gWebGPUUniformParams.a;');
  });
});
