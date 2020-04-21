import { mat4, quat, vec3 } from 'gl-matrix';
import 'reflect-metadata';
import {
  ComponentManager,
  container,
  createEntity,
  IDENTIFIER,
} from '../../..';
import { AABB } from '../../../shape/AABB';
import { Frustum, Mask } from '../../../shape/Frustum';
import { GeometryComponent } from '../../geometry/GeometryComponent';
import { GeometrySystem } from '../../geometry/System';
import { NameComponent } from '../../scenegraph/NameComponent';
import { SceneGraphSystem } from '../../scenegraph/System';
import { CullableComponent } from '../CullableComponent';
import { MeshComponent } from '../MeshComponent';
import { MeshSystem } from '../System';

describe('Frustum Culling', () => {
  const meshSystem = container.getNamed<MeshSystem>(
    IDENTIFIER.Systems,
    IDENTIFIER.MeshSystem,
  );
  const geometrySystem = container.getNamed<GeometrySystem>(
    IDENTIFIER.Systems,
    IDENTIFIER.GeometrySystem,
  );
  const sceneGraph = container.getNamed<SceneGraphSystem>(
    IDENTIFIER.Systems,
    IDENTIFIER.SceneGraphSystem,
  );

  const transformComponentManager = sceneGraph.getTransformComponentManager();
  const hierarchyComponentManager = sceneGraph.getHierarchyComponentManager();
  const nameManager = container.get<ComponentManager<NameComponent>>(
    IDENTIFIER.NameComponentManager,
  );
  const cullableManager = container.get<ComponentManager<CullableComponent>>(
    IDENTIFIER.CullableComponentManager,
  );
  const meshManager = container.get<ComponentManager<MeshComponent>>(
    IDENTIFIER.MeshComponentManager,
  );
  const geometryManager = container.get<ComponentManager<GeometryComponent>>(
    IDENTIFIER.GeometryComponentManager,
  );

  afterEach(() => {
    nameManager.clear();
    transformComponentManager.clear();
    hierarchyComponentManager.clear();
    cullableManager.clear();
    meshManager.clear();
  });

  test('should do frustum culling correctly.', () => {
    const projectionMatrix = mat4.create();
    mat4.ortho(projectionMatrix, -10, 10, -10, 10, 1, 1000);

    const viewMatrix = mat4.create();
    mat4.invert(
      viewMatrix,
      mat4.lookAt(
        mat4.create(),
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(0, 1, 0),
      ),
    );

    const vpMatrix = mat4.mul(mat4.create(), projectionMatrix, viewMatrix);

    const frustum = new Frustum();
    frustum.extractFromVPMatrix(vpMatrix);

    let aabb = new AABB();

    // BVH 相交检测：父节点完全位于视锥内或者外部
    let result = meshSystem.computeVisibilityWithPlaneMask(
      aabb,
      Mask.INSIDE,
      frustum.planes,
    );
    expect(result).toBe(Mask.INSIDE);

    result = meshSystem.computeVisibilityWithPlaneMask(
      aabb,
      Mask.OUTSIDE,
      frustum.planes,
    );
    expect(result).toBe(Mask.OUTSIDE);

    // 在视锥内
    aabb = new AABB(vec3.fromValues(0, 0, 5), vec3.fromValues(1, 1, 1));
    result = meshSystem.computeVisibilityWithPlaneMask(
      aabb,
      Mask.INDETERMINATE,
      frustum.planes,
    );
    expect(result).toBe(Mask.INSIDE);

    // 在视锥外（相机后）
    aabb = new AABB(vec3.fromValues(0, 0, 0));
    result = meshSystem.computeVisibilityWithPlaneMask(
      aabb,
      Mask.INDETERMINATE,
      frustum.planes,
    );
    expect(result).toBe(Mask.OUTSIDE);

    // 在视锥外（视锥正上方）
    aabb = new AABB(vec3.fromValues(0, 20, 10));
    result = meshSystem.computeVisibilityWithPlaneMask(
      aabb,
      Mask.INDETERMINATE,
      frustum.planes,
    );
    expect(result).toBe(Mask.OUTSIDE);

    // 相交（视锥 bottom plane，index 为 2）
    aabb = new AABB(vec3.fromValues(9, 10, 10));
    result = meshSystem.computeVisibilityWithPlaneMask(
      aabb,
      Mask.INDETERMINATE,
      frustum.planes,
    );
    expect(result).toBe(1 << 2);

    // 相交（视锥 left & bottom plane）
    aabb = new AABB(vec3.fromValues(10, 10, 10));
    result = meshSystem.computeVisibilityWithPlaneMask(
      aabb,
      Mask.INDETERMINATE,
      frustum.planes,
    );
    expect(result).toBe((1 << 1) | (1 << 2));
  });

  test('should do frustum culling correctly.', () => {
    const projectionMatrix = mat4.create();
    mat4.ortho(projectionMatrix, -10, 10, -10, 10, 1, 1000);

    const viewMatrix = mat4.create();
    mat4.invert(
      viewMatrix,
      mat4.lookAt(
        mat4.create(),
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(0, 1, 0),
      ),
    );

    const vpMatrix = mat4.mul(mat4.create(), projectionMatrix, viewMatrix);

    const frustum = new Frustum();
    frustum.extractFromVPMatrix(vpMatrix);

    const boxGeometry = geometrySystem.createBox();

    const mesh1 = meshSystem.createMesh({
      geometry: boxGeometry,
    });
    const mesh2 = meshSystem.createMesh({
      geometry: boxGeometry,
    });

    sceneGraph.attach(mesh2, mesh1);

    const transform1 = transformComponentManager.getComponentByEntity(mesh1);
    const transform2 = transformComponentManager.getComponentByEntity(mesh2);

    transform1?.translate(vec3.fromValues(0, 0, 5));

    meshSystem.setFrustumPlanes(frustum.planes);
    sceneGraph.execute();
    meshSystem.execute();

    // expect(cullableManager.getComponentByEntity(mesh1)?.visible).toBeTruthy();
    // expect(cullableManager.getComponentByEntity(mesh2)?.visible).toBeTruthy();
  });
});
