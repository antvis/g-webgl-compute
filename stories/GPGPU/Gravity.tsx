// @ts-nocheck
import { World } from '@antv/g-webgpu';
import * as dat from 'dat.gui';
import * as React from 'react';
import computeShaderGLSL from './shaders/gravity.comp.glsl';
import fragmentShaderGLSL from './shaders/gravity.frag.glsl';
import vertexShaderGLSL from './shaders/gravity.vert.glsl';

const numParticles = 1500;

export default class Gravity extends React.Component {
  private gui: dat.GUI;
  private $stats: Node;
  private world: World;

  public async componentDidMount() {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      const vertexBufferData = new Float32Array([
        -0.01,
        -0.02,
        0.01,
        -0.02,
        0.0,
        0.02,
      ]);

      const simParamData = new Float32Array([
        0.01, // deltaT
        0.1, // noiseSize;
      ]);

      // create particle
      const initialParticleData = new Float32Array(numParticles * 4);
      for (let i = 0; i < numParticles; ++i) {
        initialParticleData[4 * i + 0] = 2 * (Math.random() - 0.5);
        initialParticleData[4 * i + 1] = 2 * (Math.random() - 0.5);
        initialParticleData[4 * i + 2] = 2 * (Math.random() - 0.5) * 0.1;
        initialParticleData[4 * i + 3] = 2 * (Math.random() - 0.5) * 0.1;
      }

      this.world = new World(canvas, {
        engineOptions: {
          supportCompute: true,
        },
      });

      const compute = this.world.createComputePipeline({
        type: 'particle',
        shader: computeShaderGLSL,
        particleCount: numParticles,
        particleData: initialParticleData,
      });

      this.world.addBinding(compute, 'simParams', simParamData, {
        binding: 2,
        type: 'uniform-buffer',
      });

      // create a camera
      const camera = this.world.createCamera({
        aspect: Math.abs(canvas.width / canvas.height),
        angle: 50,
        far: 1000,
        near: 0.1,
      });
      this.world.getCamera(camera).setPosition(0, 0, 2);

      // create a scene
      const scene = this.world.createScene({ camera });

      // create geometry, material and attach them to mesh
      const geometry = this.world.createInstancedBufferGeometry({
        maxInstancedCount: numParticles,
      });

      this.world.setAttribute(
        geometry,
        'particle',
        null,
        {
          // instanced particles buffer
          arrayStride: 4 * 4,
          stepMode: 'instance',
          attributes: [
            {
              // instance position
              shaderLocation: 0,
              offset: 0,
              format: 'float2',
            },
            {
              // instance velocity
              shaderLocation: 1,
              offset: 2 * 4,
              format: 'float2',
            },
          ],
        },
        () => this.world.getParticleBuffer(compute),
      );

      this.world.setAttribute(geometry, 'position', vertexBufferData, {
        // vertex buffer
        arrayStride: 2 * 4,
        stepMode: 'vertex',
        attributes: [
          {
            // vertex positions
            shaderLocation: 2,
            offset: 0,
            format: 'float2',
          },
        ],
      });

      const material = this.world.createShaderMaterial({
        vertexShader: vertexShaderGLSL,
        fragmentShader: fragmentShaderGLSL,
      });

      const mesh = this.world.createMesh({
        geometry,
        material,
      });

      // add meshes to current scene
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
