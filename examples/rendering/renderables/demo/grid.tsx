import { Renderable, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import * as dat from 'dat.gui';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const $wrapper = document.getElementById('wrapper');

function Grid() {
  let frameId;
  useEffect(() => {
    const stats = new Stats();
    stats.showPanel(0);
    const $stats = stats.dom;
    $stats.style.position = 'absolute';
    $stats.style.left = '0px';
    $stats.style.top = '0px';
    $wrapper.appendChild($stats);

    const canvas = document.getElementById('application') as HTMLCanvasElement;

    const world = World.create({
      canvas,
    });

    const renderer = world.createRenderer();
    const scene = world.createScene();

    const camera = world
      .createCamera()
      .setPosition(0, 5, 5)
      .setPerspective(0.1, 1000, 75, canvas.width / canvas.height);

    const view = world
      .createView()
      .setCamera(camera)
      .setScene(scene);

    const tracker = Tracker.create(world);
    tracker.attachControl(view);

    const grid = world.createRenderable(Renderable.GRID, {
      gridColor: [1, 0, 0, 1],
      gridSize: 0.5,
    });
    scene.addRenderable(grid);

    const resizeRendererToDisplaySize = () => {
      const dpr = window.devicePixelRatio;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      const needResize = canvas.width !== width || canvas.height !== height;
      if (needResize) {
        view.setViewport({
          x: 0,
          y: 0,
          width,
          height,
        });
        canvas.width = width;
        canvas.height = height;
      }
      return needResize;
    };

    const render = () => {
      if (stats) {
        stats.update();
      }
      if (resizeRendererToDisplaySize()) {
        camera.setAspect(canvas.clientWidth / canvas.clientHeight);
      }
      renderer.render(view);
      frameId = window.requestAnimationFrame(render);
    };

    render();

    // GUI
    const gui = new dat.GUI({ autoPlace: false });
    $wrapper.appendChild(gui.domElement);
    const gridFolder = gui.addFolder('grid');
    const gridConfig = {
      gridColor: [255, 0, 0],
      gridSize: 0.5,
    };
    gridFolder.addColor(gridConfig, 'gridColor').onChange((color) => {
      grid.setAttributes({
        gridColor: [color[0] / 255, color[1] / 255, color[2] / 255, 1],
      });
    });
    gridFolder.add(gridConfig, 'gridSize', 0, 2, 0.1).onChange((gridSize) => {
      grid.setAttributes({
        gridSize,
      });
    });
    gridFolder.open();

    window.gwebgpuClean = () => {
      window.cancelAnimationFrame(frameId);
      world.destroy();
    };

    return () => {
      window.gwebgpuClean();
    };
  });

  return (
    <canvas
      id="application"
      style={{
        width: 600,
        height: 600,
        display: 'block',
      }}
    />
  );
};

ReactDOM.render(<Grid />, $wrapper);
