import { Renderable, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import * as dat from 'dat.gui';
import { vec3, vec4 } from 'gl-matrix';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const App = function Line() {
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
    const lineEntity = world.createEntity();
    scene.addEntity(lineEntity);

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

    world.createRenderable(lineEntity, Renderable.LINE, {
      points: [
        [0, 0],
        [1, 1],
        [1, -1],
        [-1, -1],
        [1, -0.85],
      ],
      color: [Math.random(), Math.random(), Math.random(), 1],
      thickness: 0.02,
      dashArray: 0.02,
      dashOffset: 0,
      dashRatio: 0.5,
    });
    const meshComponent = world.getMeshComponent(lineEntity);
    const transformComponent = world.getTransformComponent(lineEntity);

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
    const lineFolder = gui.addFolder('line');
    const lineConfig = {
      scale: 1,
      color: [255, 255, 255],
      thickness: 0.02,
      dashArray: 0.02,
      dashOffset: 0,
      dashRatio: 0.5,
    };
    lineFolder.add(lineConfig, 'scale', 0.1, 5.0).onChange((size) => {
      transformComponent.localScale = vec3.fromValues(1, 1, 1);
      transformComponent.scale(vec3.fromValues(size, size, size));
    });
    lineFolder.addColor(lineConfig, 'color').onChange((color) => {
      // meshComponent.material.setUniform(
      //   'u_stroke_color',
      //   vec4.fromValues(color[0] / 255, color[1] / 255, color[2] / 255, 1),
      // );
    });
    lineFolder.add(lineConfig, 'thickness', 0, 0.1).onChange((thickness) => {
      meshComponent.material.setUniform('u_thickness', thickness);
    });
    lineFolder.add(lineConfig, 'dashArray', 0, 1).onChange((dashArray) => {
      meshComponent.material.setUniform('u_dash_array', dashArray);
    });
    lineFolder.add(lineConfig, 'dashOffset', 0, 1).onChange((dashOffset) => {
      meshComponent.material.setUniform('u_dash_offset', dashOffset);
    });
    lineFolder.add(lineConfig, 'dashRatio', 0, 1).onChange((dashRatio) => {
      meshComponent.material.setUniform('u_dash_ratio', dashRatio);
    });
    lineFolder.open();

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
