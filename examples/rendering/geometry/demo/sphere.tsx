import { Geometry, Material, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import * as dat from 'dat.gui';
import { quat } from 'gl-matrix';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

function SphereGeometry() {
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
      .setScene(scene)
      .setViewport({
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      });

    const tracker = Tracker.create(world);
    tracker.attachControl(view);

    // create geometry, material and attach them to mesh
    const sphereGeometry = world.createGeometry(Geometry.SPHERE, {
      radius: 0.5,
    });

    // create a texture by url
    const texture = world.createTexture2D({
      url: 'https://threejs.org/examples/textures/crate.gif',
    });
    const material = world
      .createMaterial(Material.BASIC, {
        map: texture,
      })
      .setUniform({
        color: [1, 1, 1, 1],
      });

    const sphere = world
      .createRenderable()
      .setGeometry(sphereGeometry)
      .setMaterial(material);
    scene.addRenderable(sphere);

    const transformComponent = sphere.getTransformComponent();

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
      transformComponent.rotate(quat.fromEuler(quat.create(), 0, 1, 0));
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
    const sphereFolder = gui.addFolder('sphere');
    const sphereConfig = {
      scale: 1,
      radius: 0.5,
      color: [255, 255, 255],
    };
    sphereFolder.add(sphereConfig, 'scale', 0.1, 5.0).onChange((size) => {
      transformComponent.setLocalScale([size, size, size]);
    });
    sphereFolder.addColor(sphereConfig, 'color').onChange((color) => {
      material.setUniform({
        color: [color[0] / 255, color[1] / 255, color[2] / 255, 1],
      });
    });
    sphereFolder.open();

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
}

ReactDOM.render(<SphereGeometry />, document.getElementById('wrapper'));
