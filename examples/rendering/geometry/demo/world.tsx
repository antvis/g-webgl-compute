import { Geometry, Material, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import * as dat from 'dat.gui';
import { quat, vec3, vec4 } from 'gl-matrix';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

function parseData(text) {
  const data = [];
  const settings = { data };
  let max;
  let min;
  // split into lines
  text.split('\n').forEach((line) => {
    // split the line by whitespace
    const parts = line.trim().split(/\s+/);
    if (parts.length === 2) {
      // only 2 parts, must be a key/value pair
      settings[parts[0]] = parseFloat(parts[1]);
    } else if (parts.length > 2) {
      // more than 2 parts, must be data
      const values = parts.map((v) => {
        const value = parseFloat(v);
        if (value === settings.NODATA_value) {
          return undefined;
        }
        max = Math.max(max === undefined ? value : max, value);
        min = Math.min(min === undefined ? value : min, value);
        return value;
      });
      data.push(values);
    }
  });
  return {...settings,  min, max};
}

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
      latitudeBands: 64,
      longitudeBands: 32,
    });

    // create a texture by url
    const texture = world.createTexture2D({
      url:
        'https://2.bp.blogspot.com/-Jfw4jY6vBWM/UkbwZhdKxuI/AAAAAAAAK94/QTmtnuDFlC8/s1600/2_no_clouds_4k.jpg',
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
      if (stats) {
        stats.update();
      }
      if (resizeRendererToDisplaySize()) {
        camera.setAspect(canvas.clientWidth / canvas.clientHeight);
      }
      renderer.render(view);
      frameId = window.requestAnimationFrame(render);
    };

    // render();

    const load = async () => {
      const req = await fetch(
        'https://threejsfundamentals.org/threejs/resources/data/gpw/gpw_v4_basic_demographic_characteristics_rev10_a000_014mt_2010_cntm_1_deg.asc',
      );
      const text = await req.text();
      const { min, max, data } = parseData(text);
      const range = max - min;
      const boxGeometry = world.createGeometry(Geometry.BOX);
      // const boxMaterial = world
      //       .createMaterial(Material.BASIC)
      //       .setUniform({
      //         color: [1, 1, 1, 1],
      //       });

      // these helpers will make it easy to position the boxes
      // We can rotate the lon helper on its Y axis to the longitude
      // const lonHelperEntity = world.createEntity();
      // const lonHelper = world.createRenderable(lonHelperEntity);
      // scene.addEntity(lonHelperEntity);
      // // We rotate the latHelper on its X axis to the latitude
      // const latHelperEntity = world.createEntity();
      // const latHelper = world.createRenderable(latHelperEntity);
      // latHelper.attach(lonHelper);
      // // The position helper moves the object to the edge of the sphere
      // const positionHelperEntity = world.createEntity();
      // const positionHelper = world.createRenderable(positionHelperEntity);
      // positionHelper
      //   .getTransformComponent()
      //   .translate([0, 0, 1]);
      // positionHelper.attach(latHelper);

      const lonFudge = Math.PI * 0.5;
      const latFudge = Math.PI * -0.135;
      data.forEach((row, latNdx) => {
        row.forEach((value, lonNdx) => {
          if (value === undefined || latNdx > 20 || lonNdx > 20) {
            return;
          }
          const amount = (value - min) / range;

          const boxMaterial = world.createMaterial(Material.BASIC).setUniform({
            color: [1, 0, 0, 1],
          });
          // const material = new THREE.MeshBasicMaterial();
          // const hue = THREE.MathUtils.lerp(0.7, 0.3, amount);
          // const saturation = 1;
          // const lightness = THREE.MathUtils.lerp(0.4, 1.0, amount);
          // material.color.setHSL(hue, saturation, lightness);

          const boxEntity = world.createEntity();
          const box = world
            .createRenderable(boxEntity)
            .setGeometry(boxGeometry)
            .setMaterial(boxMaterial);
          // box.attach(positionHelper);
          box.getTransformComponent().localScale = [1, 1, 1];
          box.getTransformComponent().scale([0.05, 0.05, 0.05]);
          box.getTransformComponent().translate([0, 0, 1]);

          scene.addEntity(boxEntity);

          // console.log(boxEntity);

          // const mesh = new THREE.Mesh(geometry, material);
          // scene.add(mesh);

          // adjust the helpers to point to the latitude and longitude
          // lonHelper.rotation.y = THREE.MathUtils.degToRad(lonNdx + file.xllcorner) + lonFudge;
          // latHelper.rotation.x = THREE.MathUtils.degToRad(latNdx + file.yllcorner) + latFudge;

          // use the world matrix of the position helper to
          // position this mesh.
          // positionHelper.updateWorldMatrix(true, false);
          // mesh.applyMatrix4(positionHelper.matrixWorld);

          // mesh.scale.set(0.005, 0.005, THREE.MathUtils.lerp(0.01, 0.5, amount));
        });
      });

      render();
    };
    load();

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
      transformComponent.setScaleLocal(vec3.fromValues(size, size, size));
    });
    sphereFolder.addColor(sphereConfig, 'color').onChange((color) => {
      material.setUniform({
        color: vec4.fromValues(
          color[0] / 255,
          color[1] / 255,
          color[2] / 255,
          1,
        ),
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
