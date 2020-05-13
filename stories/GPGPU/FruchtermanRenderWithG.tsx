// @ts-nocheck
import { Canvas } from '@antv/g-canvas';
import { World } from '@antv/g-webgpu';
import * as dat from 'dat.gui';
import * as React from 'react';
// import data from './data/fruchterman.json';
import gCode from './g/fruchterman.glsl';

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
  public state = {
    timeElapsed: 0,
  };
  private gui: dat.GUI;
  private $stats: Node;
  private world: World;
  // index buffer or edges
  private lineIndexBufferData = [];
  private maxEdgePerVetex;

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

      this.world = new World(canvas, {
        engineOptions: {
          supportCompute: true,
        },
      });

      const timeStart = window.performance.now();
      const compute = this.world.createComputePipeline({
        // shader: gCode,
        // 预编译
        precompiled: true,
        shader:
          '{"shaders":{"WebGPU":"\\n      #define SPEED_DIVISOR 800\\n      \\n        layout(std140, set = 0, binding = 0) uniform GWebGPUParams {\\n          float u_K;\\nfloat u_K2;\\nfloat u_Gravity;\\nfloat u_Speed;\\nfloat u_MaxDisplace;\\n        } gWebGPUUniformParams;\\n      \\n      \\n        layout(std140, set = 0, binding = 1) buffer GWebGPUBuffer0 {\\n          vec4 u_Data[];\\n        } gWebGPUBuffer0;\\n      \\n      \\n      \\n      void main() {\\n          int i = int(gl_GlobalInvocationID.x);\\n        \\nvec4 currentNode = gWebGPUBuffer0.u_Data[i];\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nif ((i > THREAD_NUM)) {gWebGPUBuffer0.u_Data[i] = vec4(currentNode);\\nreturn ;}\\nfor (int j = 0; (j < int(THREAD_NUM)); j++) {if ((i != (j + int(1)))) {vec4 nextNode = gWebGPUBuffer0.u_Data[j];\\nfloat xDist = (currentNode.r - float(nextNode.r));\\nfloat yDist = (currentNode.g - float(nextNode.g));\\nfloat dist = (sqrt(((xDist * float(xDist)) + float((yDist * float(yDist))))) + float(0.01));\\nif ((dist > float(0.0))) {float repulsiveF = (gWebGPUUniformParams.u_K2 / float(dist));\\ndx += float(((xDist / float(dist)) * float(repulsiveF)));\\ndy += float(((yDist / float(dist)) * float(repulsiveF)));}}}\\nint arr_offset = int(floor((currentNode.b + float(0.5))));\\nint length = int(floor((currentNode.a + float(0.5))));\\nvec4 node_buffer;\\nfor (int p = 0; (p < int(MAX_EDGE_PER_VERTEX)); p++) {if ((p >= int(length))) {break;}\\nint arr_idx = (arr_offset + int(p));\\nint buf_offset = (arr_idx - int(((arr_idx / int(4)) * int(4))));\\nif ((p == int(0)) || (buf_offset == int(0))) {node_buffer = vec4(gWebGPUBuffer0.u_Data[int((arr_idx / vec4(4)))]);}\\nfloat float_j = ((buf_offset == int(0))) ? (node_buffer.r) : (((buf_offset == int(1))) ? (node_buffer.g) : (((buf_offset == int(2))) ? (node_buffer.b) : (node_buffer.a)));\\nvec4 nextNode = gWebGPUBuffer0.u_Data[int(float_j)];\\nfloat xDist = (currentNode.r - float(nextNode.r));\\nfloat yDist = (currentNode.g - float(nextNode.g));\\nfloat dist = (sqrt(((xDist * float(xDist)) + float((yDist * float(yDist))))) + float(0.01));\\nfloat attractiveF = ((dist * float(dist)) / float(gWebGPUUniformParams.u_K));\\nif ((dist > float(0.0))) {dx -= float(((xDist / float(dist)) * float(attractiveF)));\\ndy -= float(((yDist / float(dist)) * float(attractiveF)));}}\\nfloat d = sqrt(((currentNode.r * float(currentNode.r)) + float((currentNode.g * float(currentNode.g)))));\\nfloat gf = (((0.01 * float(gWebGPUUniformParams.u_K)) * float(gWebGPUUniformParams.u_Gravity)) * float(d));\\ndx -= float(((gf * float(currentNode.r)) / float(d)));\\ndy -= float(((gf * float(currentNode.g)) / float(d)));\\ndx *= float(gWebGPUUniformParams.u_Speed);\\ndy *= float(gWebGPUUniformParams.u_Speed);\\nfloat distLength = sqrt(((dx * float(dx)) + float((dy * float(dy)))));\\nif ((distLength > float(0.0))) {float limitedDist = min((gWebGPUUniformParams.u_MaxDisplace * float(gWebGPUUniformParams.u_Speed)),distLength);\\ngWebGPUBuffer0.u_Data[i] = vec4(vec4((currentNode.r + float(((dx / float(distLength)) * float(limitedDist)))),(currentNode.g + float(((dy / float(distLength)) * float(limitedDist)))),currentNode.b,currentNode.a));}}\\n      ","WebGL":"\\n      #ifdef GL_FRAGMENT_PRECISION_HIGH\\n        precision highp float;\\n      #else\\n        precision mediump float;\\n      #endif\\n      #define SPEED_DIVISOR 800\\n      uniform sampler2D u_Data;\\nuniform float u_K;\\nuniform float u_K2;\\nuniform float u_Gravity;\\nuniform float u_Speed;\\nuniform float u_MaxDisplace;\\n      uniform float u_TexSize;\\n      varying vec2 v_TexCoord;\\n      \\n    vec4 getThreadData(sampler2D tex) {\\n      return texture2D(tex, vec2(v_TexCoord.s, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, float i) {\\n      return texture2D(tex, vec2((i + 0.5) / u_TexSize, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, int i) {\\n      if (i == int(floor(v_TexCoord.s * u_TexSize + 0.5))) {\\n        return texture2D(tex, vec2(v_TexCoord.s, 1));\\n      }\\n      return texture2D(tex, vec2((float(i) + 0.5) / u_TexSize, 1));\\n    }\\n  \\n      \\n      \\n      void main() {\\n          int i = int(floor(v_TexCoord.s * u_TexSize + 0.5));\\n        \\nvec4 currentNode = getThreadData(u_Data, i);\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nif ((i > THREAD_NUM)) {gl_FragColor = vec4(currentNode);\\nreturn ;}\\nfor (int j = 0; (j < int(THREAD_NUM)); j++) {if ((i != (j + int(1)))) {vec4 nextNode = getThreadData(u_Data, j);\\nfloat xDist = (currentNode.r - float(nextNode.r));\\nfloat yDist = (currentNode.g - float(nextNode.g));\\nfloat dist = (sqrt(((xDist * float(xDist)) + float((yDist * float(yDist))))) + float(0.01));\\nif ((dist > float(0.0))) {float repulsiveF = (u_K2 / float(dist));\\ndx += float(((xDist / float(dist)) * float(repulsiveF)));\\ndy += float(((yDist / float(dist)) * float(repulsiveF)));}}}\\nint arr_offset = int(floor((currentNode.b + float(0.5))));\\nint length = int(floor((currentNode.a + float(0.5))));\\nvec4 node_buffer;\\nfor (int p = 0; (p < int(MAX_EDGE_PER_VERTEX)); p++) {if ((p >= int(length))) {break;}\\nint arr_idx = (arr_offset + int(p));\\nint buf_offset = (arr_idx - int(((arr_idx / int(4)) * int(4))));\\nif ((p == int(0)) || (buf_offset == int(0))) {node_buffer = vec4(getThreadData(u_Data, int((arr_idx / int(4)))));}\\nfloat float_j = ((buf_offset == int(0))) ? (node_buffer.r) : (((buf_offset == int(1))) ? (node_buffer.g) : (((buf_offset == int(2))) ? (node_buffer.b) : (node_buffer.a)));\\nvec4 nextNode = getThreadData(u_Data, int(float_j));\\nfloat xDist = (currentNode.r - float(nextNode.r));\\nfloat yDist = (currentNode.g - float(nextNode.g));\\nfloat dist = (sqrt(((xDist * float(xDist)) + float((yDist * float(yDist))))) + float(0.01));\\nfloat attractiveF = ((dist * float(dist)) / float(u_K));\\nif ((dist > float(0.0))) {dx -= float(((xDist / float(dist)) * float(attractiveF)));\\ndy -= float(((yDist / float(dist)) * float(attractiveF)));}}\\nfloat d = sqrt(((currentNode.r * float(currentNode.r)) + float((currentNode.g * float(currentNode.g)))));\\nfloat gf = (((0.01 * float(u_K)) * float(u_Gravity)) * float(d));\\ndx -= float(((gf * float(currentNode.r)) / float(d)));\\ndy -= float(((gf * float(currentNode.g)) / float(d)));\\ndx *= float(u_Speed);\\ndy *= float(u_Speed);\\nfloat distLength = sqrt(((dx * float(dx)) + float((dy * float(dy)))));\\nif ((distLength > float(0.0))) {float limitedDist = min((u_MaxDisplace * float(u_Speed)),distLength);\\ngl_FragColor = vec4(vec4((currentNode.r + float(((dx / float(distLength)) * float(limitedDist)))),(currentNode.g + float(((dy / float(distLength)) * float(limitedDist)))),currentNode.b,currentNode.a));}}\\n      "},"context":{"threadNum":960,"maxIteration":8000,"defines":[{"name":"SPEED_DIVISOR","value":800,"runtime":false},{"name":"THREAD_NUM","value":218,"runtime":true},{"name":"MAX_EDGE_PER_VERTEX","value":50,"runtime":true}],"uniforms":[{"name":"u_Data","type":"sampler2D"},{"name":"u_K","type":"float"},{"name":"u_K2","type":"float"},{"name":"u_Gravity","type":"float"},{"name":"u_Speed","type":"float"},{"name":"u_MaxDisplace","type":"float"}],"output":{"length":3840}}}',
        threadNum: numParticles,
        maxIteration: MAX_ITERATION,
        onCompleted: (finalParticleData) => {
          this.setState({
            timeElapsed: window.performance.now() - timeStart,
          });
          // draw with G
          this.renderCircles(finalParticleData);

          // precompiled
          // console.log(this.world.getPrecompiledBundle(compute));

          // 计算完成后销毁相关 GPU 资源
          this.world.destroy();
        },
      });

      this.world.setBinding(compute, 'u_Data', nodesEdgesArray);
      this.world.setBinding(
        compute,
        'u_K',
        Math.sqrt((numParticles * numParticles) / (numParticles + 1) / 300),
      );
      this.world.setBinding(
        compute,
        'u_K2',
        (numParticles * numParticles) / (numParticles + 1) / 300 / 300,
      );
      this.world.setBinding(compute, 'u_Gravity', 50);
      this.world.setBinding(compute, 'u_Speed', 0.1);
      this.world.setBinding(
        compute,
        'u_MaxDisplace',
        Math.sqrt(numParticles * numParticles) / 10,
      );
      this.world.setBinding(
        compute,
        'MAX_EDGE_PER_VERTEX',
        this.maxEdgePerVetex,
      );
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
        <>Elapsed time: {this.state.timeElapsed / 1000}s</>
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
