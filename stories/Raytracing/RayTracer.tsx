// @ts-nocheck
import { RayTracer } from '@antv/g-webgpu-raytracer';
import * as dat from 'dat.gui';
import { mat4, quat, vec3, vec4 } from 'gl-matrix';
import * as React from 'react';
import Stats from 'stats.js';

export default class RayTracerDemo extends React.Component {
  private gui: dat.GUI;
  private stats: Stats;
  private $stats: Node;
  private rayTracer: RayTracer;

  public async componentDidMount() {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      this.initStats();

      this.rayTracer = new RayTracer({
        canvas,
        onInit: () => {
          this.rayTracer.setSize(600, 600);
        },
        onUpdate: () => {
          console.log('update...');
          if (this.stats) {
            this.stats.update();
          }
        },
      });

      await this.rayTracer.init();

      // GUI
      const gui = new dat.GUI();
      this.gui = gui;
    }
  }

  public componentWillUnmount() {
    if (this.rayTracer) {
      this.rayTracer.destroy();
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
