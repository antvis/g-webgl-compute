import { isBoolean, isFinite, isNull } from 'lodash';
import { AST_NODE_TYPES } from './ast-node-types';
import {
  builtinFunctions,
  componentWiseFunctions,
  exportFunctions,
  swizzling,
  typeCastFunctions,
  typePriority,
} from './builtin-functions';
import { parse } from './g';
import {
  BlockStatement,
  ExportDefaultDeclaration,
  Expression,
  ForStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  ImportDeclaration,
  Literal,
  Node,
  ReturnStatement,
  VariableDeclaration,
} from './ts-estree';

export interface Program {
  type: 'Program';
  body: Node[];
}

export interface ProgramParams {
  threadNum: number;
  maxIteration: number;
  bindings: Array<{
    name: string;
    data: number | number[];
  }>;
}

type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Uint8ClampedArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

export interface GLSLContext {
  threadNum: number;
  maxIteration: number;
  output?: {
    length: number;
    typedArrayConstructor: TypedArrayConstructor;
    gpuBuffer?: GPUBuffer;
  };
  defines: Array<{
    name: string;
    value: number;
    runtime: boolean;
  }>;
  uniforms: Array<{
    name: string;
    type: string;
    data?:
      | number
      | number[]
      | Float32Array
      | Uint8Array
      | Uint16Array
      | Uint32Array
      | Int8Array
      | Int16Array
      | Int32Array;
  }>;
}

enum ContextVariableType {
  Function,
  Variable,
}

interface Variable {
  name: string;
  alias: string[];
  typeAnnotation: string;
  type?: ContextVariableType;
}

interface Context {
  parent: Context | null;
  variables: Variable[];
  children: Context[];
}

export enum Target {
  WebGPU = 'WebGPU',
  WebGL = 'WebGL',
}

const GWEBGPU_THREAD_ID = 'gWebGPUThreadId';
const GWEBGPU_UNIFORM_PARAMS = 'gWebGPUUniformParams';
const GWEBGPU_BUFFER = 'gWebGPUBuffer';

export class Parser {
  /**
   * 根据目标平台生成 Shader 代码
   * * WebGL GLSL 1.0
   * * WebGPU Chrome/Edge GLSL 4.5，Safari WSL 暂不考虑
   */
  private target: Target = Target.WebGL;

  private glslContext: GLSLContext = {
    threadNum: 0,
    maxIteration: 1,
    defines: [],
    uniforms: [],
  };

  public setTarget(target: Target) {
    this.target = target;
  }

  public getGLSLContext() {
    return this.glslContext;
  }

  /**
   * 生成 AST
   */
  public parse(source: string): Program | undefined {
    try {
      return parse(source);
    } catch (e) {
      // tslint:disable-next-line:no-console
      // console.error(e);
      return;
    }
  }

