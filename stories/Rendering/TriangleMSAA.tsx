// @ts-ignore
import { World } from '@antv/g-webgpu';
import * as dat from 'dat.gui';
import * as React from 'react';

export default class TriangleMSAA extends React.Component {
  private gui: dat.GUI;
  private $stats: Node;
  private world: World;

  public async componentDidMount() {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
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
      this.world = new World(canvas, {});

      // create a camera
      const camera = this.world.createCamera({
        aspect: Math.abs(canvas.width / canvas.height),
        angle: 72,
        far: 100,
        near: 1,
      });
      this.world.getCamera(camera)!.setPosition(0, 5, 5);

      // create a scene
      const scene = this.world.createScene({ camera });

      // create custom material
      const material = this.world.createShaderMaterial({
        vertexShader: vertexShaderGLSL,
        fragmentShader: fragmentShaderGLSL,
      });

      const geometry = this.world.createBufferGeometry();

      const mesh = this.world.createMesh({
        geometry,
        material,
      });

      this.world.add(scene, mesh);
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
