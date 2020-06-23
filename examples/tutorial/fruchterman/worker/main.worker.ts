// // @ts-nocheck
// import { World } from '@antv/g-webgpu';

// const gCode = `
// import { globalInvocationID } from 'g-webgpu';

// const MAX_EDGE_PER_VERTEX;
// const VERTEX_COUNT;

// @numthreads(1, 1, 1)
// class Fruchterman {
//   @in @out
//   u_Data: vec4[];

//   @in
//   u_K: float;

//   @in
//   u_K2: float;

//   @in
//   u_Gravity: float;

//   @in
//   u_Speed: float;

//   @in
//   u_MaxDisplace: float;

//   calcRepulsive(i: int, currentNode: vec4): vec2 {
//     let dx = 0, dy = 0;
//     for (let j = 0; j < VERTEX_COUNT; j++) {
//       if (i != j) {
//         const nextNode = this.u_Data[j];
//         const xDist = currentNode[0] - nextNode[0];
//         const yDist = currentNode[1] - nextNode[1];
//         const dist = sqrt(xDist * xDist + yDist * yDist) + 0.01;
//         if (dist > 0.0) {
//           const repulsiveF = this.u_K2 / dist;
//           dx += xDist / dist * repulsiveF;
//           dy += yDist / dist * repulsiveF;
//         }
//       }
//     }
//     return [dx, dy];
//   }

//   calcGravity(currentNode: vec4): vec2 {
//     const d = sqrt(currentNode[0] * currentNode[0] + currentNode[1] * currentNode[1]);
//     const gf = 0.01 * this.u_K * this.u_Gravity * d;
//     return [gf * currentNode[0] / d, gf * currentNode[1] / d];
//   }

//   calcAttractive(currentNode: vec4): vec2 {
//     let dx = 0, dy = 0;
//     const arr_offset = int(floor(currentNode[2] + 0.5));
//     const length = int(floor(currentNode[3] + 0.5));
//     const node_buffer: vec4;
//     for (let p = 0; p < MAX_EDGE_PER_VERTEX; p++) {
//       if (p >= length) break;
//       const arr_idx = arr_offset + p;
//       // when arr_idx % 4 == 0 update currentNodedx_buffer
//       const buf_offset = arr_idx - arr_idx / 4 * 4;
//       if (p == 0 || buf_offset == 0) {
//         node_buffer = this.u_Data[int(arr_idx / 4)];
//       }
//       const float_j = buf_offset == 0 ? node_buffer[0] :
//                       buf_offset == 1 ? node_buffer[1] :
//                       buf_offset == 2 ? node_buffer[2] :
//                                         node_buffer[3];
//       const nextNode = this.u_Data[int(float_j)];
//       const xDist = currentNode[0] - nextNode[0];
//       const yDist = currentNode[1] - nextNode[1];
//       const dist = sqrt(xDist * xDist + yDist * yDist) + 0.01;
//       const attractiveF = dist * dist / this.u_K;
//       if (dist > 0.0) {
//         dx -= xDist / dist * attractiveF;
//         dy -= yDist / dist * attractiveF;
//       }
//     }
//     return [dx, dy];
//   }

//   @main
//   compute() {
//     const i = globalInvocationID.x;
//     const currentNode = this.u_Data[i];

//     let dx = 0, dy = 0;

//     if (i >= VERTEX_COUNT) {
//       this.u_Data[i] = currentNode;
//       return;
//     }

//     // repulsive
//     const repulsive = this.calcRepulsive(i, currentNode);
//     dx += repulsive[0];
//     dy += repulsive[1];

//     // attractive
//     const attractive = this.calcAttractive(currentNode);
//     dx += attractive[0];
//     dy += attractive[1];

//     // gravity
//     const gravity = this.calcGravity(currentNode);
//     dx -= gravity[0];
//     dy -= gravity[1];

//     // speed
//     dx *= this.u_Speed;
//     dy *= this.u_Speed;

//     // move
//     const distLength = sqrt(dx * dx + dy * dy);
//     if (distLength > 0.0) {
//       const limitedDist = min(this.u_MaxDisplace * this.u_Speed, distLength);

