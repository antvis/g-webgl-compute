import { Canvas } from '@antv/g-canvas';
import { World } from '@antv/g-webgpu';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const MAX_ITERATION = 1000;
const CANVAS_HEIGHT = 600;
const CANVAS_WIDTH = 600;
const App = React.memo(function Fruchterman() {
  const [timeElapsed, setTimeElapsed] = useState(0);
  useEffect(() => {
    (async () => {
      // @see https://g6.antv.vision/en/examples/net/forceDirected/#basicForceDirected
      const data = await (
        await fetch(
          'https://gw.alipayobjects.com/os/basement_prod/7bacd7d1-4119-4ac1-8be3-4c4b9bcbc25f.json',
        )
      ).json();

      const center = [CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2];
      const nodes = data.nodes.map((n) => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        id: n.id,
      }));
      const edges = data.edges;
      const numParticles = nodes.length;
      const nodesEdgesArray = buildTextureData(nodes, edges);

      const precompiledBundle = `{"shaders":{"WGSL":"import \\"GLSL.std.450\\" as std;\\n\\n\\n# var gWebGPUDebug : bool = false;\\n# var gWebGPUDebugOutput : vec4<f32> = vec4<f32>(0.0);\\n\\n[[builtin global_invocation_id]] var<in> globalInvocationID : vec3<u32>;\\n# [[builtin work_group_size]] var<in> workGroupSize : vec3<u32>;\\n# [[builtin work_group_id]] var<in> workGroupID : vec3<u32>;\\n[[builtin local_invocation_id]] var<in> localInvocationID : vec3<u32>;\\n# [[builtin num_work_groups]] var<in> numWorkGroups : vec3<u32>;\\n[[builtin local_invocation_idx]] var<in> localInvocationIndex : u32;\\n\\ntype GWebGPUParams = [[block]] struct {\\n  [[offset 0]] u_K : f32;\\n  [[offset 4]] u_K2 : f32;\\n  [[offset 8]] u_Gravity : f32;\\n  [[offset 12]] u_Center : vec2<f32>;\\n  [[offset 20]] u_Speed : f32;\\n  [[offset 24]] u_MaxDisplace : f32;\\n};\\n[[binding 0, set 0]] var<uniform> gWebGPUUniformParams : GWebGPUParams;\\ntype GWebGPUBuffer0 = [[block]] struct {\\n  [[offset 0]] u_Data : [[stride 16]] array<vec4<f32>>;\\n};\\n[[binding 1, set 0]] var<storage_buffer> gWebGPUBuffer0 : GWebGPUBuffer0;\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nfn calcRepulsive(i : i32, currentNode : vec4<f32>) -> vec2<f32> {var dx : f32 = 0.0;\\nvar dy : f32 = 0.0;\\nfor (var j : i32 = 0; j < __DefineValuePlaceholder__VERTEX_COUNT; j = j + 1) {if (i != j) {var nextNode : vec4<f32> = gWebGPUBuffer0.u_Data[j];\\nvar xDist : f32 = currentNode.x - nextNode.x;\\nvar yDist : f32 = currentNode.y - nextNode.y;\\nvar dist : f32 = std::sqrt((xDist * xDist) + (yDist * yDist)) + 0.01;\\nif (dist > 0.0) {var repulsiveF : f32 = gWebGPUUniformParams.u_K2 / dist;\\ndx = dx + (xDist / dist) * repulsiveF;\\ndy = dy + (yDist / dist) * repulsiveF;}}}\\nreturn vec2<f32>(dx, dy);}\\nfn calcGravity(currentNode : vec4<f32>) -> vec2<f32> {var dx : f32 = 0.0;\\nvar dy : f32 = 0.0;\\nvar vx : f32 = currentNode.x - gWebGPUUniformParams.u_Center.x;\\nvar vy : f32 = currentNode.y - gWebGPUUniformParams.u_Center.y;\\nvar gf : f32 = (0.01 * gWebGPUUniformParams.u_K) * gWebGPUUniformParams.u_Gravity;\\ndx = gf * vx;\\ndy = gf * vy;\\nreturn vec2<f32>(dx, dy);}\\nfn calcAttractive(currentNode : vec4<f32>) -> vec2<f32> {var dx : f32 = 0.0;\\nvar dy : f32 = 0.0;\\nvar arr_offset : i32 = i32(std::floor(currentNode.z + 0.5));\\nvar length : i32 = i32(std::floor(currentNode.w + 0.5));\\nvar node_buffer : vec4<f32>;\\nfor (var p : i32 = 0; p < __DefineValuePlaceholder__MAX_EDGE_PER_VERTEX; p = p + 1) {if (p >= length) {break;}\\nvar arr_idx : i32 = arr_offset + i32(p);\\nvar buf_offset : i32 = arr_idx - ((arr_idx / 4) * 4);\\nif ((p == 0) || (buf_offset == 0)) {node_buffer = gWebGPUBuffer0.u_Data[i32(arr_idx / 4)];}\\nvar float_j : f32 = select(node_buffer.x, select(node_buffer.y, select(node_buffer.z, node_buffer.w, buf_offset == 2), buf_offset == 1), buf_offset == 0);\\nvar nextNode : vec4<f32> = gWebGPUBuffer0.u_Data[i32(float_j)];\\nvar xDist : f32 = currentNode.x - nextNode.x;\\nvar yDist : f32 = currentNode.y - nextNode.y;\\nvar dist : f32 = std::sqrt((xDist * xDist) + (yDist * yDist)) + 0.01;\\nvar attractiveF : f32 = (dist * dist) / gWebGPUUniformParams.u_K;\\nif (dist > 0.0) {dx = dx - (xDist / dist) * attractiveF;\\ndy = dy - (yDist / dist) * attractiveF;}}\\nreturn vec2<f32>(dx, dy);}\\nfn main() -> void {var i : i32 = globalInvocationID.x;\\nvar currentNode : vec4<f32> = gWebGPUBuffer0.u_Data[i];\\nvar dx : f32 = 0.0;\\nvar dy : f32 = 0.0;\\nif (i >= __DefineValuePlaceholder__VERTEX_COUNT) {gWebGPUBuffer0.u_Data[i] = currentNode;\\nreturn ;}\\nvar repulsive : vec2<f32> = calcRepulsive(i, currentNode);\\ndx = dx + repulsive.x;\\ndy = dy + repulsive.y;\\nvar attractive : vec2<f32> = calcAttractive(currentNode);\\ndx = dx + attractive.x;\\ndy = dy + attractive.y;\\nvar gravity : vec2<f32> = calcGravity(currentNode);\\ndx = dx - gravity.x;\\ndy = dy - gravity.y;\\ndx = dx * gWebGPUUniformParams.u_Speed;\\ndy = dy * gWebGPUUniformParams.u_Speed;\\nvar distLength : f32 = std::sqrt((dx * dx) + (dy * dy));\\nif (distLength > 0.0) {var limitedDist : f32 = std::min(gWebGPUUniformParams.u_MaxDisplace * gWebGPUUniformParams.u_Speed, distLength);\\ngWebGPUBuffer0.u_Data[i] = vec4<f32>(currentNode.x + ((dx / distLength) * limitedDist), currentNode.y + ((dy / distLength) * limitedDist), currentNode.z, currentNode.w);}\\nreturn;}\\n\\nentry_point compute as \\"main\\" = main;\\n","GLSL450":"\\n\\n\\nbool gWebGPUDebug = false;\\nvec4 gWebGPUDebugOutput = vec4(0.0);\\n\\nivec3 globalInvocationID = ivec3(gl_GlobalInvocationID);\\nivec3 workGroupSize = ivec3(1,1,1);\\nivec3 workGroupID = ivec3(gl_WorkGroupID);\\nivec3 localInvocationID = ivec3(gl_LocalInvocationID);\\nivec3 numWorkGroups = ivec3(gl_NumWorkGroups);\\nint localInvocationIndex = int(gl_LocalInvocationIndex);\\n\\nlayout(std140, set = 0, binding = 0) uniform GWebGPUParams {\\n  float u_K;\\n  float u_K2;\\n  float u_Gravity;\\n  vec2 u_Center;\\n  float u_Speed;\\n  float u_MaxDisplace;\\n} gWebGPUUniformParams;\\nlayout(std430, set = 0, binding = 1) buffer   GWebGPUBuffer0 {\\n  vec4 u_Data[];\\n} gWebGPUBuffer0;\\n\\n\\n\\n#define MAX_EDGE_PER_VERTEX __DefineValuePlaceholder__MAX_EDGE_PER_VERTEX\\n#define VERTEX_COUNT __DefineValuePlaceholder__VERTEX_COUNT\\nlayout (\\n  local_size_x = 1,\\n  local_size_y = 1,\\n  local_size_z = 1\\n) in;\\n\\n\\n\\n\\n\\n\\n\\nvec2 calcRepulsive(int i, vec4 currentNode) {float dx = 0.0;\\nfloat dy = 0.0;\\nfor (int j = 0; j < VERTEX_COUNT; j++) {if (i != j) {vec4 nextNode = gWebGPUBuffer0.u_Data[j];\\nfloat xDist = currentNode.x - nextNode.x;\\nfloat yDist = currentNode.y - nextNode.y;\\nfloat dist = sqrt((xDist * xDist) + (yDist * yDist)) + 0.01;\\nif (dist > 0.0) {float repulsiveF = gWebGPUUniformParams.u_K2 / dist;\\ndx += (xDist / dist) * repulsiveF;\\ndy += (yDist / dist) * repulsiveF;}}}\\nreturn vec2(dx, dy);}\\nvec2 calcGravity(vec4 currentNode) {float dx = 0.0;\\nfloat dy = 0.0;\\nfloat vx = currentNode.x - gWebGPUUniformParams.u_Center.x;\\nfloat vy = currentNode.y - gWebGPUUniformParams.u_Center.y;\\nfloat gf = (0.01 * gWebGPUUniformParams.u_K) * gWebGPUUniformParams.u_Gravity;\\ndx = gf * vx;\\ndy = gf * vy;\\nreturn vec2(dx, dy);}\\nvec2 calcAttractive(vec4 currentNode) {float dx = 0.0;\\nfloat dy = 0.0;\\nint arr_offset = int(floor(currentNode.z + 0.5));\\nint length = int(floor(currentNode.w + 0.5));\\nvec4 node_buffer;\\nfor (int p = 0; p < MAX_EDGE_PER_VERTEX; p++) {if (p >= length) {break;}\\nint arr_idx = arr_offset + int(p);\\nint buf_offset = arr_idx - ((arr_idx / 4) * 4);\\nif ((p == 0) || (buf_offset == 0)) {node_buffer = gWebGPUBuffer0.u_Data[int(arr_idx / 4)];}\\nfloat float_j = (buf_offset == 0) ? (node_buffer.x) : ((buf_offset == 1) ? (node_buffer.y) : ((buf_offset == 2) ? (node_buffer.z) : (node_buffer.w)));\\nvec4 nextNode = gWebGPUBuffer0.u_Data[int(float_j)];\\nfloat xDist = currentNode.x - nextNode.x;\\nfloat yDist = currentNode.y - nextNode.y;\\nfloat dist = sqrt((xDist * xDist) + (yDist * yDist)) + 0.01;\\nfloat attractiveF = (dist * dist) / gWebGPUUniformParams.u_K;\\nif (dist > 0.0) {dx -= (xDist / dist) * attractiveF;\\ndy -= (yDist / dist) * attractiveF;}}\\nreturn vec2(dx, dy);}\\nvoid main() {int i = globalInvocationID.x;\\nvec4 currentNode = gWebGPUBuffer0.u_Data[i];\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nif (i >= VERTEX_COUNT) {gWebGPUBuffer0.u_Data[i] = currentNode;\\nreturn ;}\\nvec2 repulsive = calcRepulsive(i, currentNode);\\ndx += repulsive.x;\\ndy += repulsive.y;\\nvec2 attractive = calcAttractive(currentNode);\\ndx += attractive.x;\\ndy += attractive.y;\\nvec2 gravity = calcGravity(currentNode);\\ndx -= gravity.x;\\ndy -= gravity.y;\\ndx *= gWebGPUUniformParams.u_Speed;\\ndy *= gWebGPUUniformParams.u_Speed;\\nfloat distLength = sqrt((dx * dx) + (dy * dy));\\nif (distLength > 0.0) {float limitedDist = min(gWebGPUUniformParams.u_MaxDisplace * gWebGPUUniformParams.u_Speed, distLength);\\ngWebGPUBuffer0.u_Data[i] = vec4(currentNode.x + ((dx / distLength) * limitedDist), currentNode.y + ((dy / distLength) * limitedDist), currentNode.z, currentNode.w);}}\\n","GLSL100":"\\n\\nfloat epsilon = 0.00001;\\nvec2 addrTranslation_1Dto2D(float address1D, vec2 texSize) {\\n  vec2 conv_const = vec2(1.0 / texSize.x, 1.0 / (texSize.x * texSize.y));\\n  vec2 normAddr2D = float(address1D) * conv_const;\\n  return vec2(fract(normAddr2D.x + epsilon), normAddr2D.y);\\n}\\n\\nvoid barrier() {}\\n  \\n\\nuniform vec2 u_OutputTextureSize;\\nuniform int u_OutputTexelCount;\\nvarying vec2 v_TexCoord;\\n\\nbool gWebGPUDebug = false;\\nvec4 gWebGPUDebugOutput = vec4(0.0);\\n\\n#define MAX_EDGE_PER_VERTEX __DefineValuePlaceholder__MAX_EDGE_PER_VERTEX\\n#define VERTEX_COUNT __DefineValuePlaceholder__VERTEX_COUNT\\n\\nuniform sampler2D u_Data;\\nuniform vec2 u_DataSize;\\nvec4 getDatau_Data(vec2 address2D) {\\n  return vec4(texture2D(u_Data, address2D).rgba);\\n}\\nvec4 getDatau_Data(float address1D) {\\n  return getDatau_Data(addrTranslation_1Dto2D(address1D, u_DataSize));\\n}\\nvec4 getDatau_Data(int address1D) {\\n  return getDatau_Data(float(address1D));\\n}\\nuniform float u_K;\\nuniform float u_K2;\\nuniform float u_Gravity;\\nuniform vec2 u_Center;\\nuniform float u_Speed;\\nuniform float u_MaxDisplace;\\nvec2 calcRepulsive(int i, vec4 currentNode) {\\nivec3 workGroupSize = ivec3(1, 1, 1);\\nivec3 numWorkGroups = ivec3(1, 1, 1);     \\nint globalInvocationIndex = int(floor(v_TexCoord.x * u_OutputTextureSize.x))\\n  + int(floor(v_TexCoord.y * u_OutputTextureSize.y)) * int(u_OutputTextureSize.x);\\nint workGroupIDLength = globalInvocationIndex / (workGroupSize.x * workGroupSize.y * workGroupSize.z);\\nivec3 workGroupID = ivec3(workGroupIDLength / numWorkGroups.y / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.y);\\nint localInvocationIDZ = globalInvocationIndex / (workGroupSize.x * workGroupSize.y);\\nint localInvocationIDY = (globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y) / workGroupSize.x;\\nint localInvocationIDX = globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y - localInvocationIDY * workGroupSize.x;\\nivec3 localInvocationID = ivec3(localInvocationIDX, localInvocationIDY, localInvocationIDZ);\\nivec3 globalInvocationID = workGroupID * workGroupSize + localInvocationID;\\nint localInvocationIndex = localInvocationID.z * workGroupSize.x * workGroupSize.y\\n                + localInvocationID.y * workGroupSize.x + localInvocationID.x;\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nfor (int j = 0; j < VERTEX_COUNT; j++) {if (i != j) {vec4 nextNode = getDatau_Data(j);\\nfloat xDist = currentNode.x - nextNode.x;\\nfloat yDist = currentNode.y - nextNode.y;\\nfloat dist = sqrt((xDist * xDist) + (yDist * yDist)) + 0.01;\\nif (dist > 0.0) {float repulsiveF = u_K2 / dist;\\ndx += (xDist / dist) * repulsiveF;\\ndy += (yDist / dist) * repulsiveF;}}}\\nreturn vec2(dx, dy);}\\nvec2 calcGravity(vec4 currentNode) {\\nivec3 workGroupSize = ivec3(1, 1, 1);\\nivec3 numWorkGroups = ivec3(1, 1, 1);     \\nint globalInvocationIndex = int(floor(v_TexCoord.x * u_OutputTextureSize.x))\\n  + int(floor(v_TexCoord.y * u_OutputTextureSize.y)) * int(u_OutputTextureSize.x);\\nint workGroupIDLength = globalInvocationIndex / (workGroupSize.x * workGroupSize.y * workGroupSize.z);\\nivec3 workGroupID = ivec3(workGroupIDLength / numWorkGroups.y / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.y);\\nint localInvocationIDZ = globalInvocationIndex / (workGroupSize.x * workGroupSize.y);\\nint localInvocationIDY = (globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y) / workGroupSize.x;\\nint localInvocationIDX = globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y - localInvocationIDY * workGroupSize.x;\\nivec3 localInvocationID = ivec3(localInvocationIDX, localInvocationIDY, localInvocationIDZ);\\nivec3 globalInvocationID = workGroupID * workGroupSize + localInvocationID;\\nint localInvocationIndex = localInvocationID.z * workGroupSize.x * workGroupSize.y\\n                + localInvocationID.y * workGroupSize.x + localInvocationID.x;\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nfloat vx = currentNode.x - u_Center.x;\\nfloat vy = currentNode.y - u_Center.y;\\nfloat gf = (0.01 * u_K) * u_Gravity;\\ndx = gf * vx;\\ndy = gf * vy;\\nreturn vec2(dx, dy);}\\nvec2 calcAttractive(vec4 currentNode) {\\nivec3 workGroupSize = ivec3(1, 1, 1);\\nivec3 numWorkGroups = ivec3(1, 1, 1);     \\nint globalInvocationIndex = int(floor(v_TexCoord.x * u_OutputTextureSize.x))\\n  + int(floor(v_TexCoord.y * u_OutputTextureSize.y)) * int(u_OutputTextureSize.x);\\nint workGroupIDLength = globalInvocationIndex / (workGroupSize.x * workGroupSize.y * workGroupSize.z);\\nivec3 workGroupID = ivec3(workGroupIDLength / numWorkGroups.y / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.y);\\nint localInvocationIDZ = globalInvocationIndex / (workGroupSize.x * workGroupSize.y);\\nint localInvocationIDY = (globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y) / workGroupSize.x;\\nint localInvocationIDX = globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y - localInvocationIDY * workGroupSize.x;\\nivec3 localInvocationID = ivec3(localInvocationIDX, localInvocationIDY, localInvocationIDZ);\\nivec3 globalInvocationID = workGroupID * workGroupSize + localInvocationID;\\nint localInvocationIndex = localInvocationID.z * workGroupSize.x * workGroupSize.y\\n                + localInvocationID.y * workGroupSize.x + localInvocationID.x;\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nint arr_offset = int(floor(currentNode.z + 0.5));\\nint length = int(floor(currentNode.w + 0.5));\\nvec4 node_buffer;\\nfor (int p = 0; p < MAX_EDGE_PER_VERTEX; p++) {if (p >= length) {break;}\\nint arr_idx = arr_offset + int(p);\\nint buf_offset = arr_idx - ((arr_idx / 4) * 4);\\nif ((p == 0) || (buf_offset == 0)) {node_buffer = getDatau_Data(int(arr_idx / 4));}\\nfloat float_j = (buf_offset == 0) ? (node_buffer.x) : ((buf_offset == 1) ? (node_buffer.y) : ((buf_offset == 2) ? (node_buffer.z) : (node_buffer.w)));\\nvec4 nextNode = getDatau_Data(int(float_j));\\nfloat xDist = currentNode.x - nextNode.x;\\nfloat yDist = currentNode.y - nextNode.y;\\nfloat dist = sqrt((xDist * xDist) + (yDist * yDist)) + 0.01;\\nfloat attractiveF = (dist * dist) / u_K;\\nif (dist > 0.0) {dx -= (xDist / dist) * attractiveF;\\ndy -= (yDist / dist) * attractiveF;}}\\nreturn vec2(dx, dy);}\\nvoid main() {\\nivec3 workGroupSize = ivec3(1, 1, 1);\\nivec3 numWorkGroups = ivec3(1, 1, 1);     \\nint globalInvocationIndex = int(floor(v_TexCoord.x * u_OutputTextureSize.x))\\n  + int(floor(v_TexCoord.y * u_OutputTextureSize.y)) * int(u_OutputTextureSize.x);\\nint workGroupIDLength = globalInvocationIndex / (workGroupSize.x * workGroupSize.y * workGroupSize.z);\\nivec3 workGroupID = ivec3(workGroupIDLength / numWorkGroups.y / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.z, workGroupIDLength / numWorkGroups.x / numWorkGroups.y);\\nint localInvocationIDZ = globalInvocationIndex / (workGroupSize.x * workGroupSize.y);\\nint localInvocationIDY = (globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y) / workGroupSize.x;\\nint localInvocationIDX = globalInvocationIndex - localInvocationIDZ * workGroupSize.x * workGroupSize.y - localInvocationIDY * workGroupSize.x;\\nivec3 localInvocationID = ivec3(localInvocationIDX, localInvocationIDY, localInvocationIDZ);\\nivec3 globalInvocationID = workGroupID * workGroupSize + localInvocationID;\\nint localInvocationIndex = localInvocationID.z * workGroupSize.x * workGroupSize.y\\n                + localInvocationID.y * workGroupSize.x + localInvocationID.x;\\nint i = globalInvocationID.x;\\nvec4 currentNode = getDatau_Data(i);\\nfloat dx = 0.0;\\nfloat dy = 0.0;\\nif (i >= VERTEX_COUNT) {gl_FragColor = vec4(currentNode);\\nreturn ;}\\nvec2 repulsive = calcRepulsive(i, currentNode);\\ndx += repulsive.x;\\ndy += repulsive.y;\\nvec2 attractive = calcAttractive(currentNode);\\ndx += attractive.x;\\ndy += attractive.y;\\nvec2 gravity = calcGravity(currentNode);\\ndx -= gravity.x;\\ndy -= gravity.y;\\ndx *= u_Speed;\\ndy *= u_Speed;\\nfloat distLength = sqrt((dx * dx) + (dy * dy));\\nif (distLength > 0.0) {float limitedDist = min(u_MaxDisplace * u_Speed, distLength);\\ngl_FragColor = vec4(vec4(currentNode.x + ((dx / distLength) * limitedDist), currentNode.y + ((dy / distLength) * limitedDist), currentNode.z, currentNode.w));}if (gWebGPUDebug) {\\n  gl_FragColor = gWebGPUDebugOutput;\\n}}\\n"},"context":{"name":"","dispatch":[1,1,1],"threadGroupSize":[1,1,1],"maxIteration":1,"defines":[{"name":"MAX_EDGE_PER_VERTEX","type":"Float","runtime":true},{"name":"VERTEX_COUNT","type":"Float","runtime":true}],"uniforms":[{"name":"u_Data","type":"vec4<f32>[]","storageClass":"StorageBuffer","readonly":false,"writeonly":false,"size":[1,1]},{"name":"u_K","type":"Float","storageClass":"Uniform","readonly":true,"writeonly":false,"size":[1,1]},{"name":"u_K2","type":"Float","storageClass":"Uniform","readonly":true,"writeonly":false,"size":[1,1]},{"name":"u_Gravity","type":"Float","storageClass":"Uniform","readonly":true,"writeonly":false,"size":[1,1]},{"name":"u_Center","type":"vec2<f32>","storageClass":"Uniform","readonly":true,"writeonly":false,"size":[1,1]},{"name":"u_Speed","type":"Float","storageClass":"Uniform","readonly":true,"writeonly":false,"size":[1,1]},{"name":"u_MaxDisplace","type":"Float","storageClass":"Uniform","readonly":true,"writeonly":false,"size":[1,1]}],"globalDeclarations":[],"output":{"name":"u_Data","size":[1,1],"length":1},"needPingpong":true}}`

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
      const kernel = world
        .createKernel(precompiledBundle)
        .setDispatch([numParticles, 1, 1])
        .setBinding({
          u_Data: nodesEdgesArray,
          u_K: k,
          u_K2: k2,
          u_Gravity: 10,
          u_Speed: 0.1,
          u_MaxDisplace: maxDisplace,
          u_Center: center,
          MAX_EDGE_PER_VERTEX: maxEdgePerVetex,
          VERTEX_COUNT: numParticles,
        });

      for (let i = 0; i < MAX_ITERATION; i++) {
        await kernel.execute();
        kernel.setBinding({
          u_MaxDisplace: maxDisplace *= 0.99,
        });
      }
      // or use batch:
      // await kernel.execute(MAX_ITERATION);

      const finalParticleData = await kernel.getOutput();

      setTimeElapsed(window.performance.now() - timeStart);
      // draw with G
      renderCircles(finalParticleData, numParticles);

      window.gwebgpuClean = () => {
        world.destroy();
      };
    })();
  }, []);

  return (
    <>
      <div>Elapsed time: {timeElapsed / 1000}s</div>
      <div>
        Ported from the same{' '}
        <a href="https://g6.antv.vision/en/examples/net/furchtermanLayout#fruchtermanWebWorker">
          example
        </a>{' '}
        in G6
      </div>
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
