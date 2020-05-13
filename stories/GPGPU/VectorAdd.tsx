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
        //   '{"shaders":{"0":"","1":"\\n      #ifdef GL_FRAGMENT_PRECISION_HIGH\\n        precision highp float;\\n      #else\\n        precision mediump float;\\n      #endif\\n      \\n      uniform sampler2D vectorA;\\nuniform sampler2D vectorB;\\n      uniform float u_TexSize;\\n      varying vec2 v_TexCoord;\\n      \\n        vec4 getThreadData(sampler2D tex) {\\n          return texture2D(tex, vec2(v_TexCoord.s, 1));\\n        }\\n        vec4 getThreadData(sampler2D tex, float i) {\\n          return texture2D(tex, vec2((i + 0.5) / u_TexSize, 1));\\n        }\\n        vec4 getThreadData(sampler2D tex, int i) {\\n          if (i == int(floor(v_TexCoord.s * u_TexSize + 0.5))) {\\n            return texture2D(tex, vec2(v_TexCoord.s, 1));\\n          }\\n          return texture2D(tex, vec2((float(i) + 0.5) / u_TexSize, 1));\\n        }\\n      \\n\\n        vec4 setThreadData(sampler2D tex, int i, vec4 data) {\\n          return data;\\n        }\\n        vec4 setThreadData(sampler2D tex, vec4 data) {\\n          return data;\\n        }\\n        vec4 setThreadData(vec4 data) {\\n          return data;\\n        }\\n      \\n      \\n      void main() {\\n          int threadId = int(floor(v_TexCoord.s * u_TexSize + 0.5));\\n        \\nif ((threadId > THREAD_NUM)) {return ;}\\nvec4 a = getThreadData(vectorA,threadId);\\nvec4 b = getThreadData(vectorB,threadId);\\ngl_FragColor = setThreadData(vectorA,threadId,(a + vec4(b)));}\\n      "},"context":{"threadNum":2,"maxIteration":1,"defines":[{"name":"THREAD_NUM","value":2,"runtime":true}],"uniforms":[{"name":"vectorA","type":"sampler2D"},{"name":"vectorB","type":"sampler2D"}],"output":{"length":8}}}',
        shader: gCode,
        onCompleted: (result) => {
          // console.log(this.world.getPrecompiledBundle(compute));
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
          <li>ThreadNum: 2</li>
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
