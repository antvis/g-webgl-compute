import { World } from '@antv/g-webgpu-core';
import * as dat from 'dat.gui';
import * as React from 'react';

let stageDescriptor: any;
export default class Flocking extends React.Component {
  private gui: dat.GUI;
  private $stats: Node;
  private world: World;

  public async componentDidMount() {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      this.world = new World(canvas, {
        onInit: async (engine) => {
          const vertexShaderGLSL = `
            const vec2 pos[3] = vec2[3](vec2(0.0f, 0.5f), vec2(-0.5f, -0.5f), vec2(0.5f, -0.5f));
            void main() {
                gl_Position = vec4(pos[gl_VertexIndex], 0.0, 1.0);
            }
          `;
          const fragmentShaderGLSL = `
            layout(location = 0) out vec4 outColor;
            void main() {
                outColor = vec4(1.0, 0.0, 0.0, 1.0);
            }
          `;
          stageDescriptor = await engine.compilePipelineStageDescriptor(
            vertexShaderGLSL,
            fragmentShaderGLSL,
            null,
          );
        },
        onUpdate: async (engine) => {
          engine.clear({ r: 0.0, g: 0.0, b: 0.0, a: 1.0 }, true, true, true);
          engine.drawArraysType(
            'render',
            {
              layout: engine
                .getDevice()
                .createPipelineLayout({ bindGroupLayouts: [] }),
              ...stageDescriptor,
              primitiveTopology: 'triangle-list',
            },
            0,
            3,
            1,
          );
        },
      });
    }
  }

  public componentWillUnmount() {
    if (this.world) {
      this.world.destroy();
    }
  }

  public render() {
    return (
      <canvas
        id="application"
        width="600"
        height="600"
        style={{
          pointerEvents: 'none',
        }}
      />
    );
  }
}
