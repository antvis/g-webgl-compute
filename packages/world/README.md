# @antv/g-webgpu

```typescript
import { World } from '@antv/g-webgpu';

const canvas = document.getElementById('application');

// create a world
const world = new World(canvas);

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
const mesh = world.createMesh({
  geometry: boxGeometry,
  material,
});

// add meshes to current scene
world.add(scene, mesh);
```