  public generateCode(
    program: Program,
    params: Partial<ProgramParams> = {},
  ): string {
    let main = '';
    let customFunctionDeclarations = '';
    let builtinFunctionDeclarations = '';
    const rootContext: Context = {
      parent: null,
      variables: [],
      children: [],
    };

    program.body.forEach((node) => {
      if (node.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
        const childContext: Context = {
          parent: rootContext,
          variables: [],
          children: [],
        };
        rootContext.children.push(childContext);
        main = this.compileExportDeclaration(node, childContext);
      } else if (node.type === AST_NODE_TYPES.ImportDeclaration) {
        builtinFunctionDeclarations = this.compileImportDeclaration(
          node,
          rootContext,
        );
      } else if (node.type === AST_NODE_TYPES.VariableDeclaration) {
        this.compileVariableDeclaration(node, rootContext);
      } else if (node.type === AST_NODE_TYPES.FunctionDeclaration) {
        const childContext = {
          parent: rootContext,
          variables: [],
          children: [],
        };
        rootContext.children.push(childContext);
        customFunctionDeclarations +=
          this.compileFunctionDeclaration(node, childContext) + '\n';
      }
    });

    // 推断线程数
    let threadNum = params.threadNum || 0;
    if (!threadNum && params.bindings && params.bindings.length) {
      const firstInputDataTexture = this.glslContext.uniforms.find(
        (u) => u.type === 'sampler2D',
      );
      if (firstInputDataTexture) {
        const inputBinding = params.bindings.find(
          (binding) => binding.name === firstInputDataTexture.name,
        );
        if (inputBinding && inputBinding.data) {
          // @ts-ignore
          threadNum = Math.ceil(inputBinding.data.length / 4);
        }
      }
    }
    this.glslContext.maxIteration = params.maxIteration || 1;
    this.glslContext.threadNum = threadNum;
    this.glslContext.defines.push({
      name: 'THREAD_NUM',
      value: threadNum,
      runtime: true,
    });
    // 生成运行时 define
    params.bindings?.forEach(({ name, data }) => {
      if (name === name.toUpperCase() && isFinite(Number(data))) {
        this.glslContext.defines.push({
          name,
          value: data as number,
          runtime: true,
        });
      }
    });

    // 生成 uniform 声明
    const uniformDeclarations = this.glslContext.uniforms
      .map((uniform) => {
        uniform.data = params.bindings?.find(
          (b) => b.name === uniform.name,
        )?.data;
        if (this.target === Target.WebGL) {
          return `uniform ${uniform.type} ${uniform.name};`;
        } else if (
          this.target === Target.WebGPU &&
          uniform.type !== 'sampler2D' // WebGPU Compute Shader 使用 buffer 而非 uniform
        ) {
          return `${uniform.type} ${uniform.name};`;
        }
        return '';
      })
      .join('\n')
      .trim();
    const bufferBindingIndex = uniformDeclarations ? 1 : 0;

    const defines = this.glslContext.defines
      .filter((define) => !define.runtime)
      .map((define) => `#define ${define.name} ${define.value}`)
      .join('\n');
    if (this.target === Target.WebGL) {
      return `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif
      ${defines}
      ${uniformDeclarations}
      uniform float u_TexSize;
      varying vec2 v_TexCoord;
      ${builtinFunctions[Target.WebGL]}
      ${builtinFunctionDeclarations}
      ${customFunctionDeclarations}
      ${main}
      `;
    } else if (this.target === Target.WebGPU) {
      return `
      ${defines}
      ${uniformDeclarations &&
        `
        layout(std140, set = 0, binding = 0) uniform GWebGPUParams {
          ${uniformDeclarations}
        } ${GWEBGPU_UNIFORM_PARAMS};
      `}
      ${this.glslContext.uniforms
        .filter((u) => u.type === 'sampler2D')
        .map(
          (u, i) => `
        layout(std140, set = 0, binding = ${i +
          bufferBindingIndex}) buffer GWebGPUBuffer${i} {
          vec4 ${u.name}[];
        } ${GWEBGPU_BUFFER}${i};`,
        )
        .join('\n')}
      ${builtinFunctions[Target.WebGPU]}
      ${builtinFunctionDeclarations}
      ${customFunctionDeclarations}
      ${main}
      `;
    }
    return '';
  }

  public clear() {
    this.glslContext = {
      threadNum: 0,
      maxIteration: 1,
      defines: [],
      uniforms: [],
    };
  }

  public compileImportDeclaration(
    node: ImportDeclaration,
    context: Context,
  ): string {
    // import { f1, f2 } from 'g-webgpu';
    return node.specifiers
      .map((f) => {
        if (f.type === AST_NODE_TYPES.ImportSpecifier) {
          // @ts-ignore
          const result = exportFunctions[this.target][f.local.name];

          if (result) {
            const { content, returnType } = result;
            context.variables.push({
              name: f.local.name,
              alias: [],
              type: ContextVariableType.Function,
              typeAnnotation: returnType,
            });
            return content;
          }
        }
      })
      .join('\n');
  }

