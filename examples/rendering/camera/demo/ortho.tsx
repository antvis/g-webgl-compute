import { Renderable, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import * as dat from 'dat.gui';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const App = function Orthographic() {
  let frameId: number;
  let camera;
  useEffect(() => {
    const stats = new Stats();
    stats.showPanel(0);
    const $stats = stats.dom;
    $stats.style.position = 'absolute';
    $stats.style.left = '0px';
    $stats.style.top = '0px';
    const $wrapper = document.getElementById('wrapper');
    $wrapper.appendChild($stats);

    const canvas = document.getElementById('application') as HTMLCanvasElement;

    const world = World.create({
      canvas,
    });

    const renderer = world.createRenderer();
    const scene = world.createScene();
    const boxEntity = world.createEntity();
    scene.addEntity(boxEntity);
    const gridEntity = world.createEntity();
    scene.addEntity(gridEntity);

    camera = world
      .createCamera()
      .setPosition(0, 0, 5)
      .setOrthographic(-4, 4, 4, -4, 1, 600);

    const view = world
      .createView()
      .setCamera(camera)
      .setScene(scene);
    const tracker = Tracker.create(world);
    tracker.attachControl(view);

    const boxGeometry = world.createBoxGeometry({
      halfExtents: [1, 1, 1],
    });
    const material = world.createBasicMaterial().setUniform({
      color: [1, 0, 0, 1],
    });

    world
      .createRenderable(boxEntity)
      .setGeometry(boxGeometry)
      .setMaterial(material);
    world.createRenderable(gridEntity, Renderable.GRID);

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

      resizeRendererToDisplaySize();

      renderer.render(view);
      frameId = window.requestAnimationFrame(render);
    };

    render();

    // GUI
    const gui = new dat.GUI({ autoPlace: false });
    $wrapper.appendChild(gui.domElement);
    const cubeFolder = gui.addFolder('orthographic projection');
    const cubeConfig = {
      left: 4,
      top: 4,
    };
    cubeFolder.add(cubeConfig, 'left', 1, 10).onChange((left) => {
      camera.setOrthographic(
        -left,
        left,
        cubeConfig.top,
        -cubeConfig.top,
        1,
        600,
      );
    });
    cubeFolder.add(cubeConfig, 'top', 1, 10).onChange((top) => {
      camera.setOrthographic(
        -cubeConfig.left,
        cubeConfig.left,
        top,
        -top,
        1,
        600,
      );
    });
    cubeFolder.open();

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

ReactDOM.render(<App />, document.getElementById('wrapper'));
