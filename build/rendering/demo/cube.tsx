import { World } from '@antv/g-webgpu';
import * as dat from 'dat.gui';
import { quat, vec3, vec4 } from 'gl-matrix';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const App = React.memo(function RotatingCube() {
  useEffect(() => {
    // @ts-ignore
    const stats = new Stats();
    stats.showPanel(0);
    const $stats = stats.dom;
    $stats.style.position = 'absolute';
    $stats.style.left = '0px';
    $stats.style.top = '0px';
    const $wrapper = document.getElementById('wrapper');
    $wrapper.appendChild($stats);

    let meshTransform;

    const canvas = document.getElementById('application') as HTMLCanvasElement;
    const world = new World({
      canvas,
      onUpdate: () => {
        meshTransform.rotate(quat.fromEuler(quat.create(), 0, 1, 0));

        if (stats) {
          stats.update();
        }
      },
    });

    // create a camera
    const camera = world.createCamera({
      aspect: Math.abs(canvas.width / canvas.height),
      angle: 72,
      far: 100,
      near: 1,
    });
    world.getCamera(camera).setPosition(0, 5, 5);

    // create a scene
    const scene = world.createScene({ camera });

    // create geometry, material and attach them to mesh
    const boxGeometry = world.createBoxGeometry({
      halfExtents: vec3.fromValues(1, 1, 1),
    });
    const material = world.createBasicMaterial();
    world.setUniform(material, 'color', vec4.fromValues(1, 0, 0, 1));

    const mesh = world.createMesh({
      geometry: boxGeometry,
      material,
    });
    meshTransform = world.getTransform(mesh);
    meshTransform.translate(vec3.fromValues(-2.5, 0, 0));

    const material2 = world.createBasicMaterial();
    world.setUniform(material2, 'color', vec4.fromValues(0, 0, 0, 0));

    const mesh2 = world.createMesh({
      geometry: boxGeometry,
      material: material2,
    });
    const mesh2Transform = world.getTransform(mesh2);
    mesh2Transform.translate(vec3.fromValues(2.5, 0, 0));

    // add meshes to current scene
    world.add(scene, mesh);
    world.add(scene, mesh2);

    // GUI
    const gui = new dat.GUI({ autoPlace: false });
    $wrapper.appendChild(gui.domElement);
    const cubeFolder = gui.addFolder('cube');

    const cube = {
      scale: 1,
      color: [255, 255, 255],
    };
    cubeFolder.add(cube, 'scale', 0.1, 5.0).onChange((size) => {
      meshTransform.localScale = vec3.fromValues(1, 1, 1);
      meshTransform.scale(vec3.fromValues(size, size, size));
    });
    cubeFolder.addColor(cube, 'color').onChange((color) => {
      world.setUniform(
        material,
        'color',
        vec4.fromValues(color[0] / 255, color[1] / 255, color[2] / 255, 1),
      );
    });

    return () => {
      world.destroy();
    };
  }, []);

  return (
    <>
      <canvas id="application" width="600" height="600" />
    </>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));
