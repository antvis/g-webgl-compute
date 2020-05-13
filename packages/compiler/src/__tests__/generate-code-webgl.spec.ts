import { Parser } from '..';
import {
  ExportDefaultDeclaration,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  VariableDeclaration,
} from '../ts-estree';

describe('Generate Code', () => {
  const parser = new Parser();

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

  test('should generate uniforms correctly.', () => {
    const result = parser.generateCode(
      parser.parse(`
      const a: float;
      const b: vec4[];
      `)!,
    );

    expect(result).toContain('uniform float a;');
    expect(result).toContain('uniform sampler2D b;');
  });

  test('should generate variable declaration correctly.', () => {
    const result = parser.generateCode(
      parser.parse(`
      function test() {
        const a: vec3 = [1, 1, 1];
        const a = [1, 1, 1];
        var a = true;
        var a = 10;
        const a: vec4;
        const dx = 0.0, dy = 0.0;
        var a = int(10);
      }`)!,
    );
    expect(result).toContain('vec3 a = vec3(1.0,1.0,1.0);');
    expect(result).toContain('bool a = true;');
    expect(result).toContain('float a = 10.0;');
    expect(result).toContain('vec4 a;');
    expect(result).toContain('float dx = 0.0;\nfloat dy = 0.0;');
    expect(result).toContain('int a = int(10);');
  });

  test('should generate function declaration correctly.', () => {
    const result = parser.generateCode(
      parser.parse(`
        function test(a: float, b: vec3): float {
          var a = true;
          a = b * (c + d);
          if (c == 2 && d != 3) { c = d; }
          for (let i =0;i< 10;i++) {
            c = d;
            break;
          }
          a = func(c, d(2)) + 2;
          return c;
        }
      `)!,
    );

    expect(result).toContain(
      'float test(float a,vec3 b) {\nbool a = true;\na = bool((b * bool((c + bool(d)))));\nif ((c == 2) && (d != 3)) {c = d;}\nfor (int i = 0; (i < int(10)); i++) {c = d;\nbreak;}\na = bool((func(c,d(2)) + bool(2)));\nreturn c;}',
    );
  });

  test('should generate void main() correctly.', () => {
    const result = parser.generateCode(
      parser.parse(`
        export function test(a: float, b: vec3): float {
          var a = true;
          a = b * (c + d);
          return c;
        }
      `)!,
    );

    expect(result).toContain(
      'bool a = true;\na = bool((b * bool((c + bool(d)))));\nreturn c;',
    );
  });

  test("should infer variable's type from context correctly.", () => {
    const result = parser.parse(`
    function d(): vec3 {
      let a: float;
      a = 10;
    }`)!;

    expect(parser.generateCode(result)).toContain('float a;\na = float(10.0);');
  });

  test("should infer variable's type from context correctly.", () => {
    const result = parser.parse(`
    function d(): vec3 {
      let a: int = 10;
      if (a > 10) {}
    }
    `)!;

    expect(parser.generateCode(result)).toContain('if ((a > int(10)))');
  });

  test("should infer variable's type from context correctly.", () => {
    const result = parser.parse(`
    function d(): vec3 {
      let a = 10;
      const arr_idx: int = arr_offset + p;
      const buf_offset: int = arr_idx - arr_idx / 4 * 4;
      if (a > 10) {}
    }
    `)!;
    const code = parser.generateCode(result);
    expect(code).toContain('if ((a > float(10.0)))');
    expect(code).toContain(
      'int buf_offset = (arr_idx - int(((arr_idx / int(4)) * int(4))));',
    );
  });

  test("should infer variable's type from context correctly.", () => {
    // 通过内置函数类型推导
    const result = parser.parse(`
    function d(): vec3 {
      const i = int(2);
      let a = 10;
      if (a > 10) {}
    }
    `)!;

    expect(parser.generateCode(result)).toContain('int i = int(2);');
  });

  test("should infer variable's type from righthand context correctly.", () => {
    // 通过右值类型推导
    const result = parser.parse(`
    function d(): vec3 {
      const a = [1, 1, 1];
      const gf = 0.01 * a;
    }
    `)!;

    expect(parser.generateCode(result)).toContain(
      'vec3 gf = (0.01 * vec3(a));',
    );
  });

  test("should infer variable's type from righthand context correctly.", () => {
    // 通过右值类型推导
    const result = parser.parse(`
    const u_K2: float;
    function d(): vec3 {
      const dist = 0.01;
      if (dist > 0.0) {
        const repulsiveF = u_K2 / dist;
      }
    }
    `)!;

    expect(parser.generateCode(result)).toContain(
      'float repulsiveF = (u_K2 / float(dist));',
    );
  });

  test("should infer variable's type from swizzling correctly.", () => {
    // 通过右值类型推导
    const result = parser.parse(`
    function d(): vec3 {
      const dist = [1, 1, 1];
      const repulsiveF = dist.r + 0.2;
    }
    `)!;

    expect(parser.generateCode(result)).toContain(
      'float repulsiveF = (dist.r + float(0.2));',
    );
  });

  test("should infer variable's type from swizzling correctly.", () => {
    // 通过右值类型推导
    const result = parser.parse(`
    function d(): vec3 {
      const dist: ivec3 = [1, 1, 1];
      const repulsiveF = dist.r + 2;
    }
    `)!;

    expect(parser.generateCode(result)).toContain(
      'int repulsiveF = (dist.r + int(2));',
    );
  });

  test("should infer variable's type from swizzling correctly.", () => {
    // 通过右值类型推导
    const result = parser.parse(`
    function d(): vec3 {
      const dist: bvec3 = [true, true, true];
      const repulsiveF = dist.rg;
    }
    `)!;

    expect(parser.generateCode(result)).toContain(
      'bvec2 repulsiveF = dist.rg;',
    );
  });

  test("should infer variable's type from swizzling correctly.", () => {
    // 通过右值类型推导
    const result = parser.parse(`
    function d(): vec3 {
      const dist: bvec3 = [true, true, true];
      const repulsiveF = dist.x;
    }
    `)!;

    expect(parser.generateCode(result)).toContain('bool repulsiveF = dist.x;');
  });

  test("should infer variable's type from swizzling correctly.", () => {
    // 通过右值类型推导
    const result = parser.parse(`
    function d(): vec3 {
      const dist: bvec3 = [true, true, true];
      const repulsiveF = dist[0];
    }
    `)!;

    expect(parser.generateCode(result)).toContain('bool repulsiveF = dist[0];');
  });

  test("should infer variable's type from swizzling correctly.", () => {
    // 通过右值类型推导
    const result = parser.parse(`
    function d(): vec3 {
      const dist = [1, 1, 1];
      const repulsiveF = dist.rgb + 0.2;
    }
    `)!;

    expect(parser.generateCode(result)).toContain(
      'vec3 repulsiveF = (dist.rgb + vec3(0.2));',
    );
  });

  test("should infer variable's type from swizzling correctly.", () => {
    // 通过右值类型推导
    const result = parser.parse(`
    function d(): vec3 {
      const a = 1;
      const b = [1, 2, 3];
      const c = a == 0 ? b.r : 10;
    }
    `)!;

    expect(parser.generateCode(result)).toContain(
      'float c = ((a == float(0.0))) ? (b.r) : (10.0);',
    );
  });

  test("should infer variable's type from component-wise function correctly.", () => {
    // 通过右值类型推导
    const result = parser.parse(`
    function d(): vec3 {
      const a = max([1, 2], [2, 1]);
    }
    `)!;

    expect(parser.generateCode(result)).toContain(
      'vec2 a = max(vec2(1.0,2.0),vec2(2.0,1.0));',
    );
  });

  test("should infer variable's type from component-wise function correctly.", () => {
    // 通过右值类型推导
    const result = parser.parse(`
    function d(): vec3 {
      const node_i = [1, 2, 3];
      const length = int(floor(node_i.a + 0.5));
    }
    `)!;

    expect(parser.generateCode(result)).toContain(
      'int length = int(floor((node_i.a + float(0.5))));',
    );
  });

  test('should generate proper get/setThreadData clause.', () => {
    // 通过右值类型推导
    const result = parser.parse(`
      const vectorA: vec4[];

      export function compute(threadId: int) {

        const a = vectorA[threadId];
        vectorA[threadId] = [1, 2, 3, 4];
      }
    `)!;

    expect(parser.generateCode(result)).toContain(
      'vec4 a = getThreadData(vectorA, threadId);',
    );
    expect(parser.generateCode(result)).toContain(
      'gl_FragColor = vec4(vec4(1.0,2.0,3.0,4.0));',
    );
  });
});
