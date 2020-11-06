import { Canvas } from '@antv/g-canvas';
import { World } from '@antv/g-webgpu';
import { Compiler } from '@antv/g-webgpu-compiler';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const gCode = `
import { globalInvocationID } from 'g-webgpu';

const MAX_EDGE_PER_VERTEX;
const VERTEX_COUNT;

@numthreads(1, 1, 1)
class Fruchterman {
  @in @out
  u_Data: vec4[];

  @in
  u_K: float;

  @in
  u_K2: float;
  
  @in
  u_Center: vec2;

  @in
  u_Gravity: float;

  @in
  u_ClusterGravity: float;

  @in
  u_Speed: float;

  @in
  u_MaxDisplace: float;

  @in
  u_Clustering: float;

  @in
  u_AttributeArray: vec4[];

  @in
  u_ClusterCenters: vec4[];

  calcRepulsive(i: int, currentNode: vec4): vec2 {
    let dx = 0, dy = 0;
    for (let j = 0; j < VERTEX_COUNT; j++) {
      if (i != j) {
        const nextNode = this.u_Data[j];
        const xDist = currentNode[0] - nextNode[0];
        const yDist = currentNode[1] - nextNode[1];
        const dist = (xDist * xDist + yDist * yDist) + 0.01;

        let param = this.u_K2 / dist;
        
        if (dist > 0.0) {
          dx += param * xDist ;
          dy += param * yDist ;
        }
      }
    }
    return [dx, dy];
  }

  calcGravity(currentNode: vec4, nodeAttributes: vec4): vec2 { // 
    let dx = 0, dy = 0;
    const vx = currentNode[0] - this.u_Center[0];
    const vy = currentNode[1] - this.u_Center[1];
    const gf = 0.01 * this.u_K * this.u_Gravity;
    dx = gf * vx;
    dy = gf * vy;

    if (this.u_Clustering == 1) {
      const clusterIdx = int(nodeAttributes[0]);
      const center = this.u_ClusterCenters[clusterIdx];
      const cvx = currentNode[0] - center[0];
      const cvy = currentNode[1] - center[1];
      const dist = sqrt(cvx * cvx + cvy * cvy) + 0.001;
      const parma = this.u_K * this.u_ClusterGravity / dist;
      dx += parma * cvx;
      dy += parma * cvy;
    }

    return [dx, dy];
  }

  calcAttractive(i: int, currentNode: vec4): vec2 {
    let dx = 0, dy = 0;
    const arr_offset = int(floor(currentNode[2] + 0.5));
    const length = int(floor(currentNode[3] + 0.5));
    const node_buffer: vec4;
    for (let p = 0; p < MAX_EDGE_PER_VERTEX; p++) {
      if (p >= length) break;
      const arr_idx = arr_offset + p;
      // when arr_idx % 4 == 0 update currentNodedx_buffer
      const buf_offset = arr_idx - arr_idx / 4 * 4;
      if (p == 0 || buf_offset == 0) {
        node_buffer = this.u_Data[int(arr_idx / 4)];
      }
      const float_j = buf_offset == 0 ? node_buffer[0] :
                      buf_offset == 1 ? node_buffer[1] :
                      buf_offset == 2 ? node_buffer[2] :
                                        node_buffer[3];
      const nextNode = this.u_Data[int(float_j)];
      const xDist = currentNode[0] - nextNode[0];
      const yDist = currentNode[1] - nextNode[1];
      const dist = sqrt(xDist * xDist + yDist * yDist) + 0.01;
      let attractiveF = dist / this.u_K;
    
      if (dist > 0.0) {
        dx -= xDist * attractiveF;
        dy -= yDist * attractiveF;
      }
    }
    return [dx, dy];
  }

  @main
  compute() {
    const i = globalInvocationID.x;
    const currentNode = this.u_Data[i];

    let dx = 0, dy = 0;

    if (i >= VERTEX_COUNT) {
      this.u_Data[i] = currentNode;
      return;
    }

    // repulsive
    const repulsive = this.calcRepulsive(i, currentNode);
    dx += repulsive[0];
    dy += repulsive[1];

    // attractive
    const attractive = this.calcAttractive(i, currentNode);
    dx += attractive[0];
    dy += attractive[1];

    // gravity
    const nodeAttributes = this.u_AttributeArray[i];
    const gravity = this.calcGravity(currentNode, nodeAttributes);
    dx -= gravity[0];
    dy -= gravity[1];

    // speed
    dx *= this.u_Speed;
    dy *= this.u_Speed;

    // move
    const distLength = sqrt(dx * dx + dy * dy);
    if (distLength > 0.0) {
      const limitedDist = min(this.u_MaxDisplace * this.u_Speed, distLength);

      this.u_Data[i] = [
        currentNode[0] + dx / distLength * limitedDist,
        currentNode[1] + dy / distLength * limitedDist,
        currentNode[2],
        currentNode[3]
      ];
    }
  }
}
`;

