import { World } from '@antv/g-webgpu';
import * as dat from 'dat.gui';
import { quat, vec3, vec4 } from 'gl-matrix';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const App = function RotatingCube() {
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
    const dpr = window.devicePixelRatio;
    canvas.width = 600 * dpr;
    canvas.height = 600 * dpr;
    canvas.style.width = '600px';
    canvas.style.height = '600px';

    const world = World.create({
      canvas,
    });

    const renderer = world.createRenderer();
    const scene = world.createScene();
    const boxEntity = world.createEntity();
    scene.addEntity(boxEntity);

    const camera = world
      .createCamera()
      .setPosition(0, 5, 5)
      .setPerspective(0.1, 1000, 72, canvas.width / canvas.height);

    const view = world
      .createView()
      .setCamera(camera)
      .setScene(scene)
      .setViewport({
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      });

    // create geometry, material and attach them to mesh
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

    const transformComponent = world.getTransformComponent(boxEntity);
    transformComponent.translate(vec3.fromValues(-2.5, 0, 0));

    const render = () => {
      transformComponent.rotate(quat.fromEuler(quat.create(), 0, 1, 0));
      if (stats) {
        stats.update();
      }
      renderer.render(view);
      frameId = window.requestAnimationFrame(render);
    };

    render();

    // GUI
    const gui = new dat.GUI({ autoPlace: false });
    $wrapper.appendChild(gui.domElement);
    const cubeFolder = gui.addFolder('cube');
    const cubeConfig = {
      scale: 1,
      color: [255, 255, 255],
    };
    cubeFolder.add(cubeConfig, 'scale', 0.1, 5.0).onChange((size) => {
      transformComponent.localScale = vec3.fromValues(1, 1, 1);
      transformComponent.scale(vec3.fromValues(size, size, size));
    });
    cubeFolder.addColor(cubeConfig, 'color').onChange((color) => {
      material.setUniform({
        color: vec4.fromValues(
          color[0] / 255,
          color[1] / 255,
          color[2] / 255,
          1,
        ),
      });
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

  return <canvas id="application" width="600" height="600" />;
};

ReactDOM.render(<App />, document.getElementById('wrapper'));
