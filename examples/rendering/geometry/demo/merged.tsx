import { Geometry, Material, Renderable, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import * as dat from 'dat.gui';
import { quat } from 'gl-matrix';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const CUBE_NUM = 1000;

function rand(min: number, max: number) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + (max - min) * Math.random();
}

function MergedGeometry() {
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
      .setPerspective(0.1, 100, 75, canvas.width / canvas.height);

    const view = world
      .createView()
      .setCamera(camera)
      .setScene(scene);

    const tracker = Tracker.create(world);
    tracker.attachControl(view);

    const material = world.createMaterial(Material.BASIC).setUniform({
      color: [1, 0, 0, 1],
    });
    const geometries = [];
    // reused by every geometry
    const transformComponent = world.createRenderable().getTransformComponent();

    const unmergedCubes = world.createRenderable();
    scene.addRenderable(unmergedCubes);

    for (let i = 0; i < CUBE_NUM; i++) {
      const boxGeometry = world.createGeometry(Geometry.BOX, {
        halfExtents: [1, 1, 1],
      });
      const randomScale = rand(0.02, 0.05);
      const translation = [rand(-1, 1), rand(-1, 1), rand(-1, 1)];
      const scale = [randomScale, randomScale, randomScale];

      // do RTS transformation
      transformComponent.translateLocal(translation).setLocalScale(scale);
      transformComponent.updateTransform();

      // apply transform matrix to every geometry
      boxGeometry.applyMatrix(transformComponent.worldTransform);
      // clear for next time
      transformComponent.clearTransform();
      geometries.push(boxGeometry);

      // bad performance...
      const boxGeometry2 = world.createGeometry(Geometry.BOX, {
        halfExtents: [1, 1, 1],
      });
      const cube = world
        .createRenderable()
        .setGeometry(boxGeometry2)
        .setMaterial(material);
      cube
        .getTransformComponent()
        .translate(translation)
        .setLocalScale(scale);
      cube.attach(unmergedCubes);
      scene.addRenderable(cube);
      unmergedCubes.setVisible(false);
    }

    // good performance...
    // merge all the boxes into a single geometry
    const mergedGeometry = world.createGeometry(Geometry.MERGED, {
      geometries,
    });

    const mergedCubes = world
      .createRenderable()
      .setGeometry(mergedGeometry)
      .setMaterial(material);
    scene.addRenderable(mergedCubes);

    const grid = world.createRenderable(Renderable.GRID);
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

      mergedCubes
        .getTransformComponent()
        .rotateLocal(quat.fromEuler(quat.create(), 0, 1, 0));
      unmergedCubes
        .getTransformComponent()
        .rotateLocal(quat.fromEuler(quat.create(), 0, 1, 0));

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
    const cubeFolder = gui.addFolder('merged geometry');
    const cubeConfig = {
      merged: true,
    };
    cubeFolder
      .add(cubeConfig, 'merged')
      .onChange((merged) => {
        if (merged) {
          mergedCubes.setVisible(true);
          unmergedCubes.setVisible(false);
        } else {
          mergedCubes.setVisible(false);
          unmergedCubes.setVisible(true);
        }
      })
      .name('enable merged geometry');
    cubeFolder.open();

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
}

ReactDOM.render(<MergedGeometry />, document.getElementById('wrapper'));