  /**
   * 转译成 void main()
   */
  public compileExportDeclaration(
    node: ExportDefaultDeclaration,
    context: Context,
  ): string {
    if (node.declaration.type === AST_NODE_TYPES.FunctionDeclaration) {
      // 修改返回值类型
      // @ts-ignore
      node.declaration.returnType = 'void';

      // 修改方法名
      if (!node.declaration.id) {
        // @ts-ignore
        node.declaration.id = {
          type: AST_NODE_TYPES.Identifier,
        };
      }
      node.declaration!.id!.name = 'main';

      // 添加 threadId 参数的获取方法
      let append;
      const threadId = node.declaration.params[0];
      const threadIdName =
        (threadId &&
          threadId.type === AST_NODE_TYPES.Identifier &&
          threadId.name) ||
        GWEBGPU_THREAD_ID;
      if (this.target === Target.WebGL) {
        append = `
          int ${threadIdName} = int(floor(v_TexCoord.s * u_TexSize + 0.5));
        `;
      } else if (this.target === Target.WebGPU) {
        append = `
          int ${threadIdName} = int(gl_GlobalInvocationID.x);
        `;
      }

      // main 函数不能包含参数
      node.declaration.params = [];
      return this.compileFunctionDeclaration(node.declaration, context, append);
    }
    return '';
  }

  public compileFunctionDeclaration(
    node: FunctionDeclaration,
    context: Context,
    append?: string,
  ): string {
    // TODO: 暂不考虑参数 spread、解构等写法
    /**
     * function test(a: float): float { const a = true; }
     * // ->
     * float test(float a) {bool a = true;}
     */
    // 函数声明也加入父级上下文中
    context.parent?.variables.push({
      name: `${node.id?.name}`,
      alias: [],
      type: ContextVariableType.Function,
      typeAnnotation: `${node.returnType}`,
    });
    return `${node.returnType} ${node.id?.name}(${(node.params || [])
      .map(
        (p) =>
          p.type === AST_NODE_TYPES.Identifier &&
          `${p.typeAnnotation} ${p.name}`,
      )
      .join(',')}) {${append || ''}\n${this.compileBlockStatement(
      node.body,
      context,
    )}}`;
  }

  public compileBlockStatement(node: BlockStatement, context: Context): string {
    return node.body
      .map((s) => {
        if (s.type === AST_NODE_TYPES.VariableDeclaration) {
          return this.compileVariableDeclaration(s, context);
        } else if (s.type === AST_NODE_TYPES.ExpressionStatement) {
          return this.compileExpression(s.expression, context, '', false) + ';';
        } else if (s.type === AST_NODE_TYPES.ReturnStatement) {
          return this.compileReturnStatement(s, context);
        } else if (s.type === AST_NODE_TYPES.IfStatement) {
          return this.compileIfStatement(s, context);
        } else if (s.type === AST_NODE_TYPES.ForStatement) {
          return this.compileForStatement(s, context);
        } else if (s.type === AST_NODE_TYPES.BreakStatement) {
          return 'break;';
        } else if (s.type === AST_NODE_TYPES.ContinueStatement) {
          return 'continue;';
        }
        return '';
      })
      .join('\n');
  }

