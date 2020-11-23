import { World, Renderable } from '@antv/g-webgpu';
import { PixelPicker, Tracker } from '@antv/g-webgpu-interactor';
import * as dat from 'dat.gui';
import React, { useEffect, useState } from 'react';
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

const App = function PixelPickerDemo() {
  let frameId;
  const [pickResult, setPickResult] = useState<{
    id: number | undefined;
    x: number;
    y: number;
  }>({
    id: undefined,
    x: -1,
    y: -1,
  });

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
      .setPosition(0, 0, 5)
      .setPerspective(0.1, 200, 60, canvas.width / canvas.height);

    const view = world
      .createView()
      .setCamera(camera)
      .setScene(scene);

    const tracker = Tracker.create(world);
    tracker.attachControl(view);
    const picker = PixelPicker.create(world);
    picker.attachControl(view);
    picker.on(
      'pick',
      (result: { id: number | undefined; x: number; y: number }) => {
        setPickResult(result);
      },
    );

    world.createRenderable(
      pointsEntity,
      Renderable.POINT,
      new Array(100).fill(undefined).map((_, i) => ({
        id: i, // used by pixel picker
        shape: shapes[Math.floor(Math.random() * 9)],
        size: [50, 50],
        position: [Math.random() * 2 - 1, Math.random() * 2 - 1],
        color: [Math.random(), Math.random(), Math.random(), 1],
      })),
    );

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
    const pixelPickerFolder = gui.addFolder('pixel picker');
    const pickConfig = {
      enableHighlight: true,
      highlightColor: [255, 0, 0],
    };
    pixelPickerFolder.add(pickConfig, 'enableHighlight').onChange((enabled) => {
      picker.enableHighlight(enabled);
    });
    pixelPickerFolder
      .addColor(pickConfig, 'highlightColor')
      .onChange((color) => {
        picker.setHighlightColor([
          color[0] / 255,
          color[1] / 255,
          color[2] / 255,
          1,
        ]);
      });
    pixelPickerFolder.open();

    window.gwebgpuClean = () => {
      window.cancelAnimationFrame(frameId);
      world.destroy();
    };

    return () => {
      window.gwebgpuClean();
    };
  }, []);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 0,
        }}
      >
        Picked ID: {pickResult.id}, x: {pickResult.x}, y: {pickResult.y}
      </div>
      <canvas
        id="application"
        style={{
          width: 600,
          height: 600,
          display: 'block',
        }}
      />
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('wrapper'));
