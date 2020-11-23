import { Renderable, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import * as dat from 'dat.gui';
import { vec3, vec4 } from 'gl-matrix';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const shapes = [
  'circle',
  'triangle',
  'square',
  'pentagon',
  'hexagon',
  'octogon',
  'hexagram',
  'rhombus',
  'vesica',
];

const App = function Point() {
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
    const pointsEntity = world.createEntity();
    scene.addEntity(pointsEntity);

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

    world.createRenderable(
      pointsEntity,
      Renderable.POINT,
      new Array(100).fill(undefined).map((_, i) => ({
        shape: shapes[Math.floor(Math.random() * 9)],
        size: [0.2, 0.2],
        position: [Math.random() * 2 - 1, Math.random() * 2 - 1],
        color: [Math.random(), Math.random(), Math.random(), 1],
        strokeWidth: 0.01,
      })),
    );
    const meshComponent = world.getMeshComponent(pointsEntity);
    const transformComponent = world.getTransformComponent(pointsEntity);

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
    const pointFolder = gui.addFolder('point');
    const pointConfig = {
      scale: 1,
      color: [255, 255, 255],
      opacity: 0.2,
      strokeWidth: 0.01,
      strokeColor: [0, 0, 0],
      strokeOpacity: 0.2,
      blur: 0,
    };
    pointFolder.add(pointConfig, 'scale', 0.1, 5.0).onChange((size) => {
      transformComponent.localScale = vec3.fromValues(1, 1, 1);
      transformComponent.scale(vec3.fromValues(size, size, size));
    });
    pointFolder.add(pointConfig, 'opacity', 0, 1, 0.1).onChange((opacity) => {
      meshComponent.material.setUniform('u_opacity', opacity);
    });
    pointFolder
      .add(pointConfig, 'strokeWidth', 0, 0.1, 0.01)
      .onChange((strokeWidth) => {
        meshComponent.material.setUniform('u_stroke_width', strokeWidth);
      });
    pointFolder.addColor(pointConfig, 'strokeColor').onChange((color) => {
      meshComponent.material.setUniform(
        'u_stroke_color',
        vec4.fromValues(color[0] / 255, color[1] / 255, color[2] / 255, 1),
      );
    });
    pointFolder
      .add(pointConfig, 'strokeOpacity', 0, 1)
      .onChange((strokeOpacity) => {
        meshComponent.material.setUniform('u_stroke_opacity', strokeOpacity);
      });
    pointFolder.add(pointConfig, 'blur', 0, 1).onChange((blur) => {
      meshComponent.material.setUniform('u_blur', blur);
    });
    pointFolder.open();

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
