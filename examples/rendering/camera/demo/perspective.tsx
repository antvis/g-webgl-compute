import { Material, Geometry, Renderable, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import * as dat from 'dat.gui';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const App = function Perspective() {
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

    camera = world
      .createCamera()
      .setPosition(0, 0, 5)
      .setPerspective(0.1, 1000, 72, canvas.width / canvas.height);

    const view = world
      .createView()
      .setCamera(camera)
      .setScene(scene);
    const tracker = Tracker.create(world);
    tracker.attachControl(view);

    const boxGeometry = world.createGeometry(Geometry.BOX, {
      halfExtents: [1, 1, 1],
    });
    const material = world.createMaterial(Material.BASIC).setUniform({
      color: [1, 0, 0, 1],
    });

    const box = world
      .createRenderable()
      .setGeometry(boxGeometry)
      .setMaterial(material);
    const grid = world.createRenderable(Renderable.GRID);
    scene.addRenderable(box);
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
    const cubeFolder = gui.addFolder('perspective projection');
    const cubeConfig = {
      near: 0.1,
      far: 1000,
      fov: 72,
    };
    cubeFolder.add(cubeConfig, 'near', 0, 10).onChange((near) => {
      camera.setPerspective(
        near,
        cubeConfig.far,
        cubeConfig.fov,
        canvas.width / canvas.height,
      );
    });
    cubeFolder.add(cubeConfig, 'far', 10, 1000).onChange((far) => {
      camera.setPerspective(
        cubeConfig.near,
        far,
        cubeConfig.fov,
        canvas.width / canvas.height,
      );
    });
    cubeFolder.add(cubeConfig, 'fov', 0, 180).onChange((fov) => {
      camera.setPerspective(
        cubeConfig.near,
        cubeConfig.far,
        fov,
        canvas.width / canvas.height,
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