  public compileExpression(
    node: Expression,
    context: Context,
    inferredType: string,
    isLeft: boolean,
  ): string {
    if (
      node.type === AST_NODE_TYPES.AssignmentExpression ||
      node.type === AST_NODE_TYPES.LogicalExpression ||
      node.type === AST_NODE_TYPES.BinaryExpression
    ) {
      const type =
        inferredType || this.inferTypeByExpression(node.left, context);
      let right = this.compileExpression(node.right, context, type, false);
      if (type) {
        // 这里需要考虑 if (a > 1) 这种情况，如果 a 的类型是 float，需要转译成 if (a > float(1))
        if (typeCastFunctions.indexOf(type) > -1) {
          right = `${type}(${right})`;
        }
      }
      const isBinary = node.type === AST_NODE_TYPES.BinaryExpression;
      return `${isBinary ? '(' : ''}${this.compileExpression(
        node.left,
        context,
        type,
        true,
      )} ${node.operator} ${right}${isBinary ? ')' : ''}`;
    } else if (node.type === AST_NODE_TYPES.UpdateExpression) {
      // i++ ++i
      return node.prefix
        ? `${node.operator}${(node.argument as Identifier).name}`
        : `${(node.argument as Identifier).name}${node.operator}`;
    } else if (node.type === AST_NODE_TYPES.SequenceExpression) {
      // i =0, j =0
      return node.expressions
        .map((e) => this.compileExpression(e, context, inferredType, isLeft))
        .join('');
    } else if (node.type === AST_NODE_TYPES.CallExpression) {
      // function(a, b)
      // TODO: 替换 Math.sin() -> sin()
      return `${(node.callee as Identifier).name}(${node.arguments
        .map((e) => {
          if (e.type === AST_NODE_TYPES.CallExpression) {
            // int(floor(v.x + 0.5))
            // 考虑函数嵌套的情况，需要丢弃掉外层推断的类型
            return this.compileExpression(e, context, '', false);
          }
          return this.compileExpression(e, context, inferredType, false);
        })
        .join(',')})`;
    } else if (node.type === AST_NODE_TYPES.MemberExpression) {
      // vectorA[threadId]
      if (node.object.type === AST_NODE_TYPES.Identifier) {
        const alias = this.findAliasVariableName(node.object.name, context);
        if (alias && this.isDataTexture(alias)) {
          if (this.target === Target.WebGL) {
            // 如果是赋值语句
            if (isLeft) {
              return 'gl_FragColor';
            } else {
              // 需要获取通过下标获取 buffer 数据
              return `getThreadData(${alias}, ${this.compileExpression(
                node.property,
                context,
                '',
                isLeft,
              )})`;
            }
          } else if (this.target === Target.WebGPU) {
            // 引用 buffer 同理
            const bufferIndex = this.glslContext.uniforms
              .filter((u) => u.type === 'sampler2D')
              .findIndex((u) => u.name === alias);
            if (bufferIndex > -1) {
              return `${GWEBGPU_BUFFER}${bufferIndex}.${alias}[${this.compileExpression(
                node.property,
                context,
                inferredType,
                isLeft,
              )}]`;
            }
          }
        }
      }
      if (node.property.type === AST_NODE_TYPES.Identifier) {
        // swizzling & struct uniform eg. params.u_k / vec.rgba
        return `${(node.object as Identifier).name}.${
          (node.property as Identifier).name
        }`;
      } else if (
        node.property.type === AST_NODE_TYPES.Literal &&
        isFinite(Number(node.property.value))
      ) {
        // vec[0]
        return `${(node.object as Identifier).name}[${node.property.value}]`;
      }
    } else if (node.type === AST_NODE_TYPES.ConditionalExpression) {
      // 条件判断也应该丢弃掉之前推断的类型
      return `(${this.compileExpression(
        node.test,
        context,
        '',
        false,
      )}) ? (${this.compileExpression(
        node.consequent,
        context,
        inferredType,
        false,
      )}) : (${this.compileExpression(
        node.alternate,
        context,
        inferredType,
        false,
      )})`;
    } else if (node.type === AST_NODE_TYPES.ArrayExpression) {
      const type = inferredType || this.inferTypeByExpression(node, context);
      if (type) {
        const elementType = type[0] === 'v' ? 'float' : 'number';
        // vec3(1.0, 2.0, 3.0)
        return `${type}(${node.elements
          .map((e) => {
            return this.compileExpression(e, context, elementType, isLeft);
          })
          .join(',')})`;
      }
    } else if (node.type === AST_NODE_TYPES.Identifier) {
      if (this.target === Target.WebGPU) {
        // WebGPU 中我们将所有 uniform 整合成了一个，因此需要修改用户的引用方式
        const uniform = this.glslContext.uniforms
          .filter((u) => u.type !== 'sampler2D')
          .find((u) => u.name === node.name);
        if (uniform) {
          return `${GWEBGPU_UNIFORM_PARAMS}.${node.name}`;
        }

        // 引用 buffer 同理
        const bufferIndex = this.glslContext.uniforms
          .filter((u) => u.type === 'sampler2D')
          .findIndex((u) => u.name === node.name);
        if (bufferIndex > -1) {
          return `${GWEBGPU_BUFFER}${bufferIndex}.${node.name}`;
        }
      }
      return node.name;
    } else if (node.type === AST_NODE_TYPES.Literal) {
      if (inferredType === 'float') {
        return this.wrapFloat(`${node.value}`);
      }
      return `${node.value}`;
    }
    return '';
  }

