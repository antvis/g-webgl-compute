import { Geometry, Material, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import { quat } from 'gl-matrix';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const $wrapper = document.getElementById('wrapper');

function MultiView() {
  let frameId: number;
  let camera1;
  let camera2;
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
    const scene1 = world.createScene();
    const scene2 = world.createScene();

    camera1 = world
      .createCamera()
      .setPosition(0, 5, 5)
      .setPerspective(0.1, 1000, 72, canvas.width / canvas.height);
    camera2 = world
      .createCamera()
      .setPosition(0, 5, 5)
      .setPerspective(0.1, 1000, 72, canvas.width / canvas.height);

    const view1 = world
      .createView()
      .setCamera(camera1)
      .setScene(scene1);
    const view2 = world
      .createView()
      .setCamera(camera2)
      .setScene(scene2);

    const tracker = Tracker.create(world);
    tracker.attachControl(view1, view2);

    const boxGeometry = world.createGeometry(Geometry.BOX, {
      halfExtents: [1, 1, 1],
    });
    const material1 = world.createMaterial(Material.BASIC).setUniform({
      color: [1, 0, 0, 1],
    });
    const material2 = world.createMaterial(Material.BASIC).setUniform({
      color: [0, 1, 0, 1],
    });

    const box1 = world
      .createRenderable()
      .setGeometry(boxGeometry)
      .setMaterial(material1);
    scene1.addRenderable(box1);
    const transformComponent1 = box1.getTransformComponent();
    transformComponent1.translateLocal([-1.2, 0, 0]);

    const box2 = world
      .createRenderable()
      .setGeometry(boxGeometry)
      .setMaterial(material2);
    scene2.addRenderable(box2);
    const transformComponent2 = box2.getTransformComponent();
    transformComponent2.translateLocal([1.2, 0, 0]);

    const resizeRendererToDisplaySize = () => {
      const dpr = window.devicePixelRatio;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      const needResize = canvas.width !== width || canvas.height !== height;
      if (needResize) {
        renderer.setSize({ width, height });
        view1.setViewport({
          x: 0,
          y: 0,
          width: width / 2,
          height,
        });
        view2.setViewport({
          x: width / 2,
          y: 0,
          width: width / 2,
          height,
        });
      }
      return needResize;
    };

    const render = async () => {
      if (stats) {
        stats.update();
      }

      transformComponent1.rotateLocal(quat.fromEuler(quat.create(), 0, 1, 0));
      transformComponent2.rotateLocal(quat.fromEuler(quat.create(), 0, 1, 0));

      if (resizeRendererToDisplaySize()) {
        camera1.setAspect(canvas.clientWidth / canvas.clientHeight);
        camera2.setAspect(canvas.clientWidth / canvas.clientHeight);
      }

      renderer.render(view1, view2);
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
    <>
      <canvas
        id="application"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '50%',
          height: '100%',
          textAlign: 'right',
          borderRight: '1px solid',
          pointerEvents: 'none',
        }}
      >
        Viewport 1
      </div>
      <div style={{ position: 'absolute', left: '50%', top: 0 }}>
        Viewport 2
      </div>
    </>
  );
}

ReactDOM.render(<MultiView />, $wrapper);
