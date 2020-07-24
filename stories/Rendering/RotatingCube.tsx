// @ts-nocheck
import { World } from '@antv/g-webgpu';
import * as dat from 'dat.gui';
import { mat4, quat, vec3, vec4 } from 'gl-matrix';
import * as React from 'react';
import Stats from 'stats.js';

let meshTransform;

export default class RotatingCube extends React.Component {
  private gui: dat.GUI;
  private stats: Stats;
  private $stats: Node;
  private world: World;

  public async componentDidMount() {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      this.initStats();

      // create a world
      this.world = new World({
        canvas,
        onUpdate: () => {
          meshTransform.rotate(quat.fromEuler(quat.create(), 0, 1, 0));

          if (this.stats) {
            this.stats.update();
          }
        },
      });

      // create a camera
      const camera = this.world.createCamera({
        aspect: Math.abs(canvas.width / canvas.height),
        angle: 72,
        far: 100,
        near: 1,
      });
      this.world.getCamera(camera).setPosition(0, 5, 5);

      // create a scene
      const scene = this.world.createScene({ camera });

      // create geometry, material and attach them to mesh
      const boxGeometry = this.world.createBoxGeometry({
        halfExtents: vec3.fromValues(1, 1, 1),
      });
      const material = this.world.createBasicMaterial();
      this.world.addUniform(material, {
        binding: 1,
        name: 'color',
        format: 'float4',
        data: null,
        dirty: true,
      });

      const mesh = this.world.createMesh({
        geometry: boxGeometry,
        material,
      });
      meshTransform = this.world.getTransform(mesh);
      meshTransform.translate(vec3.fromValues(-2.5, 0, 0));

      const material2 = this.world.createBasicMaterial();
      this.world.addUniform(material2, {
        binding: 1,
        name: 'color',
        format: 'float4',
        data: null,
        dirty: true,
      });

      const mesh2 = this.world.createMesh({
        geometry: boxGeometry,
        material: material2,
      });
      const mesh2Transform = this.world.getTransform(mesh2);
      mesh2Transform.translate(vec3.fromValues(2.5, 0, 0));

      // add meshes to current scene
      this.world.add(scene, mesh);
      this.world.add(scene, mesh2);

      // GUI
      const gui = new dat.GUI();
      this.gui = gui;
      const cubeFolder = gui.addFolder('cube');

      const cube = {
        scale: 1,
        color: [255, 255, 255],
      };
      cubeFolder.add(cube, 'scale', 0.1, 5.0).onChange((size) => {
        meshTransform.localScale = vec3.fromValues(1, 1, 1);
        meshTransform.scale(vec3.fromValues(size, size, size));
      });
      cubeFolder.addColor(cube, 'color').onChange((color) => {
        this.world.setUniform(
          material,
          'color',
          vec4.fromValues(color[0] / 255, color[1] / 255, color[2] / 255, 1),
        );
      });
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
