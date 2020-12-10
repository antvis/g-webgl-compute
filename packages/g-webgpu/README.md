# @antv/g-webgpu

```typescript
import { World } from '@antv/g-webgpu';

const canvas = document.getElementById('application');

const world = World.create({
  canvas,
});

const renderer = world.createRenderer();
const scene = world.createScene();
const boxEntity = world.createEntity();
scene.addEntity(boxEntity);

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

// create geometry, material and attach them to mesh
const boxGeometry = world.createGeometry(Geometry.BOX, {
  halfExtents: [0.5, 0.5, 0.5],
});
const material = world.createMaterial(Material.BASIC).setUniform({
  color: [1, 0, 0, 1],
});

world
  .createRenderable(boxEntity)
  .setGeometry(boxGeometry)
  .setMaterial(material);

// create a render loop
const render = () => {
  renderer.render(view);
  frameId = window.requestAnimationFrame(render);
};

render();
```