const gCode2 = `
import { globalInvocationID } from 'g-webgpu';

const VERTEX_COUNT;
const CLUSTER_COUNT;

@numthreads(1, 1, 1)
class CalcCenter {
  @in
  u_Data: vec4[];

  @in
  u_NodeAttributes: vec4[]; // [[clusterIdx, 0, 0, 0], ...]

  @in @out
  u_ClusterCenters: vec4[]; // [[cx, cy, nodeCount, clusterIdx], ...]

  @main
  compute() {
    const i = globalInvocationID.x;
    const center = this.u_ClusterCenters[i];

    let sumx = 0;
    let sumy = 0;
    let count = 0;
    for (let j = 0; j < VERTEX_COUNT; j++) {
      const attributes = this.u_NodeAttributes[j];
      const clusterIdx = int(attributes[0]);
      const vertex = this.u_Data[j];

      if (clusterIdx == i) {
        sumx += vertex.x;
        sumy += vertex.y;
        count += 1;
      }
    }

    this.u_ClusterCenters[i] = [
      sumx / count,
      sumy / count,
      count,
      i
    ];
  }
}
`;

const MAX_ITERATION = 1000;
const CANVAS_HEIGHT = 600;
const CANVAS_WIDTH = 600;
const App = React.memo(function Fruchterman() {
  const [timeElapsed, setTimeElapsed] = useState(0);
  useEffect(() => {
    (async () => {
      // @see https://g6.antv.vision/en/examples/net/forceDirected/#basicForceDirected
      const data = {
        nodes: [
          {
            id: '0',
            label: '0',
            cluster: 'a',
          },
          {
            id: '1',
            label: '1',
            cluster: 'a',
          },
          {
            id: '2',
            label: '2',
            cluster: 'a',
          },
          {
            id: '3',
            label: '3',
            cluster: 'a',
          },
          {
            id: '4',
            label: '4',
            cluster: 'a',
          },
          {
            id: '5',
            label: '5',
            cluster: 'a',
          },
          {
            id: '6',
            label: '6',
            cluster: 'a',
          },
          {
            id: '7',
            label: '7',
            cluster: 'a',
          },
          {
            id: '8',
            label: '8',
            cluster: 'a',
          },
          {
            id: '9',
            label: '9',
            cluster: 'a',
          },
          {
            id: '10',
            label: '10',
            cluster: 'a',
          },
          {
            id: '11',
            label: '11',
            cluster: 'a',
          },
          {
            id: '12',
            label: '12',
            cluster: 'a',
          },
          {
            id: '13',
            label: '13',
            cluster: 'b',
          },
          {
            id: '14',
            label: '14',
            cluster: 'b',
          },
          {
            id: '15',
            label: '15',
            cluster: 'b',
          },
          {
            id: '16',
            label: '16',
            cluster: 'b',
          },
          {
            id: '17',
            label: '17',
            cluster: 'b',
          },
          {
            id: '18',
            label: '18',
            cluster: 'c',
          },
          {
            id: '19',
            label: '19',
            cluster: 'c',
          },
          {
            id: '20',
            label: '20',
            cluster: 'c',
          },
          {
            id: '21',
            label: '21',
            cluster: 'c',
          },
          {
            id: '22',
            label: '22',
            cluster: 'c',
          },
          {
            id: '23',
            label: '23',
            cluster: 'c',
          },
          {
            id: '24',
            label: '24',
            cluster: 'c',
          },
          {
            id: '25',
            label: '25',
            cluster: 'c',
          },
          {
            id: '26',
            label: '26',
            cluster: 'c',
          },
          {
            id: '27',
            label: '27',
            cluster: 'c',
          },
          {
            id: '28',
            label: '28',
            cluster: 'c',
          },
          {
            id: '29',
            label: '29',
            cluster: 'c',
          },
          {
            id: '30',
            label: '30',
            cluster: 'c',
          },
          {
            id: '31',
            label: '31',
            cluster: 'd',
          },
          {
            id: '32',
            label: '32',
            cluster: 'd',
          },
          {
            id: '33',
            label: '33',
            cluster: 'd',
          },
        ],
        edges: [
          {
            source: '0',
            target: '1',
          },
          {
            source: '0',
            target: '2',
          },
          {
            source: '0',
            target: '3',
          },
          {
            source: '0',
            target: '4',
          },
          {
            source: '0',
            target: '5',
          },
          {
            source: '0',
            target: '7',
          },
          {
            source: '0',
            target: '8',
          },
          {
            source: '0',
            target: '9',
          },
          {
            source: '0',
            target: '10',
          },
          {
            source: '0',
            target: '11',
          },
          {
            source: '0',
            target: '13',
          },
          {
            source: '0',
            target: '14',
          },
          {
            source: '0',
            target: '15',
          },
          {
            source: '0',
            target: '16',
          },
          {
            source: '2',
            target: '3',
          },
          {
            source: '4',
            target: '5',
          },
          {
            source: '4',
            target: '6',
          },
          {
            source: '5',
            target: '6',
          },
          {
            source: '7',
            target: '13',
          },
          {
            source: '8',
            target: '14',
          },
          {
            source: '9',
            target: '10',
          },
          {
            source: '10',
            target: '22',
          },
          {
            source: '10',
            target: '14',
          },
          {
            source: '10',
            target: '12',
          },
          {
            source: '10',
            target: '24',
          },
          {
            source: '10',
            target: '21',
          },
          {
            source: '10',
            target: '20',
          },
          {
            source: '11',
            target: '24',
          },
          {
            source: '11',
            target: '22',
          },
          {
            source: '11',
            target: '14',
          },
          {
            source: '12',
            target: '13',
          },
          {
            source: '16',
            target: '17',
          },
          {
            source: '16',
            target: '18',
          },
          {
            source: '16',
            target: '21',
          },
          {
            source: '16',
            target: '22',
          },
          {
            source: '17',
            target: '18',
          },
          {
            source: '17',
            target: '20',
          },
          {
            source: '18',
            target: '19',
          },
          {
            source: '19',
            target: '20',
          },
          {
            source: '19',
            target: '33',
          },
          {
            source: '19',
            target: '22',
          },
          {
            source: '19',
            target: '23',
          },
          {
            source: '20',
            target: '21',
          },
          {
            source: '21',
            target: '22',
          },
          {
            source: '22',
            target: '24',
          },
          {
            source: '22',
            target: '25',
          },
          {
            source: '22',
            target: '26',
          },
          {
            source: '22',
            target: '23',
          },
          {
            source: '22',
            target: '28',
          },
          {
            source: '22',
            target: '30',
          },
          {
            source: '22',
            target: '31',
          },
          {
            source: '22',
            target: '32',
          },
          {
            source: '22',
            target: '33',
          },
          {
            source: '23',
            target: '28',
          },
          {
            source: '23',
            target: '27',
          },
          {
            source: '23',
            target: '29',
          },
          {
            source: '23',
            target: '30',
          },
          {
            source: '23',
            target: '31',
          },
          {
            source: '23',
            target: '33',
          },
          {
            source: '32',
            target: '33',
          },
        ],
      };

      const center = [CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2];
      const nodes = data.nodes.map((n) => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        id: n.id,
      }));
      const edges = data.edges;
      const numParticles = nodes.length;
      const nodesEdgesArray = buildTextureData(nodes, edges);
      const {
        array: attributeArray,
        count: clusterCount,
      } = attributesToTextureData('cluster', data.nodes);

      // compile our kernel code
      const compiler = new Compiler();
      const precompiledBundle = compiler.compileBundle(gCode);
      const precompiledBundle2 = compiler.compileBundle(gCode2);

      // create world
      const world = World.create({
        engineOptions: {
          supportCompute: true,
        },
      });

      const timeStart = window.performance.now();

      const area = CANVAS_HEIGHT * CANVAS_WIDTH;
      let maxDisplace = Math.sqrt(area) / 10;
      const k2 = area / (nodes.length + 1);
      const k = Math.sqrt(k2);

      const clusterCenters = [];
      for (let i = 0; i < clusterCount; i++) {
        clusterCenters.push(0, 0, 0, 0);
      }

      const kernel = world
        .createKernel(precompiledBundle)
        .setDispatch([numParticles, 1, 1])
        .setBinding({
          u_Data: nodesEdgesArray,
          u_K: k,
          u_K2: k2,
          u_Gravity: 10,
          u_ClusterGravity: 10,
          u_Speed: 0.1,
          u_MaxDisplace: maxDisplace,
          u_Clustering: 1,
          u_Center: center,
          u_AttributeArray: attributeArray,
          u_ClusterCenters: clusterCenters,
          MAX_EDGE_PER_VERTEX: maxEdgePerVetex,
          VERTEX_COUNT: numParticles,
        });

      const kernel2 = world
        .createKernel(precompiledBundle2)
        .setDispatch([clusterCount, 1, 1])
        .setBinding({
          u_Data: nodesEdgesArray,
          u_NodeAttributes: attributeArray,
          u_ClusterCenters: clusterCenters,
          VERTEX_COUNT: numParticles,
          CLUSTER_COUNT: clusterCount,
        });

      for (let i = 0; i < MAX_ITERATION; i++) {
        await kernel.execute();
        // kernel2.setBinding({
        //   u_Data: kernel,
        // });
        // await kernel2.execute();
        // kernel.setBinding({
        //   u_MaxDisplace: maxDisplace *= 0.99,
        //   u_ClusterCenters: kernel2,
        // });
      }

      const finalParticleData = await kernel.getOutput();

      setTimeElapsed(window.performance.now() - timeStart);
      // draw with G
      renderCircles(finalParticleData, numParticles);

      // 计算完成后销毁相关 GPU 资源
      world.destroy();
    })();
  }, []);

  return (
    <>
      <div>Elapsed time: {timeElapsed / 1000}s</div>
      <div>4 clusters</div>
      <div id="container" />
    </>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));

function renderCircles(finalParticleData, numParticles) {
  const canvas = new Canvas({
    container: 'container',
    center: [],
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
        x1,
        y1,
        x2,
        y2,
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
        x,
        y,
        r: 5,
        fill: 'red',
        stroke: 'blue',
        lineWidth: 2,
      },
    });
  }
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

function attributesToTextureData(clusterKey: string, nodes) {
  const dataArray = [];
  const clusterNames = [];
  nodes.forEach((node) => {
    const clusterName = node[clusterKey];
    let index = clusterNames.indexOf(clusterName);
    if (index === -1) {
      clusterNames.push(clusterName);
      index = clusterNames.length - 1;
    }
    dataArray.push(index, 0, 0, 0);
  });

  return {
    array: new Float32Array(dataArray),
    count: clusterNames.length,
  };
}