  public compileVariableDeclaration(
    node: VariableDeclaration,
    context: Context,
  ): string {
    return node.declarations
      .map((declarator) => {
        const identifier = declarator.id as Identifier;
        if (
          context.parent === null &&
          node.kind === 'const' &&
          identifier.name === identifier.name.toUpperCase()
        ) {
          let definedValue: number;
          if (
            declarator?.init?.type === AST_NODE_TYPES.Literal &&
            declarator.init.value !== null &&
            isFinite(Number(declarator.init.value))
          ) {
            definedValue = declarator.init.value as number;
            /**
             * 全大写常量转译成 GLSL 常量
             * const AAA = 100;
             * ->
             * #define AAA 100
             */
            this.glslContext.defines.push({
              name: identifier.name,
              value: definedValue,
              runtime: false,
            });
          }

          return '';
        } else if (
          context.parent === null &&
          declarator.init === null &&
          node.kind === 'const' &&
          identifier.name !== identifier.name.toUpperCase()
        ) {
          /**
           * 非全大写转译成 uniform
           * const a: float;
           * const a: vec3;
           * const a: vec4[];
           * ->
           * uniform float a;
           * uniform vec3 a;
           * uniform sampler2D a;
           */
          // 保存声明的变量类型到上下文中
          let type = identifier.typeAnnotation || 'float';
          if ((type as string).endsWith('[]')) {
            type = 'sampler2D';
          }
          context.variables.push({
            name: identifier.name,
            alias: [],
            typeAnnotation: type as string,
          });
          this.glslContext.uniforms.push({
            name: identifier.name,
            type: type as string,
          });
          // 最后统一输出
          return '';
        } else {
          /**
           * 变量声明
           * const a: vec3 = [1, 1, 1];
           * let a: vec3 = [1, 1, 1];
           * var a: vec3 = [1, 1, 1];
           * var a = [1, 1];
           * var a = true;
           * var a = 10;
           * var a = int(222);
           * var a;
           * ->
           * vec3 a = vec3(1.0, 1.0, 1.0);
           * vec2 a = vec2(1.0, 1.0);
           * bool a = true;
           * float a = 10.0;
           * int a = int(222);
           * float a;
           */
          const type =
            identifier.typeAnnotation ||
            // 根据值自动推导类型
            this.inferTypeByExpression(declarator.init, context);
          if (type) {
            let value = '';
            if (declarator.init) {
              value = this.compileExpression(
                declarator.init,
                context,
                type as string,
                false,
              );
            }

            // 处理别名的情况，例如 const a = b; 此时 a 作为 b 的别名，当然 b 也有可能是别的变量的别名
            if (
              declarator.init &&
              declarator.init.type === AST_NODE_TYPES.Identifier
            ) {
              const aliasVariableName = this.findAliasVariableName(
                declarator.init.name,
                context,
              );
              const aliasVariable = context.variables.find(
                (v) => v.name === aliasVariableName,
              );
              if (aliasVariable) {
                aliasVariable.alias.push(identifier.name);
              }
            }
            // 保存声明的变量类型到上下文中
            context.variables.push({
              name: identifier.name,
              alias: [],
              typeAnnotation: type as string,
            });
            return value !== ''
              ? `${type} ${identifier.name} = ${value};`
              : `${type} ${identifier.name};`;
          }
        }
        return '';
      })
      .join('\n');
  }

