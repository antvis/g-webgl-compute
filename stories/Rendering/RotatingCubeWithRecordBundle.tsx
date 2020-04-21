// @ts-nocheck
import { World } from '@antv/g-webgpu';
import * as dat from 'dat.gui';
import { mat4, vec3 } from 'gl-matrix';
import * as React from 'react';
import {
  cubeColorOffset,
  cubePositionOffset,
  cubeVertexArray,
  cubeVertexSize,
} from './fixture/cube';

let stageDescriptor: any;

let pipelineLayout;
let projectionMatrix = mat4.create();

let uniformBuffer;
let uniformBindGroup;
let verticesBuffer;

export default class RotatingCubeWithRecordBundle extends React.Component {
  private gui: dat.GUI;
  private $stats: Node;
  private world: World;

  public async componentDidMount() {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      this.world = new World(canvas, {
        useRenderBundle: true,
        onInit: async (engine) => {
          const vertexShaderGLSL = `
            layout(set = 0, binding = 0) uniform Uniforms {
              mat4 modelViewProjectionMatrix;
            } uniforms;

            layout(location = 0) in vec4 position;
            layout(location = 1) in vec4 color;

            layout(location = 0) out vec4 fragColor;

            void main() {
              gl_Position = uniforms.modelViewProjectionMatrix * position;
              fragColor = color;
            }
            `;

          const fragmentShaderGLSL = `
            layout(location = 0) in vec4 fragColor;
            layout(location = 0) out vec4 outColor;

            void main() {
              outColor = fragColor;
            }
            `;
          stageDescriptor = await engine.compilePipelineStageDescriptor(
            vertexShaderGLSL,
            fragmentShaderGLSL,
            null,
          );

          // 创建 ProjectionMatrix
          const aspect = Math.abs(canvas.width / canvas.height);
          projectionMatrix = mat4.create();
          mat4.perspective(
            projectionMatrix,
            (2 * Math.PI) / 5,
            aspect,
            1,
            100.0,
          );

          verticesBuffer = engine.createVertexBuffer(cubeVertexArray);
          const uniformsBindGroupLayout = engine
            .getDevice()
            .createBindGroupLayout({
              bindings: [
                {
                  binding: 0,
                  visibility: 1,
                  type: 'uniform-buffer',
                },
              ],
            });

          pipelineLayout = engine.getDevice().createPipelineLayout({
            bindGroupLayouts: [uniformsBindGroupLayout],
          });

          uniformBuffer = engine.createUniformBuffer(new Float32Array(16));

          uniformBindGroup = engine.getDevice().createBindGroup({
            layout: uniformsBindGroupLayout,
            bindings: [
              {
                binding: 0,
                resource: {
                  buffer: uniformBuffer,
                },
              },
            ],
          });
        },
        onUpdate: async (engine) => {
          engine.clear({ r: 0.0, g: 0.0, b: 0.0, a: 1.0 }, true, true, true);
          engine.setSubData(uniformBuffer, 0, this.getTransformationMatrix());
          engine.bindVertexInputs({
            indexBuffer: null,
            vertexStartSlot: 0,
            vertexBuffers: [verticesBuffer],
            vertexOffsets: [0],
          });
          engine.setRenderBindGroups([uniformBindGroup]);
          engine.drawArraysType(
            'render',
            {
              layout: pipelineLayout,
              ...stageDescriptor,
              primitiveTopology: 'triangle-list',
              vertexState: {
                vertexBuffers: [
                  {
                    arrayStride: cubeVertexSize,
                    stepMode: 'vertex',
                    attributes: [
                      {
                        // position
                        shaderLocation: 0,
                        offset: cubePositionOffset,
                        format: 'float4',
                      },
                      {
                        // color
                        shaderLocation: 1,
                        offset: cubeColorOffset,
                        format: 'float4',
                      },
                    ],
                  },
                ],
              },
              rasterizationState: {
                cullMode: 'back',
              },
              depthStencilState: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus-stencil8',
              },
            },
            0,
            36,
            1,
          );
        },
      });
    }
  }

  public componentWillUnmount() {
    if (this.world) {
      this.world.destroy();
    }
  }

  public render() {
    return (
      <canvas
        id="application"
        width="600"
        height="600"
        style={{
          pointerEvents: 'none',
        }}
      />
    );
  }

  private getTransformationMatrix() {
    const viewMatrix = mat4.create();
    mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -5));
    const now = Date.now() / 1000;
    mat4.rotate(
      viewMatrix,
      viewMatrix,
      1,
      vec3.fromValues(Math.sin(now), Math.cos(now), 0),
    );

    const modelViewProjectionMatrix = mat4.create();
    mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);

    return modelViewProjectionMatrix;
  }
}
