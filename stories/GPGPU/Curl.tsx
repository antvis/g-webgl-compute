// @ts-nocheck
import { World } from '@antv/g-webgpu-core';
import * as dat from 'dat.gui';
import * as React from 'react';
import computeShaderGLSL from './shaders/curl.comp.glsl';
import fragmentShaderGLSL from './shaders/curl.frag.glsl';
import vertexShaderGLSL from './shaders/curl.vert.glsl';

let stageDescriptor: any;
let computeStageDescriptor: any;
let computePipelineLayout: any;
let verticesBuffer: any;
let t = 0;
const numParticles = 1500;
const particleBuffers = new Array(2);
const particleBindGroups = new Array(2);

export default class Curl extends React.Component {
  private gui: dat.GUI;
  private $stats: Node;
  private world: World;

  public async componentDidMount() {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      this.world = new World(canvas, {
        engineOptions: {
          supportCompute: true,
        },
        onInit: async (engine) => {
          stageDescriptor = await engine.compilePipelineStageDescriptor(
            vertexShaderGLSL,
            fragmentShaderGLSL,
            null,
          );
          computeStageDescriptor = await engine.compileComputePipelineStageDescriptor(
            computeShaderGLSL,
            null,
          );

          const vertexBufferData = new Float32Array([
            -0.01,
            -0.02,
            0.01,
            -0.02,
            0.0,
            0.02,
          ]);
          verticesBuffer = engine.createVertexBuffer(vertexBufferData);

          const simParamData = new Float32Array([
            0.01, // deltaT
            0.1, // noiseSize;
          ]);
          const simParamBuffer = engine.createUniformBuffer(simParamData);

          const initialParticleData = new Float32Array(numParticles * 4);
          for (let i = 0; i < numParticles; ++i) {
            initialParticleData[4 * i + 0] = 2 * (Math.random() - 0.5);
            initialParticleData[4 * i + 1] = 2 * (Math.random() - 0.5);
            initialParticleData[4 * i + 2] = 2 * (Math.random() - 0.5) * 0.1;
            initialParticleData[4 * i + 3] = 2 * (Math.random() - 0.5) * 0.1;
          }

          for (let i = 0; i < 2; ++i) {
            particleBuffers[i] = engine.createVertexBuffer(
              initialParticleData,
              128,
            );
          }

          const computeBindGroupLayout = engine
            .getDevice()
            .createBindGroupLayout({
              bindings: [
                {
                  binding: 0,
                  visibility: 4, // ShaderStage.Compute
                  type: 'uniform-buffer',
                },
                {
                  binding: 1,
                  visibility: 4,
                  type: 'storage-buffer',
                },
                {
                  binding: 2,
                  visibility: 4,
                  type: 'storage-buffer',
                },
              ],
            });
          computePipelineLayout = engine.getDevice().createPipelineLayout({
            bindGroupLayouts: [computeBindGroupLayout],
          });

          for (let i = 0; i < 2; ++i) {
            particleBindGroups[i] = engine.getDevice().createBindGroup({
              layout: computeBindGroupLayout,
              bindings: [
                {
                  binding: 0,
                  resource: {
                    buffer: simParamBuffer,
                    offset: 0,
                    size: simParamData.byteLength,
                  },
                },
                {
                  binding: 1,
                  resource: {
                    buffer: particleBuffers[i],
                    offset: 0,
                    size: initialParticleData.byteLength,
                  },
                },
                {
                  binding: 2,
                  resource: {
                    buffer: particleBuffers[(i + 1) % 2],
                    offset: 0,
                    size: initialParticleData.byteLength,
                  },
                },
              ],
            });
          }
        },
        onUpdate: async (engine) => {
          engine.clear({ r: 0.0, g: 0.0, b: 0.0, a: 1.0 }, true, true, true);

          engine.setComputePipeline('compute', {
            layout: computePipelineLayout,
            ...computeStageDescriptor,
          });
          engine.setComputeBindGroups([particleBindGroups[t % 2]]);
          engine.dispatch(numParticles);

          engine.bindVertexInputs({
            indexBuffer: null,
            indexOffset: 0,
            vertexStartSlot: 0,
            vertexBuffers: [particleBuffers[(t + 1) % 2], verticesBuffer],
            vertexOffsets: [0, 0],
          });
          engine.drawArraysType(
            'render',
            {
              layout: engine
                .getDevice()
                .createPipelineLayout({ bindGroupLayouts: [] }),
              ...stageDescriptor,
              primitiveTopology: 'triangle-list',
              vertexState: {
                vertexBuffers: [
                  {
                    // instanced particles buffer
                    arrayStride: 4 * 4,
                    stepMode: 'instance',
                    attributes: [
                      {
                        // instance position
                        shaderLocation: 0,
                        offset: 0,
                        format: 'float2',
                      },
                      {
                        // instance velocity
                        shaderLocation: 1,
                        offset: 2 * 4,
                        format: 'float2',
                      },
                    ],
                  },
                  {
                    // vertex buffer
                    arrayStride: 2 * 4,
                    stepMode: 'vertex',
                    attributes: [
                      {
                        // vertex positions
                        shaderLocation: 2,
                        offset: 0,
                        format: 'float2',
                      },
                    ],
                  },
                ],
              },
            },
            0,
            3,
            numParticles,
          );

          // ping-pong
          ++t;
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
}
