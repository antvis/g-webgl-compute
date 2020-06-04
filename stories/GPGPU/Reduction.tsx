// @ts-nocheck
import { World } from '@antv/g-webgpu';
import * as React from 'react';
import gCode from './g/reduction.glsl';

export default class Reduction extends React.Component {
  public state = {
    CPUTimeElapsed: 0,
    CPUResult: 0,
    GPUTimeElapsed: 0,
    GPUResult: 0,
  };
  private world: World;

  public async componentDidMount() {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      this.world = new World(canvas, {
        engineOptions: {
          supportCompute: true,
        },
      });

      const data = new Array(1024 * 1024 * 10).fill(undefined).map((_, i) => 1);
      let timeStart = window.performance.now();
      const sum = data.reduce((cur, prev) => prev + cur, 0);
      this.setState({
        CPUTimeElapsed: window.performance.now() - timeStart,
        CPUResult: sum,
      });

      timeStart = window.performance.now();
      const compute = this.world.createComputePipeline({
        // precompiled: true,
        // shader:
        // '{"shaders":{"WebGPU":"\\n      layout (\\n        local_size_x = 1024,\\n        local_size_y = 1,\\n        local_size_z = 1\\n      ) in;\\n      \\n      \\n      \\n        layout(std430, set = 0, binding = 0) buffer readonly  GWebGPUBuffer0 {\\n          float gData[];\\n        } gWebGPUBuffer0;\\n\\n        layout(std430, set = 0, binding = 1) buffer  writeonly GWebGPUBuffer1 {\\n          float oData[];\\n        } gWebGPUBuffer1;\\n      ivec3 globalInvocationID = ivec3(gl_GlobalInvocationID);\\n      ivec3 workGroupSize = ivec3(gl_WorkGroupSize);\\n      ivec3 workGroupID = ivec3(gl_WorkGroupID);\\n      ivec3 localInvocationID = ivec3(gl_LocalInvocationID);\\n      ivec3 numWorkGroups = ivec3(gl_NumWorkGroups);\\n      shared float sData[1024];\\n      \\n      \\n\\n\\n      \\n      void main() {\\nint tid = localInvocationID.x;\\nint i = ((workGroupID.x * int(workGroupSize.x)) + int(localInvocationID.x));\\nsData[tid] = gWebGPUBuffer0.gData[i];\\nbarrier();\\nfor (int s = 1; (s < int(workGroupSize.x)); s *= int(2)) {if (((tid % int((s * int(2)))) == 0)) {sData[tid] += sData[(tid + s)];}\\nbarrier();}\\nif ((tid == int(0))) {gWebGPUBuffer1.oData[workGroupID.x] = float(sData[0]);}}\\n      ","WebGL":"\\n      #ifdef GL_FRAGMENT_PRECISION_HIGH\\n        precision highp float;\\n      #else\\n        precision mediump float;\\n      #endif\\n      \\n      uniform sampler2D gData;\\nuniform sampler2D oData;\\n      uniform float u_TexSize;\\n      varying vec2 v_TexCoord;\\n      \\n    vec4 getThreadData(sampler2D tex) {\\n      return texture2D(tex, vec2(v_TexCoord.s, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, float i) {\\n      return texture2D(tex, vec2((i + 0.5) / u_TexSize, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, int i) {\\n      if (i == int(floor(v_TexCoord.s * u_TexSize + 0.5))) {\\n        return texture2D(tex, vec2(v_TexCoord.s, 1));\\n      }\\n      return texture2D(tex, vec2((float(i) + 0.5) / u_TexSize, 1));\\n    }\\n  \\n      \\n\\n\\n      \\n      void main() {\\nint tid = localInvocationID.x;\\nint i = ((workGroupID.x * int(workGroupSize.x)) + int(localInvocationID.x));\\nthis.sData[tid] = getThreadData(gData, gData)[i];\\nbarrier();\\nfor (int s = 1; (s < int(workGroupSize.x)); s *= int(2)) {if (((tid % int((s * int(2)))) == 0)) {this.sData[tid] += this.sData[(tid + s)];}\\nbarrier();}\\nif ((tid == int(0))) {gl_FragColor[workGroupID.x] = float(this.sData[0]);}}\\n      "},"context":{"name":"Reduce","dispatch":[10240,1,1],"threadGroupSize":[1024,1,1],"maxIteration":1,"defines":[],"uniforms":[{"name":"gData","type":"sampler2D","format":"float[]","readonly":true,"writeonly":false},{"name":"oData","type":"sampler2D","format":"float[]","readonly":false,"writeonly":true}],"globalDeclarations":[{"name":"sData","type":"float[]","shared":true,"value":"1024"}],"output":{"name":"oData","length":10240,"gpuBuffer":{}}}}',
        // '{"shaders":{"WebGPU":"\\n      layout (\\n        local_size_x = 1024,\\n        local_size_y = 1,\\n        local_size_z = 1\\n      ) in;\\n      \\n      \\n      \\n        layout(std430, set = 0, binding = 0) buffer readonly  GWebGPUBuffer0 {\\n          float gData[];\\n        } gWebGPUBuffer0;\\n\\n        layout(std430, set = 0, binding = 1) buffer  writeonly GWebGPUBuffer1 {\\n          float oData[];\\n        } gWebGPUBuffer1;\\n      ivec3 globalInvocationID = ivec3(gl_GlobalInvocationID);\\n      ivec3 workGroupSize = ivec3(gl_WorkGroupSize);\\n      ivec3 workGroupID = ivec3(gl_WorkGroupID);\\n      ivec3 localInvocationID = ivec3(gl_LocalInvocationID);\\n      ivec3 numWorkGroups = ivec3(gl_NumWorkGroups);\\n      shared float sData[1024];\\n      \\n      \\n\\n\\n      \\n      void main() {\\nint tid = localInvocationID.x;\\nint i = ((workGroupID.x * int(workGroupSize.x)) + int(localInvocationID.x));\\nsData[tid] = gWebGPUBuffer0.gData[i];\\nbarrier();\\nfor (int s = 1; (s < int(workGroupSize.x)); s *= int(2)) {int index = ((2 * int(s)) * int(tid));\\nif ((index < int(workGroupSize.x))) {sData[index] += sData[(index + s)];}\\nbarrier();}\\nif ((tid == int(0))) {gWebGPUBuffer1.oData[workGroupID.x] = float(sData[0]);}}\\n      ","WebGL":"\\n      #ifdef GL_FRAGMENT_PRECISION_HIGH\\n        precision highp float;\\n      #else\\n        precision mediump float;\\n      #endif\\n      \\n      uniform sampler2D gData;\\nuniform sampler2D oData;\\n      uniform float u_TexSize;\\n      varying vec2 v_TexCoord;\\n      \\n    vec4 getThreadData(sampler2D tex) {\\n      return texture2D(tex, vec2(v_TexCoord.s, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, float i) {\\n      return texture2D(tex, vec2((i + 0.5) / u_TexSize, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, int i) {\\n      if (i == int(floor(v_TexCoord.s * u_TexSize + 0.5))) {\\n        return texture2D(tex, vec2(v_TexCoord.s, 1));\\n      }\\n      return texture2D(tex, vec2((float(i) + 0.5) / u_TexSize, 1));\\n    }\\n  \\n      \\n\\n\\n      \\n      void main() {\\nint tid = localInvocationID.x;\\nint i = ((workGroupID.x * int(workGroupSize.x)) + int(localInvocationID.x));\\nthis.sData[tid] = getThreadData(gData, gData)[i];\\nbarrier();\\nfor (int s = 1; (s < int(workGroupSize.x)); s *= int(2)) {int index = ((2 * int(s)) * int(tid));\\nif ((index < int(workGroupSize.x))) {this.sData[index] += this.sData[(index + s)];}\\nbarrier();}\\nif ((tid == int(0))) {gl_FragColor[workGroupID.x] = float(this.sData[0]);}}\\n      "},"context":{"name":"Reduce","dispatch":[10240,1,1],"threadGroupSize":[1024,1,1],"maxIteration":1,"defines":[],"uniforms":[{"name":"gData","type":"sampler2D","format":"float[]","readonly":true,"writeonly":false},{"name":"oData","type":"sampler2D","format":"float[]","readonly":false,"writeonly":true}],"globalDeclarations":[{"name":"sData","type":"float[]","shared":true,"value":"1024"}],"output":{"name":"oData","length":10240,"gpuBuffer":{}}}}',
        // '{"shaders":{"WebGPU":"\\n      layout (\\n        local_size_x = 1024,\\n        local_size_y = 1,\\n        local_size_z = 1\\n      ) in;\\n      \\n      \\n      \\n        layout(std430, set = 0, binding = 0) buffer readonly  GWebGPUBuffer0 {\\n          float gData[];\\n        } gWebGPUBuffer0;\\n\\n        layout(std430, set = 0, binding = 1) buffer  writeonly GWebGPUBuffer1 {\\n          float oData[];\\n        } gWebGPUBuffer1;\\n      ivec3 globalInvocationID = ivec3(gl_GlobalInvocationID);\\n      ivec3 workGroupSize = ivec3(gl_WorkGroupSize);\\n      ivec3 workGroupID = ivec3(gl_WorkGroupID);\\n      ivec3 localInvocationID = ivec3(gl_LocalInvocationID);\\n      ivec3 numWorkGroups = ivec3(gl_NumWorkGroups);\\n      shared float sData[1024];\\n      \\n      \\n\\n\\n      \\n      void main() {\\nint tid = localInvocationID.x;\\nint i = ((workGroupID.x * int(workGroupSize.x)) + int(localInvocationID.x));\\nsData[tid] = gWebGPUBuffer0.gData[i];\\nbarrier();\\nfor (int s = (workGroupSize.x / int(2)); (s > int(0)); s >>= int(1)) {if ((tid < int(s))) {sData[tid] += sData[(tid + s)];}\\nbarrier();}\\nif ((tid == int(0))) {gWebGPUBuffer1.oData[workGroupID.x] = float(sData[0]);}}\\n      ","WebGL":"\\n      #ifdef GL_FRAGMENT_PRECISION_HIGH\\n        precision highp float;\\n      #else\\n        precision mediump float;\\n      #endif\\n      \\n      uniform sampler2D gData;\\nuniform sampler2D oData;\\n      uniform float u_TexSize;\\n      varying vec2 v_TexCoord;\\n      \\n    vec4 getThreadData(sampler2D tex) {\\n      return texture2D(tex, vec2(v_TexCoord.s, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, float i) {\\n      return texture2D(tex, vec2((i + 0.5) / u_TexSize, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, int i) {\\n      if (i == int(floor(v_TexCoord.s * u_TexSize + 0.5))) {\\n        return texture2D(tex, vec2(v_TexCoord.s, 1));\\n      }\\n      return texture2D(tex, vec2((float(i) + 0.5) / u_TexSize, 1));\\n    }\\n  \\n      \\n\\n\\n      \\n      void main() {\\nint tid = localInvocationID.x;\\nint i = ((workGroupID.x * int(workGroupSize.x)) + int(localInvocationID.x));\\nthis.sData[tid] = getThreadData(gData, gData)[i];\\nbarrier();\\nfor (int s = (workGroupSize.x / int(2)); (s > int(0)); s >>= int(1)) {if ((tid < int(s))) {this.sData[tid] += this.sData[(tid + s)];}\\nbarrier();}\\nif ((tid == int(0))) {gl_FragColor[workGroupID.x] = float(this.sData[0]);}}\\n      "},"context":{"name":"Reduce","dispatch":[10240,1,1],"threadGroupSize":[1024,1,1],"maxIteration":1,"defines":[],"uniforms":[{"name":"gData","type":"sampler2D","format":"float[]","readonly":true,"writeonly":false},{"name":"oData","type":"sampler2D","format":"float[]","readonly":false,"writeonly":true}],"globalDeclarations":[{"name":"sData","type":"float[]","shared":true,"value":"1024"}],"output":{"name":"oData","length":10240,"gpuBuffer":{}}}}',
        // '{"shaders":{"WebGPU":"\\n      layout (\\n        local_size_x = 1024,\\n        local_size_y = 1,\\n        local_size_z = 1\\n      ) in;\\n      \\n      \\n      \\n        layout(std430, set = 0, binding = 0) buffer readonly  GWebGPUBuffer0 {\\n          float gData[];\\n        } gWebGPUBuffer0;\\n\\n        layout(std430, set = 0, binding = 1) buffer  writeonly GWebGPUBuffer1 {\\n          float oData[];\\n        } gWebGPUBuffer1;\\n      ivec3 globalInvocationID = ivec3(gl_GlobalInvocationID);\\n      ivec3 workGroupSize = ivec3(gl_WorkGroupSize);\\n      ivec3 workGroupID = ivec3(gl_WorkGroupID);\\n      ivec3 localInvocationID = ivec3(gl_LocalInvocationID);\\n      ivec3 numWorkGroups = ivec3(gl_NumWorkGroups);\\n      shared float sData[1024];\\n      \\n      \\n\\n\\n      \\n      void main() {\\nint tid = localInvocationID.x;\\nint i = (((workGroupID.x * int(workGroupSize.x)) * int(2)) + int(localInvocationID.x));\\nsData[tid] = (gWebGPUBuffer0.gData[i] + gWebGPUBuffer0.gData[(i + workGroupSize.x)]);\\nbarrier();\\nfor (int s = (workGroupSize.x / int(2)); (s > int(0)); s >>= int(1)) {if ((tid < int(s))) {sData[tid] += sData[(tid + s)];}\\nbarrier();}\\nif ((tid == int(0))) {gWebGPUBuffer1.oData[workGroupID.x] = float(sData[0]);}}\\n      ","WebGL":"\\n      #ifdef GL_FRAGMENT_PRECISION_HIGH\\n        precision highp float;\\n      #else\\n        precision mediump float;\\n      #endif\\n      \\n      uniform sampler2D gData;\\nuniform sampler2D oData;\\n      uniform float u_TexSize;\\n      varying vec2 v_TexCoord;\\n      \\n    vec4 getThreadData(sampler2D tex) {\\n      return texture2D(tex, vec2(v_TexCoord.s, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, float i) {\\n      return texture2D(tex, vec2((i + 0.5) / u_TexSize, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, int i) {\\n      if (i == int(floor(v_TexCoord.s * u_TexSize + 0.5))) {\\n        return texture2D(tex, vec2(v_TexCoord.s, 1));\\n      }\\n      return texture2D(tex, vec2((float(i) + 0.5) / u_TexSize, 1));\\n    }\\n  \\n      \\n\\n\\n      \\n      void main() {\\nint tid = localInvocationID.x;\\nint i = (((workGroupID.x * int(workGroupSize.x)) * int(2)) + int(localInvocationID.x));\\nthis.sData[tid] = (gl_FragColor[i] + getThreadData(gData, gData)[(i + workGroupSize.x)]);\\nbarrier();\\nfor (int s = (workGroupSize.x / int(2)); (s > int(0)); s >>= int(1)) {if ((tid < int(s))) {this.sData[tid] += this.sData[(tid + s)];}\\nbarrier();}\\nif ((tid == int(0))) {gl_FragColor[workGroupID.x] = float(this.sData[0]);}}\\n      "},"context":{"name":"Reduce","dispatch":[5120,1,1],"threadGroupSize":[1024,1,1],"maxIteration":1,"defines":[],"uniforms":[{"name":"gData","type":"sampler2D","format":"float[]","readonly":true,"writeonly":false},{"name":"oData","type":"sampler2D","format":"float[]","readonly":false,"writeonly":true}],"globalDeclarations":[{"name":"sData","type":"float[]","shared":true,"value":"1024"}],"output":{"name":"oData","length":5120,"gpuBuffer":{}}}}',
        shader: gCode,
        dispatch: [1024 * 5, 1, 1],
        onCompleted: (result) => {
          // console.log(this.world.getPrecompiledBundle(compute));
          this.setState({
            GPUTimeElapsed: window.performance.now() - timeStart,
            GPUResult: result.reduce((cur, prev) => prev + cur, 0),
          });
          // 计算完成后销毁相关 GPU 资源
          this.world.destroy();
        },
      });

      this.world.setBinding(compute, 'gData', data);
    }
  }

  public componentWillUnmount() {
    if (this.world) {
      this.world.destroy();
    }
  }

  public render() {
    const { CPUTimeElapsed, GPUTimeElapsed, CPUResult, GPUResult } = this.state;
    return (
      <>
        <h2>Reduce Sum (1024 * 1024 * 10 elements)</h2>
        <ul>
          <li>CPU time elapsed: {CPUTimeElapsed}</li>
          <li>GPU time elapsed: {GPUTimeElapsed}</li>
          <li>CPUResult: {CPUResult}</li>
          <li>GPUResult: {GPUResult}</li>
        </ul>
        <canvas id="application" style={{ display: 'none' }} />
      </>
    );
  }
}
