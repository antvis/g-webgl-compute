import { Renderable, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import { vec3, vec4 } from 'gl-matrix';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const App = function TrackingMode() {
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
      .setType('TRACKING')
      .setPosition(0, 0, 5)
      .setPerspective(0.1, 1000, 72, canvas.width / canvas.height);

    const view = world
      .createView()
      .setCamera(camera)
      .setScene(scene);
    const tracker = Tracker.create(world);
    tracker.attachControl(view);

    const boxGeometry = world.createBoxGeometry({
      halfExtents: vec3.fromValues(1, 1, 1),
    });
    const material = world.createBasicMaterial().setUniform({
      color: vec4.fromValues(1, 0, 0, 1),
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

      if (resizeRendererToDisplaySize()) {
        camera.setAspect(canvas.clientWidth / canvas.clientHeight);
      }

      renderer.render(view);
      frameId = window.requestAnimationFrame(render);
    };

    render();

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
