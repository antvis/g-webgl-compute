// @ts-nocheck
import { World } from '@antv/g-webgpu-core';
import * as dat from 'dat.gui';
import * as React from 'react';
import lineFragmentShaderGLSL from './shaders/fruchterman-line.frag.glsl';
import lineVertexShaderGLSL from './shaders/fruchterman-line.vert.glsl';
import computeShaderGLSL from './shaders/fruchterman.comp.glsl';
import fragmentShaderGLSL from './shaders/fruchterman.frag.glsl';
import vertexShaderGLSL from './shaders/fruchterman.vert.glsl';

const MAX_ITERATION = 8000;

let stageDescriptor;
let lineStageDescriptor;
let computeStageDescriptor;
let computePipelineLayout;
let renderPipelineLayout;
let uniformBindGroup;
let numParticles = 0;
let numEdges = 0;
let particleBuffer;
let particleBindGroup;
let extrudeBuffer;
let colorBuffer;
let sizeBuffer;
let lineIndexBuffer;

/**
 * ported from G6
 * @see https://github.com/antvis/G6/blob/master/src/layout/fruchterman.ts
 *
 * WebGL/Unity implements
 * @see https://nblintao.github.io/ParaGraphL/
 * @see https://github.com/l-l/UnityNetworkGraph/blob/master/Assets/Shaders/GraphCS.compute
 */
export default class Fruchterman extends React.Component {
  private gui: dat.GUI;
  private $stats: Node;
  private world: World;
  private computed = false;
  private iteration = 0;
  // index buffer or edges
  private lineIndexBufferData = [];

