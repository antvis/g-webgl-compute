import { Canvas } from '@antv/g-canvas';
import { World } from '@antv/g-webgpu';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const MAX_ITERATION = 8000;

const App = React.memo(function Fruchterman() {
  const [timeElapsed, setTimeElapsed] = useState(0);
  useEffect(() => {
    (async () => {
      const canvas = document.getElementById(
        'application',
      ) as HTMLCanvasElement;
      if (canvas) {
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
        const numParticles = nodes.length;
        const nodesEdgesArray = buildTextureData(nodes, edges);

        const world = new World(canvas, {
          engineOptions: {
            supportCompute: true,
          },
        });

        const timeStart = window.performance.now();
        const compute = world.createComputePipeline({
          precompiled: true,
          shader: '{"shaders":{"WebGPU":"\\nlayout (\\n  local_size_x = 1,\\n  local_size_y = 1,\\n  local_size_z = 1\\n) in;\\n\\n#define SPEED_DIVISOR 800\\nlayout(std140, set = 0, binding = 0) uniform GWebGPUParams {\\n  float u_K;\\n  float u_K2;\\n  float u_Gravity;\\n  float u_Speed;\\n  float u_MaxDisplace;\\n} gWebGPUUniformParams;\\nlayout(std430, set = 0, binding = 1) buffer   GWebGPUBuffer0 {\\n  vec4 u_Data[];\\n} gWebGPUBuffer0;\\n\\n\\n\\n\\n\\n\\n\\nivec3 globalInvocationID = ivec3(gl_GlobalInvocationID);\\nivec3 workGroupSize = ivec3(gl_WorkGroupSize);\\nivec3 workGroupID = ivec3(gl_WorkGroupID);\\nivec3 localInvocationID = ivec3(gl_LocalInvocationID);\\nivec3 numWorkGroups = ivec3(gl_NumWorkGroups);\\nint localInvocationIndex = int(gl_LocalInvocationIndex);\\n\\n\\nvec2 calcRepulsive(int i,vec4 currentNode) {\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nfor (int j = 0; (j < int(VERTEX_COUNT)); j++) {if ((i != int((j + int(1))))) {vec4 nextNode = gWebGPUBuffer0.u_Data[j];\\nfloat xDist = (currentNode[0] - float(nextNode[0]));\\nfloat yDist = (currentNode[1] - float(nextNode[1]));\\nfloat dist = (sqrt(((xDist * float(xDist)) + float((yDist * float(yDist))))) + float(0.01));\\nif ((dist > float(0.0))) {float repulsiveF = (gWebGPUUniformParams.u_K2 / float(dist));\\ndx += float(((xDist / float(dist)) * float(repulsiveF)));\\ndy += float(((yDist / float(dist)) * float(repulsiveF)));}}}\\nreturn vec2(dx,dy);}\\nvec2 calcGravity(vec4 currentNode) {\\nfloat d = sqrt(((currentNode[0] * float(currentNode[0])) + float((currentNode[1] * float(currentNode[1])))));\\nfloat gf = (((0.01 * float(gWebGPUUniformParams.u_K)) * float(gWebGPUUniformParams.u_Gravity)) * float(d));\\nreturn vec2(((gf * float(currentNode[0])) / float(d)),((gf * float(currentNode[1])) / float(d)));}\\nvec2 calcAttractive(vec4 currentNode) {\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nint arr_offset = int(floor((currentNode[2] + float(0.5))));\\nint length = int(floor((currentNode[3] + float(0.5))));\\nvec4 node_buffer;\\nfor (int p = 0; (p < int(MAX_EDGE_PER_VERTEX)); p++) {if ((p >= int(length))) {break;}\\nint arr_idx = (arr_offset + int(p));\\nint buf_offset = (arr_idx - int(((arr_idx / int(4)) * int(4))));\\nif ((p == int(0)) || (buf_offset == int(0))) {node_buffer = vec4(gWebGPUBuffer0.u_Data[int((arr_idx / 4))]);}\\nfloat float_j = ((buf_offset == int(0))) ? (node_buffer[0]) : (((buf_offset == int(1))) ? (node_buffer[1]) : (((buf_offset == int(2))) ? (node_buffer[2]) : (node_buffer[3])));\\nvec4 nextNode = gWebGPUBuffer0.u_Data[int(float_j)];\\nfloat xDist = (currentNode[0] - float(nextNode[0]));\\nfloat yDist = (currentNode[1] - float(nextNode[1]));\\nfloat dist = (sqrt(((xDist * float(xDist)) + float((yDist * float(yDist))))) + float(0.01));\\nfloat attractiveF = ((dist * float(dist)) / float(gWebGPUUniformParams.u_K));\\nif ((dist > float(0.0))) {dx -= float(((xDist / float(dist)) * float(attractiveF)));\\ndy -= float(((yDist / float(dist)) * float(attractiveF)));}}\\nreturn vec2(dx,dy);}\\nvoid main() {\\nint i = globalInvocationID.x;\\nvec4 currentNode = gWebGPUBuffer0.u_Data[i];\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nif ((i >= int(VERTEX_COUNT))) {gWebGPUBuffer0.u_Data[i] = vec4(currentNode);\\nreturn ;}\\nvec2 repulsive = calcRepulsive(i,currentNode);\\ndx += float(repulsive[0]);\\ndy += float(repulsive[1]);\\nvec2 attractive = calcAttractive(currentNode);\\ndx += float(attractive[0]);\\ndy += float(attractive[1]);\\nvec2 gravity = calcGravity(currentNode);\\ndx -= float(gravity[0]);\\ndy -= float(gravity[1]);\\ndx *= float(gWebGPUUniformParams.u_Speed);\\ndy *= float(gWebGPUUniformParams.u_Speed);\\nfloat distLength = sqrt(((dx * float(dx)) + float((dy * float(dy)))));\\nif ((distLength > float(0.0))) {float limitedDist = min((gWebGPUUniformParams.u_MaxDisplace * float(gWebGPUUniformParams.u_Speed)),distLength);\\ngWebGPUBuffer0.u_Data[i] = vec4(vec4((currentNode[0] + float(((dx / float(distLength)) * float(limitedDist)))),(currentNode[1] + float(((dy / float(distLength)) * float(limitedDist)))),currentNode[2],currentNode[3]));}}\\n","WebGL":"\\n#ifdef GL_FRAGMENT_PRECISION_HIGH\\n  precision highp float;\\n#else\\n  precision mediump float;\\n#endif\\n#define SPEED_DIVISOR 800\\nuniform sampler2D u_Data;\\nuniform float u_K;\\nuniform float u_K2;\\nuniform float u_Gravity;\\nuniform float u_Speed;\\nuniform float u_MaxDisplace;\\n\\nvec2 addrTranslation_1Dto2D(float address1D, vec2 texSize) {\\n  vec2 conv_const = vec2(1.0 / texSize.x, 1.0 / (texSize.x * texSize.y));\\n  vec2 normAddr2D = float(address1D) * conv_const;\\n  return vec2(fract(normAddr2D.x), normAddr2D.y);\\n}\\n\\nvoid barrier() {}\\n  \\n\\nuniform vec2 u_DataSize;\\nvec4 getDatau_Data(vec2 address2D) {\\n  return vec4(texture2D(u_Data, address2D).rgba);\\n}\\nvec4 getDatau_Data(float address1D) {\\n  return getDatau_Data(addrTranslation_1Dto2D(address1D, u_DataSize));\\n}\\nvec4 getDatau_Data(int address1D) {\\n  return getDatau_Data(float(address1D));\\n}\\n\\nuniform vec2 u_OutputTextureSize;\\nuniform int u_OutputTexelCount;\\nvarying vec2 v_TexCoord;\\n\\nvec2 calcRepulsive(int i,vec4 currentNode) {\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nfor (int j = 0; (j < int(VERTEX_COUNT)); j++) {if ((i != int((j + int(1))))) {vec4 nextNode = getDatau_Data(j);\\nfloat xDist = (currentNode[0] - float(nextNode[0]));\\nfloat yDist = (currentNode[1] - float(nextNode[1]));\\nfloat dist = (sqrt(((xDist * float(xDist)) + float((yDist * float(yDist))))) + float(0.01));\\nif ((dist > float(0.0))) {float repulsiveF = (u_K2 / float(dist));\\ndx += float(((xDist / float(dist)) * float(repulsiveF)));\\ndy += float(((yDist / float(dist)) * float(repulsiveF)));}}}\\nreturn vec2(dx,dy);}\\nvec2 calcGravity(vec4 currentNode) {\\nfloat d = sqrt(((currentNode[0] * float(currentNode[0])) + float((currentNode[1] * float(currentNode[1])))));\\nfloat gf = (((0.01 * float(u_K)) * float(u_Gravity)) * float(d));\\nreturn vec2(((gf * float(currentNode[0])) / float(d)),((gf * float(currentNode[1])) / float(d)));}\\nvec2 calcAttractive(vec4 currentNode) {\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nint arr_offset = int(floor((currentNode[2] + float(0.5))));\\nint length = int(floor((currentNode[3] + float(0.5))));\\nvec4 node_buffer;\\nfor (int p = 0; (p < int(MAX_EDGE_PER_VERTEX)); p++) {if ((p >= int(length))) {break;}\\nint arr_idx = (arr_offset + int(p));\\nint buf_offset = (arr_idx - int(((arr_idx / int(4)) * int(4))));\\nif ((p == int(0)) || (buf_offset == int(0))) {node_buffer = vec4(getDatau_Data(int((arr_idx / int(4)))));}\\nfloat float_j = ((buf_offset == int(0))) ? (node_buffer[0]) : (((buf_offset == int(1))) ? (node_buffer[1]) : (((buf_offset == int(2))) ? (node_buffer[2]) : (node_buffer[3])));\\nvec4 nextNode = getDatau_Data(int(float_j));\\nfloat xDist = (currentNode[0] - float(nextNode[0]));\\nfloat yDist = (currentNode[1] - float(nextNode[1]));\\nfloat dist = (sqrt(((xDist * float(xDist)) + float((yDist * float(yDist))))) + float(0.01));\\nfloat attractiveF = ((dist * float(dist)) / float(u_K));\\nif ((dist > float(0.0))) {dx -= float(((xDist / float(dist)) * float(attractiveF)));\\ndy -= float(((yDist / float(dist)) * float(attractiveF)));}}\\nreturn vec2(dx,dy);}\\nvoid main() {\\nivec3 workGroupSize = ivec3(1, 1, 1);\\nivec3 numWorkGroups = ivec3(218, 1, 1);     \\nint globalInvocationIndex = int(floor(v_TexCoord.x * u_OutputTextureSize.x))\\n  + int(floor(v_TexCoord.y * u_OutputTextureSize.y)) * int(u_OutputTextureSize.x);\\nint workGroupIDLength = globalInvocationIndex / (workGroupSize.x * workGroupSize.y * workGroupSize.z);\\nivec3 workGroupID = ivec3(workGroupIDLength / numWorkGroups.y / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.y);\\nint localInvocationIDZ = globalInvocationIndex / (workGroupSize.x * workGroupSize.y);\\nint localInvocationIDY = (globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y) / workGroupSize.x;\\nint localInvocationIDX = globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y - localInvocationIDY * workGroupSize.x;\\nivec3 localInvocationID = ivec3(localInvocationIDX, localInvocationIDY, localInvocationIDZ);\\nivec3 globalInvocationID = workGroupID * workGroupSize + localInvocationID;\\nint localInvocationIndex = localInvocationID.z * workGroupSize.x * workGroupSize.y\\n                + localInvocationID.y * workGroupSize.x + localInvocationID.x;\\n\\nint i = globalInvocationID.x;\\nvec4 currentNode = getDatau_Data(i);\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nif ((i >= int(VERTEX_COUNT))) {gl_FragColor = vec4(currentNode);\\nreturn ;}\\nvec2 repulsive = calcRepulsive(i,currentNode);\\ndx += float(repulsive[0]);\\ndy += float(repulsive[1]);\\nvec2 attractive = calcAttractive(currentNode);\\ndx += float(attractive[0]);\\ndy += float(attractive[1]);\\nvec2 gravity = calcGravity(currentNode);\\ndx -= float(gravity[0]);\\ndy -= float(gravity[1]);\\ndx *= float(u_Speed);\\ndy *= float(u_Speed);\\nfloat distLength = sqrt(((dx * float(dx)) + float((dy * float(dy)))));\\nif ((distLength > float(0.0))) {float limitedDist = min((u_MaxDisplace * float(u_Speed)),distLength);\\ngl_FragColor = vec4(vec4((currentNode[0] + float(((dx / float(distLength)) * float(limitedDist)))),(currentNode[1] + float(((dy / float(distLength)) * float(limitedDist)))),currentNode[2],currentNode[3]));}}\\n    "},"context":{"name":"Fruchterman","dispatch":[218,1,1],"threadGroupSize":[1,1,1],"maxIteration":8000,"defines":[{"name":"SPEED_DIVISOR","value":800,"runtime":false},{"name":"MAX_EDGE_PER_VERTEX","value":50,"runtime":true},{"name":"VERTEX_COUNT","value":218,"runtime":true}],"uniforms":[{"name":"u_Data","type":"sampler2D","format":"vec4[]","readonly":false,"writeonly":false,"size":[1,1]},{"name":"u_K","type":"float","format":"float","readonly":true,"writeonly":false,"size":[1,1]},{"name":"u_K2","type":"float","format":"float","readonly":true,"writeonly":false,"size":[1,1]},{"name":"u_Gravity","type":"float","format":"float","readonly":true,"writeonly":false,"size":[1,1]},{"name":"u_Speed","type":"float","format":"float","readonly":true,"writeonly":false,"size":[1,1]},{"name":"u_MaxDisplace","type":"float","format":"float","readonly":true,"writeonly":false,"size":[1,1]}],"globalDeclarations":[],"output":{"name":"u_Data","size":[1,1],"length":3840,"outputElementsPerTexel":4}}}',
          dispatch: [numParticles, 1, 1],
          maxIteration: MAX_ITERATION,
          onCompleted: (finalParticleData) => {
            setTimeElapsed(window.performance.now() - timeStart);
            // draw with G
            renderCircles(finalParticleData, numParticles);

            // precompiled
            // console.log(world.getPrecompiledBundle(compute));

            // 计算完成后销毁相关 GPU 资源
            world.destroy();
          },
        });

        world.setBinding(compute, 'u_Data', nodesEdgesArray);
        world.setBinding(
          compute,
          'u_K',
          Math.sqrt((numParticles * numParticles) / (numParticles + 1) / 300),
        );
        world.setBinding(
          compute,
          'u_K2',
          (numParticles * numParticles) / (numParticles + 1) / 300 / 300,
        );
        world.setBinding(compute, 'u_Gravity', 50);
        world.setBinding(compute, 'u_Speed', 0.1);
        world.setBinding(
          compute,
          'u_MaxDisplace',
          Math.sqrt(numParticles * numParticles) / 10,
        );
        world.setBinding(compute, 'MAX_EDGE_PER_VERTEX', maxEdgePerVetex);
        world.setBinding(compute, 'VERTEX_COUNT', numParticles);
      }
    })();
  }, []);

  return (
    <>
      <canvas id="application" style={{ display: 'none' }} />
      <div id="container" />
      <div>Elapsed time: {timeElapsed / 1000}s</div>
      <div>
        Ported from the same{' '}
        <a href="https://g6.antv.vision/en/examples/net/furchtermanLayout#fruchtermanWebWorker">
          example
        </a>{' '}
        in G6
      </div>
    </>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));

const CANVAS_HEIGHT = 600;
const CANVAS_WIDTH = 600;
function renderCircles(finalParticleData, numParticles) {
  const canvas = new Canvas({
    container: 'container',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  });

  // draw edges
  for (let i = 0; i < lineIndexBufferData.length; i += 2) {
    const x1 = finalParticleData[lineIndexBufferData[i] * 4];
    const y1 = finalParticleData[lineIndexBufferData[i] * 4 + 1];
    const x2 = finalParticleData[lineIndexBufferData[i + 1] * 4];
    const y2 = finalParticleData[lineIndexBufferData[i + 1] * 4 + 1];
    const group = canvas.addGroup();
    group.addShape('line', {
      attrs: {
        x1: convertWebGLCoord2Canvas(x1, CANVAS_WIDTH),
        y1: convertWebGLCoord2Canvas(y1, CANVAS_HEIGHT),
        x2: convertWebGLCoord2Canvas(x2, CANVAS_WIDTH),
        y2: convertWebGLCoord2Canvas(y2, CANVAS_HEIGHT),
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
        x: convertWebGLCoord2Canvas(x, CANVAS_WIDTH),
        y: convertWebGLCoord2Canvas(y, CANVAS_HEIGHT),
        r: 5,
        fill: 'red',
        stroke: 'blue',
        lineWidth: 2,
      },
    });
  }
}

function convertWebGLCoord2Canvas(c: number, size: number) {
  return ((c + 1) / 2) * size;
}

const lineIndexBufferData = [];
let maxEdgePerVetex;
// @see https://github.com/nblintao/ParaGraphL/blob/master/sigma.layout.paragraphl.js#L192-L229
function buildTextureData(nodes, edges) {
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
    lineIndexBufferData.push(mapIdPos[e.source], mapIdPos[e.target]);
  }

  maxEdgePerVetex = 0;
  for (i = 0; i < nodes.length; i++) {
    const offset = dataArray.length;
    const dests = nodeDict[i];
    const len = dests.length;
    dataArray[i * 4 + 2] = offset;
    dataArray[i * 4 + 3] = dests.length;
    maxEdgePerVetex = Math.max(maxEdgePerVetex, dests.length);
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
