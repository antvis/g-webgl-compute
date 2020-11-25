import { World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import { Button } from 'antd';
import { vec3, vec4 } from 'gl-matrix';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import SplitPane from 'react-split-pane';
import Stats from 'stats.js';

const App = function Responsive() {
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

    camera = world
      .createCamera()
      .setPosition(0, 5, 5)
      .setPerspective(0.1, 1000, 72, canvas.width / canvas.height);
    camera.createLandmark('mark1', {
      position: [0, 5, 5],
      focalPoint: [0, 0, 0],
    });
    camera.createLandmark('mark2', {
      position: [10, 0, 10],
      focalPoint: [5, 0, 0],
    });
    camera.createLandmark('mark3', {
      position: [3, 2, 5],
      focalPoint: [0, 0, 0],
      roll: 30,
    });

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

    history.onpushstate = () => {
      window.cancelAnimationFrame(frameId);
      world.destroy();
    };

    return () => {
      window.cancelAnimationFrame(frameId);
      world.destroy();
    };
  });

  return (
    <>
      <SplitPane split="vertical" defaultSize={200} primary="second">
        <canvas
          id="application"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
        <div>⇐ Drag this bar</div>
      </SplitPane>
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('wrapper'));
