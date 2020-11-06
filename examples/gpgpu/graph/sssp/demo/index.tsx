import { Canvas } from '@antv/g-canvas';
import { Kernel, World } from '@antv/g-webgpu';
import { Compiler } from '@antv/g-webgpu-compiler';
import G6 from '@antv/g6';
import { Select, Table } from 'antd';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const gCode = `
import { globalInvocationID } from 'g-webgpu';

const MAX_EDGE_PER_VERTEX;
const VERTEX_COUNT;
const MAX_DISTANCE;

@numthreads(16, 1, 1)
class BellmanFord {
  @in @out
  gData: vec4[];

  @shared(16)
  sData: vec4[];

  @main
  compute() {
    const tid = localInvocationID.x;
    const i = workGroupID.x * workGroupSize.x + localInvocationID.x;

    if (i >= VERTEX_COUNT) {
      return;
    }

    this.sData[tid] = this.gData[i];
    barrier();

    const currentNode = this.sData[tid];

    const arr_offset = floor(currentNode[2]);
    const length = floor(currentNode[3]);
    const node_buffer: vec4;
    for (let p: int = 0; p < MAX_EDGE_PER_VERTEX; p++) {
      if (p >= length) break;
      const arr_idx = arr_offset + p * 2;
      const buf_offset = arr_idx - arr_idx / 4 * 4;
      if (p == 0 || buf_offset == 0) {
        node_buffer = this.gData[int(arr_idx / 4)];
      }
      const float_j = buf_offset == 0 ? node_buffer[0] : node_buffer[2];
      const w = buf_offset == 0 ? node_buffer[1] : node_buffer[3];

      const du = this.sData[tid].x;
      const dv = this.sData[int(float_j)].x;
      let newDist = du + w;

      if (newDist < dv) {
        this.sData[int(float_j)].x = newDist;
        this.sData[int(float_j)].y = tid;
        barrier();
      }
    }

    this.gData[i].xy = this.sData[tid].xy;
  }
}
`;

const data = {
  nodes: [
    {
      id: 'A',
      label: 'A',
    },
    {
      id: 'B',
      label: 'B',
    },
    {
      id: 'C',
      label: 'C',
    },
    {
      id: 'D',
      label: 'D',
    },
    {
      id: 'E',
      label: 'E',
    },
  ],
  edges: [
    {
      source: 'A',
      target: 'B',
      value: 9,
    },
    {
      source: 'A',
      target: 'C',
      value: 4,
    },
    {
      source: 'B',
      target: 'C',
      value: 10,
    },
    {
      source: 'B',
      target: 'D',
      value: 2,
    },
    {
      source: 'B',
      target: 'E',
      value: 3,
    },
    {
      source: 'C',
      target: 'D',
      value: 2,
    },
    {
      source: 'C',
      target: 'E',
      value: 11,
    },
    {
      source: 'D',
      target: 'B',
      value: 2,
    },
    {
      source: 'E',
      target: 'D',
      value: 2,
    },
  ],
};

let kernel: Kernel;
const MAX_DISTANCE = 10000;