//       this.u_Data[i] = [
//         currentNode[0] + dx / distLength * limitedDist,
//         currentNode[1] + dy / distLength * limitedDist,
//         currentNode[2],
//         currentNode[3]
//       ];
//     }
//   }
// }
// `;

// const ctx: Worker = self as any;

// const MAX_ITERATION = 8000;
// let maxEdgePerVetex = 0;
// const edgeIndexBufferData = [];

// // @see https://github.com/nblintao/ParaGraphL/blob/master/sigma.layout.paragraphl.js#L192-L229
// function buildTextureData(nodes, edges) {
//   const dataArray = [];
//   const nodeDict = [];
//   const mapIdPos = {};
//   let i = 0;
//   for (i = 0; i < nodes.length; i++) {
//     const n = nodes[i];
//     mapIdPos[n.id] = i;
//     dataArray.push(n.x);
//     dataArray.push(n.y);
//     dataArray.push(0);
//     dataArray.push(0);
//     nodeDict.push([]);
//   }
//   for (i = 0; i < edges.length; i++) {
//     const e = edges[i];
//     nodeDict[mapIdPos[e.source]].push(mapIdPos[e.target]);
//     nodeDict[mapIdPos[e.target]].push(mapIdPos[e.source]);
//     edgeIndexBufferData.push(mapIdPos[e.source], mapIdPos[e.target]);
//   }

//   maxEdgePerVetex = 0;
//   for (i = 0; i < nodes.length; i++) {
//     const offset = dataArray.length;
//     const dests = nodeDict[i];
//     const len = dests.length;
//     dataArray[i * 4 + 2] = offset;
//     dataArray[i * 4 + 3] = dests.length;
//     maxEdgePerVetex = Math.max(maxEdgePerVetex, dests.length);
//     for (let j = 0; j < len; ++j) {
//       const dest = dests[j];
//       dataArray.push(+dest);
//     }
//   }

//   while (dataArray.length % 4 !== 0) {
//     dataArray.push(0);
//   }
//   return new Float32Array(dataArray);
// }

// ctx.onmessage = async (evt) => {
//   // @see https://g6.antv.vision/en/examples/net/forceDirected/#basicForceDirected
//   const data = await (
//     await fetch(
//       'https://gw.alipayobjects.com/os/basement_prod/7bacd7d1-4119-4ac1-8be3-4c4b9bcbc25f.json',
//     )
//   ).json();

//   const nodes = data.nodes.map((n) => ({
//     x: (Math.random() * 2 - 1) / 10,
//     y: (Math.random() * 2 - 1) / 10,
//     id: n.id,
//   }));
//   const edges = data.edges;
//   const vertexNum = nodes.length;
//   const nodesEdgesArray = buildTextureData(nodes, edges);

//   const canvas = evt.data.canvas;
//   const world = new World({
//     canvas,
//     engineOptions: {
//       supportCompute: true,
//     },
//   });

//   const compute = world.createComputePipeline({
//     shader: gCode,
//     dispatch: [vertexNum, 1, 1],
//     maxIteration: MAX_ITERATION,
//     onCompleted: (finalParticleData) => {
//       // 传递数据给主线程
//       ctx.postMessage({
//         vertexNum,
//         vertexEdgeData: finalParticleData,
//         edgeIndexBufferData,
//       });
//       world.destroy();
//     },
//   });

//   world.setBinding(compute, 'u_Data', nodesEdgesArray);
//   world.setBinding(
//     compute,
//     'u_K',
//     Math.sqrt((vertexNum * vertexNum) / (vertexNum + 1) / 300),
//   );
//   world.setBinding(
//     compute,
//     'u_K2',
//     (vertexNum * vertexNum) / (vertexNum + 1) / 300 / 300,
//   );
//   world.setBinding(compute, 'u_Gravity', 50);
//   world.setBinding(compute, 'u_Speed', 0.1);
//   world.setBinding(
//     compute,
//     'u_MaxDisplace',
//     Math.sqrt(vertexNum * vertexNum) / 10,
//   );
//   world.setBinding(compute, 'MAX_EDGE_PER_VERTEX', maxEdgePerVetex);
//   world.setBinding(compute, 'VERTEX_COUNT', vertexNum);
// };
