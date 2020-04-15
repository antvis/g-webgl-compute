// @ts-nocheck
import { World } from '@antv/g-webgpu-core';
import * as dat from 'dat.gui';
import { mat4, quat, vec3, vec4 } from 'gl-matrix';
import * as React from 'react';
import Stats from 'stats.js';
import fragmentShaderGLSL from './shaders/instanced.frag.glsl';
import vertexShaderGLSL from './shaders/instanced.vert.glsl';

/**
 * ported from
 * @see https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_instancing.html
 */
export default class Instanced extends React.Component {
  private gui: dat.GUI;
  private stats: Stats;
  private $stats: Node;
  private world: World;

  public async componentDidMount() {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      this.initStats();

      const instances = 50000;

      const vector = vec4.create();
      const positions = [];
      const offsets = [];
      const colors = [];
      const orientationsStart = [];
      const orientationsEnd = [];

      positions.push(0.025, -0.025, 0);
      positions.push(-0.025, 0.025, 0);
      positions.push(0, 0, 0.025);

      // instanced attributes

      for (let i = 0; i < instances; i++) {
        // offsets
        offsets.push(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        );

        // colors
        colors.push(Math.random(), Math.random(), Math.random(), Math.random());

        // orientation start
        vec4.set(
          vector,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
        );
        vec4.normalize(vector, vector);
        orientationsStart.push(vector[0], vector[1], vector[2], vector[3]);

        // orientation end
        vec4.set(
          vector,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
        );
        vec4.normalize(vector, vector);
        orientationsEnd.push(vector[0], vector[1], vector[2], vector[3]);
      }

      // create a world
      this.world = new World(canvas, {
        onUpdate: () => {
          const time = performance.now();

          this.world.setUniform(
            material,
            'sineTime',
            Float32Array.from([Math.sin(time * 0.0005)]),
          );
          this.world.setUniform(
            material,
            'time',
            Float32Array.from([time * 0.0005]),
          );

          if (this.stats) {
            this.stats.update();
          }
        },
      });

      // create a camera
      const camera = this.world.createCamera({
        aspect: Math.abs(canvas.width / canvas.height),
        angle: 50,
        far: 10,
        near: 1,
      });
      this.world.getCamera(camera).setPosition(0, 0, 2);

      // create a scene
      const scene = this.world.createScene(camera);

      // create geometry, material and attach them to mesh
      const geometry = this.world.createInstancedBufferGeometry({
        maxInstancedCount: instances,
      });

      this.world.createAttribute(
        geometry,
        'position',
        Float32Array.from(positions),
        {
          arrayStride: 4 * 3,
          stepMode: 'vertex',
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float3',
            },
          ],
        },
      );

      this.world.createAttribute(
        geometry,
        'offset',
        Float32Array.from(offsets),
        {
          arrayStride: 4 * 3,
          stepMode: 'instance',
          attributes: [
            {
              shaderLocation: 1,
              offset: 0,
              format: 'float3',
            },
          ],
        },
      );

      this.world.createAttribute(geometry, 'color', Float32Array.from(colors), {
        arrayStride: 4 * 4,
        stepMode: 'instance',
        attributes: [
          {
            shaderLocation: 2,
            offset: 0,
            format: 'float4',
          },
        ],
      });

      this.world.createAttribute(
        geometry,
        'orientationsStart',
        Float32Array.from(orientationsStart),
        {
          arrayStride: 4 * 4,
          stepMode: 'instance',
          attributes: [
            {
              shaderLocation: 3,
              offset: 0,
              format: 'float4',
            },
          ],
        },
      );

      this.world.createAttribute(
        geometry,
        'orientationsEnd',
        Float32Array.from(orientationsEnd),
        {
          arrayStride: 4 * 4,
          stepMode: 'instance',
          attributes: [
            {
              shaderLocation: 4,
              offset: 0,
              format: 'float4',
            },
          ],
        },
      );

      const material = this.world.createShaderMaterial(
        vertexShaderGLSL,
        fragmentShaderGLSL,
      );

      this.world.addUniform(material, {
        binding: 1,
        name: 'time',
        format: 'float',
        data: null,
        dirty: true,
      });
      this.world.addUniform(material, {
        binding: 1,
        name: 'sineTime',
        format: 'float',
        data: null,
        dirty: true,
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
    if (this.$stats) {
      document.body.removeChild(this.$stats);
    }
    if (this.gui) {
      this.gui.destroy();
    }
  }

  public render() {
    return <canvas id="application" width="600" height="600" />;
  }

  private initStats() {
    this.stats = new Stats();
    this.stats.showPanel(0);
    const $stats = this.stats.dom;
    $stats.style.position = 'absolute';
    $stats.style.left = '0px';
    $stats.style.top = '0px';
    document.body.appendChild($stats);
    this.$stats = $stats;
  }
}