const App = React.memo(function BellmanFord() {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [datasource, setDatasource] = useState<
    Array<{
      destination: string;
      weight: number;
      prevPoint: string;
    }>
  >([]);

  const renderFruchterman = () => {
    const graph = new G6.Graph({
      container: 'container',
      width: 300,
      height: 300,
      modes: {
        default: ['drag-canvas', 'drag-node'],
      },
      layout: {
        type: 'fruchterman',
        gravity: 5,
        speed: 5,
      },
      animate: true,
      defaultNode: {
        size: 30,
        style: {
          lineWidth: 2,
          stroke: '#5B8FF9',
          fill: '#C6E5FF',
        },
      },
      defaultEdge: {
        size: 1,
        color: '#e2e2e2',
        style: {
          endArrow: {
            path: 'M 0,0 L 8,4 L 8,-4 Z',
            fill: '#e2e2e2',
          },
        },
      },
    });
    graph.data(data);
    graph.render();
  };

  const buildAdjacencyList = (
    nodes: Array<{
      id: string;
      label: string;
    }>,
    edges: Array<{
      source: string;
      target: string;
      value: number;
    }>,
    sourceNodeIdx: number,
  ) => {
    const adjacencyList = [];
    const nodeDict = [];
    const mapIdPos = {};
    let i = 0;
    for (i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      mapIdPos[n.id] = i;
      if (i === sourceNodeIdx) {
        adjacencyList.push(0); // distance
      } else {
        adjacencyList.push(MAX_DISTANCE); // Infinity
      }
      adjacencyList.push(-1); // predecessor
      adjacencyList.push(0); // offset
      adjacencyList.push(0); // outputing edge length
      nodeDict.push([]);
    }
    for (i = 0; i < edges.length; i++) {
      const e = edges[i];
      nodeDict[mapIdPos[e.source]].push({
        target: mapIdPos[e.target],
        weight: e.value,
      });
    }

    let maxEdgePerVertex = 0;
    for (i = 0; i < nodes.length; i++) {
      const offset = adjacencyList.length;
      const dests = nodeDict[i];
      adjacencyList[i * 4 + 2] = offset;
      adjacencyList[i * 4 + 3] = dests.length;
      maxEdgePerVertex = Math.max(maxEdgePerVertex, dests.length);
      for (const dest of dests) {
        const { target, weight } = dest;
        adjacencyList.push(target); // dest vertex index
        adjacencyList.push(weight); // edge weight
      }
    }

    while (adjacencyList.length % 4 !== 0) {
      adjacencyList.push(0);
    }
    return [new Float32Array(adjacencyList), maxEdgePerVertex];
  };

  const calcShortestPath = async (source: string) => {
    const [adjacencyList, maxEdgePerVertex] = buildAdjacencyList(
      data.nodes,
      data.edges,
      data.nodes.findIndex((n) => n.id === source),
    );
    const vertexNum = data.nodes.length;

    if (kernel) {
      const timeStart = window.performance.now();
      kernel.setBinding({
        gData: adjacencyList,
        MAX_EDGE_PER_VERTEX: maxEdgePerVertex,
        VERTEX_COUNT: data.nodes.length,
        MAX_DISTANCE,
      });

      // relax all edges |V|-1 times
      await kernel.execute(vertexNum - 1);

      const output = await kernel.getOutput();
      setTimeElapsed(window.performance.now() - timeStart);

      setDatasource(
        new Array(data.nodes.length).fill(0).map((_, i) => {
          const prevPoint = data.nodes[output[i * 4 + 1]];
          const weight = output[i * 4];

          return {
            destination: data.nodes[i].id,
            weight: weight === MAX_DISTANCE ? 'MAX' : weight,
            prevPoint: (prevPoint && prevPoint.id) || '-',
          };
        }),
      );
    }
  };

  useEffect(() => {
    (async () => {
      renderFruchterman();

      // compile our kernel code
      const compiler = new Compiler();
      const precompiledBundle = compiler.compileBundle(gCode);

      // create world
      const world = World.create({
        engineOptions: {
          supportCompute: true,
        },
      });

      const vertexNum = data.nodes.length;

      kernel = world
        .createKernel(precompiledBundle)
        .setDispatch([Math.ceil(vertexNum / 16), 1, 1]);

      await calcShortestPath('A');
    })();
  }, []);

  return (
    <>
      <div id="container" />
      <div>Elapsed time: {Math.round(timeElapsed)} ms</div>
      <div>
        Shortest path from
        <Select
          defaultValue="A"
          options={data.nodes.map((node) => ({
            value: node.id,
            label: node.label,
          }))}
          onChange={calcShortestPath}
        />
      </div>
      <Table
        rowKey="destination"
        columns={[
          {
            dataIndex: 'destination',
            title: 'destination',
          },
          {
            dataIndex: 'weight',
            title: 'weight',
          },
          {
            dataIndex: 'prevPoint',
            title: 'previous point',
          },
        ]}
        dataSource={datasource}
        pagination={false}
      />
    </>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));