  public compileIfStatement(node: IfStatement, context: Context): string {
    let consequent = '';
    if (node.consequent.type === AST_NODE_TYPES.ExpressionStatement) {
      consequent = this.compileExpression(
        node.consequent.expression,
        context,
        '',
        false,
      );
    } else if (node.consequent.type === AST_NODE_TYPES.BlockStatement) {
      consequent = this.compileBlockStatement(node.consequent, context);
    } else if (node.consequent.type === AST_NODE_TYPES.ReturnStatement) {
      consequent = this.compileReturnStatement(node.consequent, context);
    } else if (node.consequent.type === AST_NODE_TYPES.BreakStatement) {
      consequent = 'break;';
    }

    return `if (${this.compileExpression(
      node.test,
      context,
      '',
      false,
    )}) {${consequent}}`;
  }

  public compileReturnStatement(
    node: ReturnStatement,
    context: Context,
  ): string {
    return `return ${(node.argument &&
      this.compileExpression(node.argument, context, '', false)) ||
      ''};`;
  }

  public compileForStatement(node: ForStatement, context: Context): string {
    let init = '';
    if (node.init?.type === AST_NODE_TYPES.VariableDeclaration) {
      // 修改 init 类型例如 int i = 0;
      node.init.declarations.forEach((d) => {
        // @ts-ignore
        d.id.typeAnnotation = 'int';
      });
      init = this.compileVariableDeclaration(node.init, context);
    } else if (node.init?.type === AST_NODE_TYPES.AssignmentExpression) {
      init = this.compileExpression(node.init, context, '', false);
    }
    return `for (${init} ${node.test &&
      this.compileExpression(node.test, context, '', false)}; ${node.update &&
      this.compileExpression(
        node.update,
        context,
        '',
        false,
      )}) {${this.compileBlockStatement(
      node.body as BlockStatement,
      context,
    )}}`;
  }