  public async componentDidMount() {
    // @see https://g6.antv.vision/en/examples/net/forceDirected/#basicForceDirected
    const data = await (
      await fetch(
        'https://gw.alipayobjects.com/os/basement_prod/7bacd7d1-4119-4ac1-8be3-4c4b9bcbc25f.json',
      )
    ).json();

    const nodes = data.nodes.map((n) => ({
      x: (Math.random() * 2 - 1) / 10,
      y: (Math.random() * 2 - 1) / 10,
      id: n.id,
    }));

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
          lineStageDescriptor = await engine.compilePipelineStageDescriptor(
            lineVertexShaderGLSL,
            lineFragmentShaderGLSL,
            null,
          );
          computeStageDescriptor = await engine.compileComputePipelineStageDescriptor(
            computeShaderGLSL,
            null,
          );

          this.createComputePipelineLayout(engine, nodes, data.edges);
          this.createRenderPipelineLayout(engine);
          this.createCircleBuffers(engine, nodes);

          lineIndexBuffer = engine.createIndexBuffer(this.lineIndexBufferData);
        },
        onUpdate: async (engine) => {
          engine.clear({ r: 1.0, g: 1.0, b: 1.0, a: 1.0 }, true, true, true);

          if (!this.computed) {
            engine.setComputePipeline('compute', {
              layout: computePipelineLayout,
              ...computeStageDescriptor,
            });
            engine.setComputeBindGroups([particleBindGroup]);

            while (this.iteration < MAX_ITERATION) {
              engine.dispatch(numParticles);
              this.iteration++;
            }

            this.computed = true;
          }

          this.drawLines(engine);
          this.drawCircles(engine);
        },
      });
    }
  }

  public componentWillUnmount() {
    if (this.world) {
      this.world.destroy();

      extrudeBuffer.destroy();
      sizeBuffer.destroy();
      particleBuffer.destroy();
      colorBuffer.destroy();
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

  private createComputePipelineLayout(engine, nodes, edges) {
    numParticles = nodes.length;
    numEdges = edges.length;
    const nodesEdgesArray = this.buildTextureData(nodes, edges);

    particleBuffer = engine.createVertexBuffer(
      nodesEdgesArray,
      128, // Storage
    );

    const simParamData = new Float32Array([
      numParticles, // nodeNum
      (numParticles * numParticles) / (numParticles + 1) / 300 / 300, // k^2
      Math.sqrt((numParticles * numParticles) / (numParticles + 1) / 300), // k
      this.maxEdgePerVetex, // maxEdgePerVetex
      50, // gravity
      0.1, // speed
      Math.sqrt(numParticles * numParticles) / 10, // maxDisplace
    ]);
    const simParamBuffer = engine.createUniformBuffer(simParamData);

    const computeBindGroupLayout = engine.getDevice().createBindGroupLayout({
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
      ],
    });
    computePipelineLayout = engine.getDevice().createPipelineLayout({
      bindGroupLayouts: [computeBindGroupLayout],
    });

    particleBindGroup = engine.getDevice().createBindGroup({
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
            buffer: particleBuffer,
            offset: 0,
            size: nodesEdgesArray.byteLength,
          },
        },
      ],
    });
  }

  private createRenderPipelineLayout(engine) {
    const circleParamData = new Float32Array([
      1.0, // opacity
      2, // strokeWidth
      1.0,
      1.0,
      0.0,
      1.0, // strokeColor
      0.8, // strokeOpacity
    ]);
    const circleParamBuffer = engine.createUniformBuffer(circleParamData);

    const renderBindGroupLayout = engine.getDevice().createBindGroupLayout({
      bindings: [
        {
          binding: 0,
          visibility: 1 | 2,
          type: 'uniform-buffer',
        },
      ],
    });

    renderPipelineLayout = engine
      .getDevice()
      .createPipelineLayout({ bindGroupLayouts: [renderBindGroupLayout] });

    uniformBindGroup = engine.getDevice().createBindGroup({
      layout: renderBindGroupLayout,
      bindings: [
        {
          binding: 0,
          resource: {
            buffer: circleParamBuffer,
          },
        },
      ],
    });
  }

  private createCircleBuffers(engine, nodes) {
    const extrudeData = [];
    const colorData = [];
    const sizeData = [];

    nodes.forEach(() => {
      colorData.push(198 / 255, 229 / 255, 1, 1);
      sizeData.push(10); // radius
      extrudeData.push(1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1);
    });

    extrudeBuffer = engine.createVertexBuffer(new Float32Array(extrudeData));
    sizeBuffer = engine.createVertexBuffer(new Float32Array(sizeData));
    colorBuffer = engine.createVertexBuffer(new Float32Array(colorData));
  }

  private drawCircles(engine) {
    engine.bindVertexInputs({
      indexBuffer: null,
      vertexStartSlot: 0,
      vertexBuffers: [particleBuffer, extrudeBuffer, colorBuffer, sizeBuffer],
      vertexOffsets: [0, 0, 0, 0],
    });
    engine.setRenderBindGroups([uniformBindGroup]);

    // draw circles
    engine.drawArraysType(
      'renderCircles',
      {
        layout: renderPipelineLayout,
        ...stageDescriptor,
        primitiveTopology: 'triangle-list',
        vertexState: {
          vertexBuffers: [
            {
              arrayStride: 4 * 4,
              stepMode: 'instance',
              attributes: [
                {
                  shaderLocation: 0,
                  offset: 0,
                  format: 'float4',
                },
              ],
            },
            // extrude
            {
              arrayStride: 2 * 4,
              stepMode: 'vertex',
              attributes: [
                {
                  shaderLocation: 1,
                  offset: 0,
                  format: 'float2',
                },
              ],
            },
            // color
            {
              arrayStride: 4 * 4,
              stepMode: 'instance',
              attributes: [
                {
                  shaderLocation: 2,
                  offset: 0,
                  format: 'float4',
                },
              ],
            },
            // size/radius
            {
              arrayStride: 4,
              stepMode: 'instance',
              attributes: [
                {
                  shaderLocation: 3,
                  offset: 0,
                  format: 'float',
                },
              ],
            },
          ],
        },
        colorStates: [
          {
            format: 'bgra8unorm',
            colorBlend: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alphaBlend: {
              srcFactor: 'one',
              dstFactor: 'one',
              operation: 'add',
            },
          },
        ],
      },
      0, // verticesStart
      numParticles * 6, // verticesCount
      numParticles, // instancesCount
    );
  }

  private drawLines(engine) {
    engine.bindVertexInputs({
      indexBuffer: lineIndexBuffer,
      indexOffset: 0,
      vertexStartSlot: 0,
      vertexBuffers: [particleBuffer],
      vertexOffsets: [0],
    });
    engine.drawElementsType(
      'renderLines',
      {
        ...lineStageDescriptor,
        primitiveTopology: 'line-list',
        vertexState: {
          indexFormat: 'uint16',
          vertexBuffers: [
            {
              arrayStride: 4 * 4,
              stepMode: 'vertex',
              attributes: [
                {
                  shaderLocation: 0,
                  offset: 0,
                  format: 'float4',
                },
              ],
            },
          ],
        },
      },
      0, // indexStart
      numEdges * 2, // indexCount
      1, // instancesCount
    );
  }

  // @see https://github.com/nblintao/ParaGraphL/blob/master/sigma.layout.paragraphl.js#L192-L229
  private buildTextureData(nodes, edges) {
    const dataArray = [];
    const nodeDict = [];
    const mapIdPos = {};
    let i = 0;
    for (i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      mapIdPos[n.id] = i;
      dataArray.push(n.x);
      dataArray.push(n.y);
      dataArray.push(0);
      dataArray.push(0);
      nodeDict.push([]);
    }
    for (i = 0; i < edges.length; i++) {
      const e = edges[i];
      nodeDict[mapIdPos[e.source]].push(mapIdPos[e.target]);
      nodeDict[mapIdPos[e.target]].push(mapIdPos[e.source]);
      this.lineIndexBufferData.push(mapIdPos[e.source], mapIdPos[e.target]);
    }

    this.maxEdgePerVetex = 0;
    for (i = 0; i < nodes.length; i++) {
      const offset = dataArray.length;
      const dests = nodeDict[i];
      const len = dests.length;
      dataArray[i * 4 + 2] = offset;
      dataArray[i * 4 + 3] = dests.length;
      this.maxEdgePerVetex = Math.max(this.maxEdgePerVetex, dests.length);
      for (let j = 0; j < len; ++j) {
        const dest = dests[j];
        dataArray.push(+dest);
      }
    }

    while (dataArray.length % 4 !== 0) {
      dataArray.push(0);
    }
    return new Float32Array(dataArray);
  }
}
