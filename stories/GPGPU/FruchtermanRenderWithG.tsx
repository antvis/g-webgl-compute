// @ts-nocheck
import { Canvas } from '@antv/g-canvas';
import { World } from '@antv/g-webgpu';
import * as dat from 'dat.gui';
import * as React from 'react';
import computeShaderGLSL from './shaders/fruchterman.comp.glsl';
import computeShaderGLSLInWebGL from './shaders/fruchterman.webgl.comp.glsl';

const MAX_ITERATION = 8000;
const CANVAS_HEIGHT = 600;
const CANVAS_WIDTH = 600;

let numParticles = 0;
let numEdges = 0;

/**
 * ported from G6 and render with g-canvas
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
    const edges = data.edges;

    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      numParticles = nodes.length;
      numEdges = edges.length;
      const nodesEdgesArray = this.buildTextureData(nodes, edges);

      const simParamData = new Float32Array([
        (numParticles * numParticles) / (numParticles + 1) / 300 / 300, // k^2
        Math.sqrt((numParticles * numParticles) / (numParticles + 1) / 300), // k
        this.maxEdgePerVetex, // maxEdgePerVetex
        50, // gravity
        0.1, // speed
        Math.sqrt(numParticles * numParticles) / 10, // maxDisplace
      ]);

      this.world = new World(canvas, {
        engineOptions: {
          supportCompute: true,
        },
      });

      const compute = this.world.createComputePipeline({
        type: 'layout',
        shader: computeShaderGLSL,
        shaderInWebGL: computeShaderGLSLInWebGL,
        particleCount: numParticles,
        particleData: nodesEdgesArray,
        maxIteration: MAX_ITERATION,
        onCompleted: (finalParticleData) => {
          // draw with G
          this.renderCircles(finalParticleData);

          // 计算完成后销毁相关 GPU 资源
          this.world.destroy();
        },
      });

      this.world.setBinding(compute, 'simParams', simParamData, {
        binding: 1,
        type: 'uniform-buffer',
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
      <>
        <canvas id="application" style={{ display: 'none' }} />
        <div id="container" />
      </>
    );
  }

  private renderCircles(finalParticleData) {
    const canvas = new Canvas({
      container: 'container',
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });

    // draw edges
    for (let i = 0; i < this.lineIndexBufferData.length; i += 2) {
      const x1 = finalParticleData[this.lineIndexBufferData[i] * 4];
      const y1 = finalParticleData[this.lineIndexBufferData[i] * 4 + 1];
      const x2 = finalParticleData[this.lineIndexBufferData[i + 1] * 4];
      const y2 = finalParticleData[this.lineIndexBufferData[i + 1] * 4 + 1];
      const group = canvas.addGroup();
      group.addShape('line', {
        attrs: {
          x1: this.convertWebGLCoord2Canvas(x1, CANVAS_WIDTH),
          y1: this.convertWebGLCoord2Canvas(y1, CANVAS_HEIGHT),
          x2: this.convertWebGLCoord2Canvas(x2, CANVAS_WIDTH),
          y2: this.convertWebGLCoord2Canvas(y2, CANVAS_HEIGHT),
          stroke: '#1890FF',
          lineWidth: 1,
        },
      });
    }

    // draw nodes
    for (let i = 0; i < numParticles * 4; i += 4) {
      const x = finalParticleData[i];
      const y = finalParticleData[i + 1];
      const group = canvas.addGroup();
      group.addShape('circle', {
        attrs: {
          x: this.convertWebGLCoord2Canvas(x, CANVAS_WIDTH),
          y: this.convertWebGLCoord2Canvas(y, CANVAS_HEIGHT),
          r: 5,
          fill: 'red',
          stroke: 'blue',
          lineWidth: 2,
        },
      });
    }
  }

  private convertWebGLCoord2Canvas(c: number, size: number) {
    return ((c + 1) / 2) * size;
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
