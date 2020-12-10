import { Geometry, Material, World } from '@antv/g-webgpu';
import { RayPicker, Tracker } from '@antv/g-webgpu-interactor';
import { quat } from 'gl-matrix';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const CUBE_NUM = 100;

function rand(min: number, max: number) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + (max - min) * Math.random();
}

const App = function RayPickerDemo() {
  let frameId;
  const [pickResult, setPickResult] = useState<{
    id: number | undefined;
    x: number;
    y: number;
  }>({
    id: undefined,
    x: -1,
    y: -1,
  });

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

    const camera = world
      .createCamera()
      .setPosition(0, 0, 2)
      .setPerspective(0.1, 5, 75, canvas.width / canvas.height);

    const view = world
      .createView()
      .setCamera(camera)
      .setScene(scene);

    const tracker = Tracker.create(world);
    tracker.attachControl(view);
    const picker = RayPicker.create(world);
    picker.attachControl(view);
    picker.on(
      'pick',
      (result: { id: number | undefined; x: number; y: number }) => {
        setPickResult(result);
      },
    );

    // all cubes share the same geometry
    const boxGeometry = world.createGeometry(Geometry.BOX, {
      halfExtents: [0.1, 0.1, 0.1],
    });
    const cubeGroup = world.createRenderable();

    for (let i = 0; i < CUBE_NUM; i++) {
      const material = world.createMaterial(Material.BASIC).setUniform({
        color: [1, 0, 0, 1],
      });

      const cube = world
        .createRenderable()
        .setGeometry(boxGeometry)
        .setMaterial(material);

      const randomScale = rand(1, 2);
      cube
        .getTransformComponent()
        .translateLocal([rand(-1.2, 1.2), rand(-1.2, 1.2), rand(-1.2, 1.2)])
        .setLocalScale([randomScale, randomScale, randomScale]);

      cube.attach(cubeGroup);
      scene.addRenderable(cube);
    }
    scene.addRenderable(cubeGroup);

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
      cubeGroup
        .getTransformComponent()
        .rotateLocal(quat.fromEuler(quat.create(), 0, 1, 0));

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
  }, []);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 0,
        }}
      >
        Picked ID: {pickResult.id}, x: {pickResult.x}, y: {pickResult.y}
      </div>
      <canvas
        id="application"
        style={{
          width: 600,
          height: 600,
          display: 'block',
        }}
      />
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('wrapper'));
