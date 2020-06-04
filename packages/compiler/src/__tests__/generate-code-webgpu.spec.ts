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
class Add2Vectors {
  @in
  a: float;

  @in
  d: bool;

  @in
  b: vec4[];

  @in @out
  c: vec4[];

  @main
  test() {
    const i: int = 10;
    const t = this.b[i];
    this.c[i] = [1,2,3,4];
  }
}`)!,
    );
    expect(result)
      .toContain(`layout(std140, set = 0, binding = 0) uniform GWebGPUParams {
  float a;
  bool d;
} gWebGPUUniformParams;`);
    expect(result)
      .toContain(`layout(std430, set = 0, binding = 1) buffer readonly  GWebGPUBuffer0 {
  vec4 b[];
} gWebGPUBuffer0;`);
    expect(result)
      .toContain(`layout(std430, set = 0, binding = 2) buffer   GWebGPUBuffer1 {
  vec4 c[];
} gWebGPUBuffer1;`);
    expect(result).toContain('vec4 t = gWebGPUBuffer0.b[i];');
    expect(result).toContain(
      'gWebGPUBuffer1.c[i] = vec4(vec4(1.0,2.0,3.0,4.0));',
    );
  });
});
