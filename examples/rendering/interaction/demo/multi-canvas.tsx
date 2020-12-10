import { Material, Geometry, World } from '@antv/g-webgpu';
import { Tracker } from '@antv/g-webgpu-interactor';
import { Button } from 'antd';
import { vec3, vec4 } from 'gl-matrix';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import SplitPane from 'react-split-pane';
import Stats from 'stats.js';

const App = function MultiWorld() {
  let frameId: number;
  let camera1;
  let camera2;
  useEffect(() => {
    const stats = new Stats();
    stats.showPanel(0);
    const $stats = stats.dom;
    $stats.style.position = 'absolute';
    $stats.style.left = '0px';
    $stats.style.top = '0px';
    const $wrapper = document.getElementById('wrapper');
    $wrapper.appendChild($stats);

    const canvas1 = document.getElementById(
      'application1',
    ) as HTMLCanvasElement;
    const canvas2 = document.getElementById(
      'application2',
    ) as HTMLCanvasElement;

    const world1 = World.create({
      canvas: canvas1,
    });
    const world2 = World.create({
      canvas: canvas2,
    });

    const renderer1 = world1.createRenderer();
    const scene1 = world1.createScene();
    const boxEntity1 = world1.createEntity();
    scene1.addEntity(boxEntity1);

    const renderer2 = world2.createRenderer();
    const scene2 = world2.createScene();
    const boxEntity2 = world2.createEntity();
    scene2.addEntity(boxEntity2);

    camera1 = world1
      .createCamera()
      .setPosition(0, 5, 5)
      .setPerspective(0.1, 1000, 72, canvas1.width / canvas1.height);
    camera2 = world2
      .createCamera()
      .setPosition(0, 5, 5)
      .setPerspective(0.1, 1000, 72, canvas2.width / canvas2.height);

    const view1 = world1
      .createView()
      .setCamera(camera1)
      .setScene(scene1);
    const view2 = world2
      .createView()
      .setCamera(camera2)
      .setScene(scene2);

    // const tracker1 = Tracker.create(world1);
    // tracker1.attachControl(view1);
    // const tracker2 = Tracker.create(world2);
    // tracker2.attachControl(view2);

    const boxGeometry1 = world1.createGeometry(Geometry.BOX, {
      halfExtents: vec3.fromValues(1, 1, 1),
    });
    const material1 = world1.createMaterial(Material.BASIC).setUniform({
      color: vec4.fromValues(1, 0, 0, 1),
    });
    const boxGeometry2 = world2.createBoxGeometry({
      halfExtents: vec3.fromValues(1, 1, 1),
    });
    const material2 = world2.createMaterial(Material.BASIC).setUniform({
      color: vec4.fromValues(1, 0, 0, 1),
    });

    world1
      .createRenderable(boxEntity1)
      .setGeometry(boxGeometry1)
      .setMaterial(material1);
    world2
      .createRenderable(boxEntity2)
      .setGeometry(boxGeometry2)
      .setMaterial(material2);

    console.log(boxEntity1, boxEntity2, boxGeometry1, boxGeometry2);

    const resizeRenderer1ToDisplaySize = () => {
      const dpr = window.devicePixelRatio;
      const width = canvas1.clientWidth * dpr;
      const height = canvas1.clientHeight * dpr;
      const needResize = canvas1.width !== width || canvas1.height !== height;
      if (needResize) {
        view1.setViewport({
          x: 0,
          y: 0,
          width,
          height,
        });
        canvas1.width = width;
        canvas1.height = height;
      }
      return needResize;
    };
    const resizeRenderer2ToDisplaySize = () => {
      const dpr = window.devicePixelRatio;
      const width = canvas2.clientWidth * dpr;
      const height = canvas2.clientHeight * dpr;
      const needResize = canvas2.width !== width || canvas2.height !== height;
      if (needResize) {
        view2.setViewport({
          x: 0,
          y: 0,
          width,
          height,
        });
        canvas2.width = width;
        canvas2.height = height;
      }
      return needResize;
    };

    const render = () => {
      if (stats) {
        stats.update();
      }

      if (resizeRenderer1ToDisplaySize()) {
        camera1.setAspect(canvas1.clientWidth / canvas1.clientHeight);
      }
      if (resizeRenderer2ToDisplaySize()) {
        camera2.setAspect(canvas2.clientWidth / canvas2.clientHeight);
      }

      renderer1.render(view1);
      renderer2.render(view2);
      frameId = window.requestAnimationFrame(render);
    };

    render();

    window.gwebgpuClean = () => {
      window.cancelAnimationFrame(frameId);
      world1.destroy();
      world2.destroy();
    };

    return () => {
      window.gwebgpuClean();
    };
  });

  return (
    <>
      <SplitPane split="vertical" defaultSize={200} primary="second">
        <canvas
          id="application1"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
        <canvas
          id="application2"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </SplitPane>
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('wrapper'));
