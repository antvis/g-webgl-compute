import { World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import * as dat from 'dat.gui';
import { quat } from 'gl-matrix';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const CUBE_NUM = 10;

function rand(min: number, max: number) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + (max - min) * Math.random();
}

const App = function Group() {
  let frameId;

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

    // all cubes share the same geometry
    const boxGeometry = world.createBoxGeometry({
      halfExtents: [0.1, 0.1, 0.1],
    });

    const cubeGroupEntity = world.createEntity();
    const cubeGroup = world.createRenderable(cubeGroupEntity);

    let greenCubeEntity;
    for (let i = 0; i < CUBE_NUM; i++) {
      const material = world.createBasicMaterial().setUniform({
        color: i > 0 ? [1, 0, 0, 1] : [0, 1, 0, 1],
      });

      const cubeEntity = world.createEntity();
      if (i === 0) {
        greenCubeEntity = cubeEntity;
      }
      const cube = world
        .createRenderable(cubeEntity)
        .setGeometry(boxGeometry)
        .setMaterial(material);

      const randomScale = rand(1, 2);

      cube
        .getTransformComponent()
        .translate([rand(-1.2, 1.2), rand(-1.2, 1.2), rand(-1.2, 1.2)])
        .scale([randomScale, randomScale, randomScale]);

      // attach every cube to group
      if (i > 0) {
        cube.attach(cubeGroup);
      }
    }

    scene.addEntity(greenCubeEntity);
    scene.addEntity(cubeGroupEntity);

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
        .rotate(quat.fromEuler(quat.create(), 0, 1, 0));

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
    const groupFolder = gui.addFolder('group');
    const cubes = [];
    const groupConfig = {
      scale: 1,
      addCube: () => {
        const material = world.createBasicMaterial().setUniform({
          color: [rand(0, 1), rand(0, 1), rand(0, 1), 1],
        });
        const cubeEntity = world.createEntity();
        const cube = world
          .createRenderable(cubeEntity)
          .setGeometry(boxGeometry)
          .setMaterial(material);

        const randomScale = rand(1, 2);
        cube
          .getTransformComponent()
          .translate([rand(-1.2, 1.2), rand(-1.2, 1.2), rand(-1.2, 1.2)])
          .scale([randomScale, randomScale, randomScale]);
        cube.attach(cubeGroup);
        cubes.push(cube);
      },
      removeCube: () => {
        const cube = cubes.pop();
        if (cube) {
          cube.detach();
        }
      },
      toggleGroupVisible: () => {
        cubeGroup.setVisible(!cubeGroup.isVisible());
      },
    };
    groupFolder.add(groupConfig, 'scale', 0.1, 5.0).onChange((size) => {
      cubeGroup.getTransformComponent().localScale = [1, 1, 1];
      cubeGroup.getTransformComponent().scale([size, size, size]);
    });
    groupFolder.add(groupConfig, 'addCube').name('Add Cube');
    groupFolder.add(groupConfig, 'removeCube').name('Remove Cube');
    groupFolder.add(groupConfig, 'toggleGroupVisible').name('Hide/Show Group');
    groupFolder.open();

    window.gwebgpuClean = () => {
      window.cancelAnimationFrame(frameId);
      world.destroy();
    };

    return () => {
      window.gwebgpuClean();
    };
  }, []);

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
