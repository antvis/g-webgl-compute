// @ts-nocheck
import { World } from '@antv/g-webgpu';
import gCode from './g/fruchterman.glsl';

const ctx: Worker = self as any;

const MAX_ITERATION = 8000;
let maxEdgePerVetex = 0;
const edgeIndexBufferData = [];

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
    edgeIndexBufferData.push(mapIdPos[e.source], mapIdPos[e.target]);
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

ctx.onmessage = async (evt) => {
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
  const vertexNum = nodes.length;
  const nodesEdgesArray = buildTextureData(nodes, edges);

  const canvas = evt.data.canvas;
  const world = new World({
    canvas,
    engineOptions: {
      supportCompute: true,
    },
  });

  const compute = world.createComputePipeline({
    shader: gCode,
    dispatch: [vertexNum, 1, 1],
    maxIteration: MAX_ITERATION,
    onCompleted: (finalParticleData) => {
      // 传递数据给主线程
      ctx.postMessage({
        vertexNum,
        vertexEdgeData: finalParticleData,
        edgeIndexBufferData,
      });
      world.destroy();
    },
  });

  world.setBinding(compute, 'u_Data', nodesEdgesArray);
  world.setBinding(
    compute,
    'u_K',
    Math.sqrt((vertexNum * vertexNum) / (vertexNum + 1) / 300),
  );
  world.setBinding(
    compute,
    'u_K2',
    (vertexNum * vertexNum) / (vertexNum + 1) / 300 / 300,
  );
  world.setBinding(compute, 'u_Gravity', 50);
  world.setBinding(compute, 'u_Speed', 0.1);
  world.setBinding(
    compute,
    'u_MaxDisplace',
    Math.sqrt(vertexNum * vertexNum) / 10,
  );
  world.setBinding(compute, 'MAX_EDGE_PER_VERTEX', maxEdgePerVetex);
  world.setBinding(compute, 'VERTEX_COUNT', vertexNum);
};
