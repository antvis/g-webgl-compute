import { Geometry, Material, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import { quat } from 'gl-matrix';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

// @see https://threejsfundamentals.org/threejs/lessons/threejs-scenegraph.html
function SolarSystem() {
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
      .setPosition(0, 0, 10)
      .setPerspective(0.1, 1000, 75, canvas.width / canvas.height);

    const view = world
      .createView()
      .setCamera(camera)
      .setScene(scene);

    const tracker = Tracker.create(world);
    tracker.attachControl(view);

    // sun, earth and moon will share the same geometry
    const sphereGeometry = world.createGeometry(Geometry.SPHERE, {
      radius: 0.5,
      latitudeBands: 4,
      longitudeBands: 4,
    });

    const sunMaterial = world.createMaterial(Material.BASIC).setUniform({
      color: [1, 0, 0, 1],
    });
    const sun = world
      .createRenderable()
      .setGeometry(sphereGeometry)
      .setMaterial(sunMaterial);
    sun.getTransformComponent().setLocalScale([5, 5, 5]);

    const earthMaterial = world.createMaterial(Material.BASIC).setUniform({
      color: [0, 0, 1, 1],
    });
    const earth = world
      .createRenderable()
      .setGeometry(sphereGeometry)
      .setMaterial(earthMaterial);

    const moonMaterial = world.createMaterial(Material.BASIC).setUniform({
      color: [1, 1, 0, 1],
    });
    const moon = world
      .createRenderable()
      .setGeometry(sphereGeometry)
      .setMaterial(moonMaterial);
    moon.getTransformComponent().setLocalScale([0.5, 0.5, 0.5]);

    const solarSystem = world.createRenderable();
    const earthOrbit = world.createRenderable();
    earthOrbit.getTransformComponent().translateLocal([5, 0, 0]);
    const moonOrbit = world.createRenderable();
    moonOrbit.getTransformComponent().translateLocal([0.5, 0, 0]);

    scene.addRenderable(solarSystem);
    scene.addRenderable(sun);
    scene.addRenderable(earthOrbit);
    scene.addRenderable(earth);
    scene.addRenderable(moonOrbit);
    scene.addRenderable(moon);

    sun.attach(solarSystem);
    earthOrbit.attach(solarSystem);
    earth.attach(earthOrbit);
    moonOrbit.attach(earthOrbit);
    moon.attach(moonOrbit);

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

      solarSystem
        .getTransformComponent()
        .rotateLocal(quat.fromEuler(quat.create(), 0, 0, 1));
      earthOrbit
        .getTransformComponent()
        .rotateLocal(quat.fromEuler(quat.create(), 0, 0, 2));
      moon
        .getTransformComponent()
        .rotateLocal(quat.fromEuler(quat.create(), 0, 0, 3));

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

ReactDOM.render(<SolarSystem />, document.getElementById('wrapper'));
