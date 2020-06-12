// tslint:disable-next-line:no-reference
/// <reference path="../../../node_modules/@webgpu/types/dist/index.d.ts" />
import isBoolean from 'lodash/isBoolean';
import isFinite from 'lodash/isFinite';
import { AST_NODE_TYPES } from './ast-node-types';
import {
  componentWiseFunctions,
  exportFunctions,
  swizzling,
  typeCastFunctions,
  typePriority,
} from './builtin-functions';
import { parse } from './g';
import { IShaderGenerator } from './targets/IShaderGenerator';
import { WebGLShaderGenerator } from './targets/webgl';
import { WebGPUShaderGenerator } from './targets/webgpu';
import {
  BlockStatement,
  ClassDeclaration,
  ClassProperty,
  Decorator,
  ExportDefaultDeclaration,
  Expression,
  ForStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  IfStatement,
  ImportDeclaration,
  Literal,
  MethodDefinition,
  Node,
  ReturnStatement,
  VariableDeclaration,
} from './ts-estree';

enum PropertyDecorator {
  In = 'in',
  Out = 'out',
  Shared = 'shared',
}

export interface Program {
  type: 'Program';
  body: Node[];
}

export interface ProgramParams {
  dispatch: [number, number, number];
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
  /**
   * 程序名
   */
  name: string;
  /**
   * size of thread grid
   * 即 WebGL 2 Compute 中的 dispatchCompute
   * 或者 WebGPU 中的 dispatch
   */
  dispatch: [number, number, number];
  /**
   * size of each thread group
   * Compute Shader 中的 local_size_x/y/z
   */
  threadGroupSize: [number, number, number];
  /**
   * 迭代次数，例如布局运算中需要迭代很多次才能到达稳定
   */
  maxIteration: number;
  /**
   * 目前仅支持单一输出，受限于 WebGL 实现
   */
  output: {
    name: string;
    size?: [number, number];
    length?: number;
    typedArrayConstructor?: TypedArrayConstructor;
    gpuBuffer?: GPUBuffer;
    outputElementsPerTexel?: number;
  };
  /**
   * 常量，可分成编译时和运行时两类：
   * 1. 编译时即可确定值
   * 2. 运行时：例如循环长度需要为常量，但在编译时又无法确定
   * TODO 支持定义函数，例如 tensorflow 中的 DIV_CEIL
   */
  defines: Array<{
    name: string;
    value: number;
    runtime: boolean; // 是否是运行时生成
  }>;
  globalDeclarations: Array<{
    name: string;
    type: string;
    value: string;
    shared: boolean;
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
    size?: [number, number];
    format: string;
    readonly: boolean;
    writeonly: boolean;
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

interface IDecorator {
  name: string;
  params: number[];
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

export class Parser {
  /**
   * 根据目标平台生成 Shader 代码
   * * WebGL GLSL 1.0
   * * WebGPU Chrome/Edge GLSL 4.5，Safari WSL 暂不考虑
   */
  private target: Target = Target.WebGL;

  private glslContext: GLSLContext = {
    name: '',
    dispatch: [1, 1, 1],
    threadGroupSize: [1, 1, 1],
    maxIteration: 1,
    defines: [],
    uniforms: [],
    globalDeclarations: [],
    output: {
      name: '',
    },
  };

  private generators: Record<Target, IShaderGenerator> = {
    [Target.WebGPU]: new WebGPUShaderGenerator(),
    [Target.WebGL]: new WebGLShaderGenerator(),
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
      console.error('[Parse error]:', e);

      throw e;
    }
  }

  public generateCode(
    program: Program,
    params: Partial<ProgramParams> = {},
  ): string {
    this.glslContext.maxIteration = params.maxIteration || 1;
    this.glslContext.dispatch = params.dispatch || [1, 1, 1];

    let main = '';
    let builtinFunctionDeclarations = '';
    const rootContext: Context = {
      parent: null,
      variables: [],
      children: [],
    };

    program.body.forEach((node) => {
      if (node.type === AST_NODE_TYPES.ClassDeclaration) {
        const childContext: Context = {
          parent: rootContext,
          variables: [
            {
              name: 'globalInvocationID',
              alias: [],
              typeAnnotation: 'ivec3',
            },
            {
              name: 'workGroupSize',
              alias: [],
              typeAnnotation: 'ivec3',
            },
            {
              name: 'workGroupID',
              alias: [],
              typeAnnotation: 'ivec3',
            },
            {
              name: 'localInvocationID',
              alias: [],
              typeAnnotation: 'ivec3',
            },
            {
              name: 'localInvocationIndex',
              alias: [],
              typeAnnotation: 'int',
            },
            {
              name: 'numWorkGroups',
              alias: [],
              typeAnnotation: 'ivec3',
            },
            {
              name: 'imageLoad',
              alias: [],
              type: ContextVariableType.Function,
              typeAnnotation: 'vec4',
            },
          ],
          children: [],
        };
        rootContext.children.push(childContext);
        main += this.compileClassDeclaration(node, childContext);
      } else if (node.type === AST_NODE_TYPES.ImportDeclaration) {
        builtinFunctionDeclarations = this.compileImportDeclaration(
          node,
          rootContext,
        );
      } else if (node.type === AST_NODE_TYPES.VariableDeclaration) {
        this.compileVariableDeclaration(node, rootContext);
      } else if (node.type === AST_NODE_TYPES.FunctionDeclaration) {
        main += this.compileFunctionExpression(node, rootContext);
      }
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

    // 拷贝数据
    this.glslContext.uniforms.forEach((uniform) => {
      uniform.data = params.bindings?.find(
        (b) => b.name === uniform.name,
      )?.data;

      if (!uniform.data) {
        if (uniform.type === 'sampler2D') {
          let sizePerElement = 1;
          if (uniform.format.endsWith('ec4[]')) {
            sizePerElement = 4;
          } else if (uniform.format.endsWith('ec3[]')) {
            sizePerElement = 3;
          } else if (uniform.format.endsWith('ec2[]')) {
            sizePerElement = 2;
          }
          uniform.data = new Float32Array(
            this.glslContext.output.length! * sizePerElement,
          ).fill(0);
        } else if (uniform.type === 'image2D') {
          // @ts-ignore
          buffer.data = new Uint8ClampedArray(context.output.length!).fill(0);
        }
      }
    });

    return this.generators[this.target].generateShaderCode(
      this.glslContext,
      builtinFunctionDeclarations + main,
    );
  }

  public clear() {
    this.glslContext = {
      name: '',
      dispatch: [1, 1, 1],
      threadGroupSize: [1, 1, 1],
      maxIteration: 1,
      defines: [],
      uniforms: [],
      globalDeclarations: [],
      output: {
        name: '',
      },
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
  public compileClassDeclaration(
    node: ClassDeclaration,
    context: Context,
  ): string {
    this.glslContext.name = node?.id?.name || '';

    node.decorators?.forEach((decorator) => {
      if (
        decorator.expression.type === AST_NODE_TYPES.CallExpression &&
        decorator.expression.callee.type === AST_NODE_TYPES.Identifier &&
        decorator.expression.callee.name === 'numthreads'
      ) {
        // numthreads(8, 1, 1)
        this.glslContext.threadGroupSize = decorator.expression.arguments
          .slice(0, 3)
          .map(
            (a) => (a.type === AST_NODE_TYPES.Literal && Number(a.value)) || 1,
          ) as [number, number, number];
      }
    });

    if (node.body.type === AST_NODE_TYPES.ClassBody) {
      /**
       * uniforms
       * eg. prop1: vec3[]
       */
      const classProperties = node.body.body.filter(
        (e) => e.type === AST_NODE_TYPES.ClassProperty,
      ) as ClassProperty[];

      classProperties.forEach((property) => {
        if (property.key.type === AST_NODE_TYPES.Identifier) {
          const format =
            ((property.key.typeAnnotation as unknown) as string) || 'float';
          let type = format;
          if ((type as string).endsWith('[]')) {
            type = 'sampler2D';
          }

          context.variables.push({
            name: property.key.name,
            alias: [],
            typeAnnotation: type as string,
          });

          if (property.decorators) {
            this.analyzeDecorators(
              (property.key as Identifier).name,
              type,
              format,
              property.decorators,
            );
          }
        }
      });

      const methodDefinitions = node.body.body.filter(
        (e) => e.type === AST_NODE_TYPES.MethodDefinition,
      ) as MethodDefinition[];

      return methodDefinitions
        .map((method) => {
          let prepend = '';
          let append = '';
          if (method.value.type === AST_NODE_TYPES.FunctionExpression) {
            // void main()
            if (method.decorators && method.decorators.length === 1) {
              // @ts-ignore
              method.value.returnType = 'void';
              method.value.params = [];
              (method.value.id as Identifier).name = 'main';

              append = this.generators[this.target].generateDebugCode();

              // 不能在全局作用域定义
              // @see https://community.khronos.org/t/gles-compile-errors-under-marshmallow/74876
              if (this.target === Target.WebGL) {
                const [
                  localSizeX,
                  localSizeY,
                  localSizeZ,
                ] = this.glslContext.threadGroupSize;
                const [groupX, groupY, groupZ] = this.glslContext.dispatch;
                prepend = `
ivec3 workGroupSize = ivec3(${localSizeX}, ${localSizeY}, ${localSizeZ});
ivec3 numWorkGroups = ivec3(${groupX}, ${groupY}, ${groupZ});     
int globalInvocationIndex = int(floor(v_TexCoord.x * u_OutputTextureSize.x))
  + int(floor(v_TexCoord.y * u_OutputTextureSize.y)) * int(u_OutputTextureSize.x);
int workGroupIDLength = globalInvocationIndex / (workGroupSize.x * workGroupSize.y * workGroupSize.z);
ivec3 workGroupID = ivec3(workGroupIDLength / numWorkGroups.y / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.y);
int localInvocationIDZ = globalInvocationIndex / (workGroupSize.x * workGroupSize.y);
int localInvocationIDY = (globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y) / workGroupSize.x;
int localInvocationIDX = globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y - localInvocationIDY * workGroupSize.x;
ivec3 localInvocationID = ivec3(localInvocationIDX, localInvocationIDY, localInvocationIDZ);
ivec3 globalInvocationID = workGroupID * workGroupSize + localInvocationID;
int localInvocationIndex = localInvocationID.z * workGroupSize.x * workGroupSize.y
                + localInvocationID.y * workGroupSize.x + localInvocationID.x;
`;
              }
            }
            return this.compileFunctionExpression(
              method.value,
              context,
              prepend,
              append,
            );
          }
        })
        .join('\n');
    }
    return '';
  }

  public compileFunctionExpression(
    node: FunctionExpression | FunctionDeclaration,
    context: Context,
    prepend?: string,
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

    node.params.forEach((param) => {
      // 函数参数加入当前上下文中，便于 body 中语句进行类型推导
      context.variables.push({
        name: (param.type === AST_NODE_TYPES.Identifier && param.name) || '',
        alias: [],
        typeAnnotation:
          (param.type === AST_NODE_TYPES.Identifier &&
            ((param.typeAnnotation as unknown) as string)) ||
          '',
      });
    });

    if (node.body) {
      return `${node.returnType || 'void'} ${node.id?.name}(${(
        node.params || []
      )
        .map(
          (p) =>
            p.type === AST_NODE_TYPES.Identifier &&
            `${p.typeAnnotation} ${p.name}`,
        )
        .join(',')}) {${prepend || ''}\n${this.compileBlockStatement(
        node.body,
        context,
      )}\n${append || ''}}`;
    }
    return '';
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
      let type = inferredType || this.inferTypeByExpression(node.left, context);

      // WebGL 中 gl_FragColor 的右值都必须是 vec4 类型
      if (
        this.target === Target.WebGL &&
        this.isReferringDataTexture(node.left)
      ) {
        type = 'vec4';
      }
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
      if (
        this.target === Target.WebGPU &&
        node.callee.type === AST_NODE_TYPES.Identifier &&
        node.callee.name === 'imageLoad'
      ) {
        const textureName =
          (node.arguments[0].type === AST_NODE_TYPES.MemberExpression &&
            node.arguments[0].property.type === AST_NODE_TYPES.Identifier &&
            node.arguments[0].property.name) ||
          '';
        return (
          (textureName &&
            `texture(sampler2D(${textureName}, ${textureName}Sampler), ${this.compileExpression(
              node.arguments[1],
              context,
              'vec2',
              false,
            )})`) ||
          ''
        );
      }
      // function(a, b)
      // TODO: 替换 Math.sin() -> sin()
      return `${this.compileExpression(
        node.callee,
        context,
        '',
        isLeft,
      )}(${node.arguments
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
      if (node.object.type === AST_NODE_TYPES.MemberExpression) {
        // WebGL 需要修改 AST 结构
        // * 如果是右值 this.vectorA[globalInvocationID.x] -> getDatavectorA(this.vectorA, globalInvocationID.x)
        // * 如果是左值 this.vectorA[globalInvocationID.x] -> gl_FragColor
        if (this.target === Target.WebGL && this.isReferringDataTexture(node)) {
          if (isLeft) {
            return 'gl_FragColor';
          } else {
            return this.compileExpression(
              {
                type: AST_NODE_TYPES.CallExpression,
                callee: {
                  type: AST_NODE_TYPES.Identifier,
                  name: `getData${(node.object.property.type ===
                    AST_NODE_TYPES.Identifier &&
                    node.object.property.name) ||
                    ''}`,
                  // @ts-ignore
                  typeAnnotation: '',
                },
                arguments: [node.property],
              },
              context,
              '',
              isLeft,
            );
          }
        }

        return `${this.compileExpression(
          node.object,
          context,
          inferredType,
          isLeft,
        )}${node.computed ? '[' : '.'}${this.compileExpression(
          node.property,
          context,
          'uint',
          isLeft,
        )}${node.computed ? ']' : ''}`;
      } else if (node.object.type === AST_NODE_TYPES.Identifier) {
        // vectorA[threadId]
        let objectName = node.object.name;
        if (
          objectName === 'this' &&
          node.property.type === AST_NODE_TYPES.Identifier
        ) {
          objectName = node.property.name;
          const alias = this.findAliasVariableName(objectName, context);

          if (alias) {
            if (this.isDataTexture(alias)) {
              if (this.target === Target.WebGPU) {
                // 引用 buffer 同理
                const bufferIndex = this.glslContext.uniforms
                  .filter((u) => u.type === 'sampler2D')
                  .findIndex((u) => u.name === alias);
                if (bufferIndex > -1) {
                  return `${WebGPUShaderGenerator.GWEBGPU_BUFFER}${bufferIndex}.${alias}`;
                }
              }
            } else {
              if (this.target === Target.WebGPU) {
                // WebGPU 中我们将所有 uniform 整合成了一个，因此需要修改用户的引用方式
                const uniform = this.glslContext.uniforms
                  .filter((u) => u.type !== 'sampler2D' && u.type !== 'image2D')
                  .find((u) => u.name === alias);
                if (uniform) {
                  return `${WebGPUShaderGenerator.GWEBGPU_UNIFORM_PARAMS}.${alias}`;
                }
              }
            }
          }
        }
      }
      if (node.property.type === AST_NODE_TYPES.Identifier) {
        if (!node.computed) {
          // swizzling & struct uniform eg. params.u_k / vec.rgba
          return `${(node.object as Identifier).name}.${
            (node.property as Identifier).name
          }`;
        } else {
          return `${(node.object as Identifier).name}[${
            (node.property as Identifier).name
          }]`;
        }
      } else if (
        node.property.type === AST_NODE_TYPES.Literal &&
        isFinite(Number(node.property.value))
      ) {
        // vec[0]
        return `${(node.object as Identifier).name}[${node.property.value}]`;
      } else {
        // data[a + b]
        return `${(node.object as Identifier).name}[${this.compileExpression(
          node.property,
          context,
          'uint',
          isLeft,
        )}]`;
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
    } else if (node.type === AST_NODE_TYPES.UnaryExpression) {
      return `${node.operator}(${this.compileExpression(
        node.argument,
        context,
        inferredType,
        isLeft,
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
           * var a = this.v[index];
           * ->
           * vec3 a = vec3(1.0, 1.0, 1.0);
           * vec2 a = vec2(1.0, 1.0);
           * bool a = true;
           * float a = 10.0;
           * int a = int(222);
           * float a;
           * vec3 a = v[index];
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
            ((expression.callee.type === AST_NODE_TYPES.Identifier &&
              v.name === expression.callee.name) ||
              (expression.callee.type === AST_NODE_TYPES.MemberExpression &&
                expression.callee.object.type === AST_NODE_TYPES.Identifier &&
                expression.callee.object.name === 'this' &&
                expression.callee.property.type === AST_NODE_TYPES.Identifier &&
                expression.callee.property.name === v.name)),
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
      // this.vectorA[index]
      if (expression.object.type === AST_NODE_TYPES.MemberExpression) {
        return this.inferTypeByExpression(expression.object, context);
      } else if (expression.object.type === AST_NODE_TYPES.Identifier) {
        let objectName = expression.object.name;
        let shouldSkipThis = false;
        if (
          objectName === 'this' &&
          expression.property.type === AST_NODE_TYPES.Identifier
        ) {
          objectName = expression.property.name;
          shouldSkipThis = true;
        }
        const alias = this.findAliasVariableName(objectName, context);

        if (alias) {
          if (this.isDataTexture(alias)) {
            const uniform = this.glslContext.uniforms.find(
              (u) => alias === u.name,
            );
            return (uniform && uniform.format.replace('[]', '')) || 'vec4';
          } else if (shouldSkipThis) {
            return this.inferTypeByExpression(expression.property, context);
          }
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

  private isReferringDataTexture(node: Expression) {
    return (
      node.type === AST_NODE_TYPES.MemberExpression &&
      node.object.type === AST_NODE_TYPES.MemberExpression &&
      node.object.object.type === AST_NODE_TYPES.Identifier &&
      node.object.object.name === 'this' &&
      node.object.computed === false
    );
  }

  private analyzeDecorators(
    propertyName: string,
    propertyType: string,
    propertyFormat: string,
    decorators: Decorator[],
  ) {
    const analyzeDecorators = decorators.map((d) => this.extractDecorator(d));

    analyzeDecorators.forEach(({ name, params }) => {
      if (name === PropertyDecorator.Shared) {
        this.glslContext.globalDeclarations.push({
          name: propertyName,
          type: propertyFormat,
          shared: true,
          value: `${params[0]}`,
        });
      } else if (
        name === PropertyDecorator.Out ||
        name === PropertyDecorator.In
      ) {
        let existed = this.glslContext.uniforms.find(
          (u) => u.name === propertyName,
        );
        if (!existed) {
          existed = {
            name: propertyName,
            type: propertyType,
            format: propertyFormat,
            readonly: !!!analyzeDecorators.find(
              (d) => d.name === PropertyDecorator.Out,
            ),
            writeonly: !!!analyzeDecorators.find(
              (d) => d.name === PropertyDecorator.In,
            ),
            size: [Number(params[0]) || 1, Number(params[1]) || 1] as [
              number,
              number,
            ],
          };
          this.glslContext.uniforms.push(existed);
        }

        if (name === PropertyDecorator.Out) {
          this.glslContext.output.name = propertyName;
          this.glslContext.output.size = existed.size;
          this.glslContext.output.length = existed.size![0] * existed.size![1];

          if (propertyType === 'image2D') {
            this.glslContext.output.typedArrayConstructor = Uint8ClampedArray;
            this.glslContext.output.length! *= 4;
          }
        }
      }
    });
  }

  private extractDecorator(decorator: Decorator): IDecorator {
    let name = '';
    let params: number[] = [];
    if (decorator.expression.type === AST_NODE_TYPES.Identifier) {
      name = decorator.expression.name;
    } else if (
      decorator.expression.type === AST_NODE_TYPES.CallExpression &&
      decorator.expression.callee.type === AST_NODE_TYPES.Identifier
    ) {
      name = decorator.expression.callee.name;
      params = decorator.expression.arguments.map(
        (a) => (a.type === AST_NODE_TYPES.Literal && Number(a.value)) || 0,
      );
    }
    return {
      name,
      params,
    };
  }
}
