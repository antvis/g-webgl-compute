// @ts-nocheck
import { World } from '@antv/g-webgpu';
import * as React from 'react';
import gCode from './g/vectoradd.glsl';

export default class VectorAdd extends React.Component {
  public state = {
    result: '',
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

      const compute = this.world.createComputePipeline({
        // precompiled: true,
        // shader:
        //   '{"shaders":{"WebGPU":"\\n      layout (\\n        local_size_x = 8,\\n        local_size_y = 1,\\n        local_size_z = 1\\n      ) in;\\n      \\n      \\n      \\n        layout(std430, set = 0, binding = 0) buffer   GWebGPUBuffer0 {\\n          vec4 vectorA[];\\n        } gWebGPUBuffer0;\\n\\n        layout(std430, set = 0, binding = 1) buffer readonly  GWebGPUBuffer1 {\\n          vec4 vectorB[];\\n        } gWebGPUBuffer1;\\n      ivec3 globalInvocationID = ivec3(gl_GlobalInvocationID);\\n      ivec3 workGroupSize = ivec3(gl_WorkGroupSize);\\n      ivec3 workGroupID = ivec3(gl_WorkGroupID);\\n      ivec3 localInvocationID = ivec3(gl_LocalInvocationID);\\n      \\n      \\n      \\n      \\n      void main() {\\nvec4 a = gWebGPUBuffer0.vectorA[globalInvocationID.x];\\nvec4 b = gWebGPUBuffer1.vectorB[globalInvocationID.x];\\ngWebGPUBuffer0.vectorA[globalInvocationID.x] = vec4((a + vec4(b)));}\\n      ","WebGL":"\\n      #ifdef GL_FRAGMENT_PRECISION_HIGH\\n        precision highp float;\\n      #else\\n        precision mediump float;\\n      #endif\\n      \\n      uniform sampler2D vectorA;\\nuniform sampler2D vectorB;\\n      uniform float u_TexSize;\\n      varying vec2 v_TexCoord;\\n      \\n    vec4 getThreadData(sampler2D tex) {\\n      return texture2D(tex, vec2(v_TexCoord.s, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, float i) {\\n      return texture2D(tex, vec2((i + 0.5) / u_TexSize, 1));\\n    }\\n    vec4 getThreadData(sampler2D tex, int i) {\\n      if (i == int(floor(v_TexCoord.s * u_TexSize + 0.5))) {\\n        return texture2D(tex, vec2(v_TexCoord.s, 1));\\n      }\\n      return texture2D(tex, vec2((float(i) + 0.5) / u_TexSize, 1));\\n    }\\n  \\n      \\n      \\n      void main() {\\nvec4 a = getThreadData(vectorA, vectorA)[globalInvocationID.x];\\nvec4 b = getThreadData(vectorB, vectorB)[globalInvocationID.x];\\ngl_FragColor[globalInvocationID.x] = vec4((a + vec4(b)));}\\n      "},"context":{"dispatch":[1,1,1],"threadGroupSize":[8,1,1],"maxIteration":1,"defines":[],"uniforms":[{"name":"vectorA","type":"sampler2D","format":"vec4[]","readonly":false,"writeonly":false},{"name":"vectorB","type":"sampler2D","format":"vec4[]","readonly":true,"writeonly":false}],"globalDeclarations":[],"output":{"name":"vectorA","length":8,"gpuBuffer":{}}}}',
        shader: gCode,
        dispatch: [1, 1, 1],
        onCompleted: (result) => {
          this.setState({
            result,
          });
          // 计算完成后销毁相关 GPU 资源
          this.world.destroy();
        },
      });

      this.world.setBinding(compute, 'vectorA', [1, 2, 3, 4, 5, 6, 7, 8]);
      this.world.setBinding(compute, 'vectorB', [1, 2, 3, 4, 5, 6, 7, 8]);
    }
  }

  public componentWillUnmount() {
    if (this.world) {
      this.world.destroy();
    }
  }

  public render() {
    const { result } = this.state;
    return (
      <>
        <h2> Add 2 Vectors</h2>
        <ul>
          <li>WorkGroup: 1</li>
          <li>Threads per WorkGroup: 8</li>
          <li>VectorA: 1, 2, 3, 4, 5, 6, 7, 8</li>
          <li>VectorB: 1, 2, 3, 4, 5, 6, 7, 8</li>
        </ul>
        <canvas id="application" style={{ display: 'none' }} />
        <div id="container" />
        Result: {result.toString()}
      </>
    );
  }
}