  private inferTypeByExpression(
    expression: Expression | null,
    context: Context | null = null,
  ): string {
    if (expression?.type === AST_NODE_TYPES.Literal) {
      if (isFinite(expression.value)) {
        // var a = 10.2; -> float a = 10.2;
        return 'float';
      } else if (isBoolean(expression.value)) {
        // var a = true; -> bool a = true;
        return 'bool';
      }
    } else if (expression?.type === AST_NODE_TYPES.ArrayExpression) {
      if (expression.elements.length <= 4) {
        if (
          expression.elements.every(
            (e) => e.type === AST_NODE_TYPES.Literal && isBoolean(e.value),
          )
        ) {
          return `bvec${expression.elements.length}`;
        } else {
          return `vec${expression.elements.length}`;
        }
      } else if (expression.elements.length === 9) {
        return 'mat3';
      } else if (expression.elements.length === 16) {
        return 'mat4';
      }
    } else if (expression?.type === AST_NODE_TYPES.Identifier) {
      // 从上下文中尝试获取变量类型
      let parent = context;
      let type = '';
      while (parent !== null) {
        const variable = parent.variables.find(
          (v) =>
            v.type !== ContextVariableType.Function &&
            v.name === expression.name,
        );
        if (variable) {
          type = variable.typeAnnotation;
          break;
        }
        parent = parent.parent;
      }
      return type;
    } else if (expression?.type === AST_NODE_TYPES.CallExpression) {
      // 获取用户自定义或者 import 的函数的返回值
      let parent = context;
      let type = '';
      while (parent !== null) {
        const variable = parent.variables.find(
          (v) =>
            v.type === ContextVariableType.Function &&
            expression.callee.type === AST_NODE_TYPES.Identifier &&
            v.name === expression.callee.name,
        );
        if (variable) {
          type = variable.typeAnnotation;
          break;
        }
        parent = parent.parent;
      }

      if (!type) {
        if (expression.callee.type === AST_NODE_TYPES.Identifier) {
          if (typeCastFunctions.indexOf(expression.callee.name) > -1) {
            // const a = int(2);
            // let b = vec2(1, 1);
            return expression.callee.name;
          } else if (
            componentWiseFunctions.indexOf(expression.callee.name) > -1
          ) {
            // const a = max(1, 2);
            // -> float a = max(1.0, 2.0);
            // const a = max([1, 2], [2, 1]);
            // -> vec2 a = max(vec2(1,2), vec2(2,1));
            if (expression.arguments.length) {
              // 使用第一个参数推断类型
              return this.inferTypeByExpression(
                expression.arguments[0],
                context,
              );
            }
          }
        }
      }
      return type;
    } else if (expression?.type === AST_NODE_TYPES.BinaryExpression) {
      // let gf = 0.01 * u_K * u_Gravity * d;
      // 注意 1.2 * vec3(1.0) 生成的类型为 vec3
      return this.compareTypePriority(
        this.inferTypeByExpression(expression.left, context),
        this.inferTypeByExpression(expression.right, context),
        expression.operator,
      );
    } else if (expression?.type === AST_NODE_TYPES.MemberExpression) {
      if (expression.object.type === AST_NODE_TYPES.Identifier) {
        const alias = this.findAliasVariableName(
          expression.object.name,
          context,
        );
        if (alias && this.isDataTexture(alias)) {
          return 'vec4';
        }
      }
      // 首先获取 vec 的类型
      const objectType = this.inferTypeByExpression(expression.object, context);
      // vec.rgba/xyzw/stpq
      // @see https://www.khronos.org/opengl/wiki/Data_Type_(GLSL)#Swizzling
      if (expression.property.type === AST_NODE_TYPES.Identifier) {
        if (
          expression.property.name.length <= 4 &&
          expression.property.name
            .split('')
            .every((p) => swizzling.indexOf(p) > -1)
        ) {
          if (objectType.startsWith('vec')) {
            return expression.property.name.length === 1
              ? 'float'
              : `vec${expression.property.name.length}`;
          } else if (objectType.startsWith('ivec')) {
            return expression.property.name.length === 1
              ? 'int'
              : `ivec${expression.property.name.length}`;
          } else if (objectType.startsWith('bvec')) {
            return expression.property.name.length === 1
              ? 'bool'
              : `bvec${expression.property.name.length}`;
            // 暂不支持 uint WebGL 1 使用 GLSL 100
            // } else if (objectType.startsWith('uvec')) {
            //   return expression.property.name.length === 1
            //     ? 'uint'
            //     : `uvec${expression.property.name.length}`;
          }
        }
      }
      // vec[0]
      else if (
        expression.property.type === AST_NODE_TYPES.Literal &&
        isFinite(Number(expression.property.value))
      ) {
        if (objectType.startsWith('vec')) {
          return 'float';
        } else if (objectType.startsWith('ivec')) {
          return 'int';
        } else if (objectType.startsWith('bvec')) {
          return 'bool';
        } else if (objectType.startsWith('uvec')) {
          return 'uint';
        }
      }
    } else if (expression?.type === AST_NODE_TYPES.ConditionalExpression) {
      // 条件表达式推断 consequent 或者 alternate 都行
      return this.inferTypeByExpression(expression.consequent, context);
    }
    return '';
  }

  private compareTypePriority(
    type1: string,
    type2: string,
    operator: string,
  ): string {
    if (
      operator === '+' ||
      operator === '-' ||
      operator === '*' ||
      operator === '/'
    ) {
      // @ts-ignore
      if (typePriority[type1] && typePriority[type2]) {
        // @ts-ignore
        const maxPriority = Math.max(typePriority[type1], typePriority[type2]);
        // @ts-ignore
        if (typePriority[type1] === maxPriority) {
          return type1;
        } else {
          return type2;
        }
      } else if (!type1) {
        return type2;
      } else if (!type2) {
        return type1;
      }
    }
    return '';
  }

  private wrapFloat(float: string): string {
    return float.indexOf('.') === -1 ? `${float}.0` : float;
  }

  private findAliasVariableName(
    variableName: string | undefined,
    context: Context | null,
  ): string | undefined {
    if (variableName === undefined || context === null) {
      return undefined;
    }
    for (const v of context.variables) {
      if (v.alias.indexOf(variableName) > -1) {
        return this.findAliasVariableName(v.name, context) || variableName;
      }
    }
    return variableName;
  }

  private isDataTexture(name: string) {
    return !!this.glslContext.uniforms.find(
      (u) => u.type === 'sampler2D' && name === u.name,
    );
  }
}
