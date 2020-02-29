import { mat4, quat, vec3 } from 'gl-matrix';
import 'reflect-metadata';
import { container, createEntity, IDENTIFIER } from '../../..';
import { SceneGraphSystem } from '../System';

describe('SceneGraph', () => {
  const sceneGraph = container.get<SceneGraphSystem>(
    IDENTIFIER.SceneGraphSystem,
  );
  const transformComponentManager = sceneGraph.getTransformComponentManager();
  const hierarchyComponentManager = sceneGraph.getHierarchyComponentManager();

  afterEach(() => {
    transformComponentManager.clear();
    hierarchyComponentManager.clear();
  });

  test('should attach a child entity to a parent.', () => {
    const childEntity = createEntity();
    const parentEntity = createEntity();

    sceneGraph.attach(childEntity, parentEntity);
    sceneGraph.runTransformUpdateSystem();
    sceneGraph.runHierarchyUpdateSystem();

    const parentTransformComponent = transformComponentManager.getComponentByEntity(
      parentEntity,
    );
    const childTransformComponent = transformComponentManager.getComponentByEntity(
      childEntity,
    );

    expect(parentTransformComponent?.worldTransform).toStrictEqual(
      mat4.create(),
    );
    expect(childTransformComponent?.worldTransform).toStrictEqual(
      mat4.create(),
    );
  });

  test('should detach a child entity from a parent.', () => {
    const childEntity = createEntity();
    const parentEntity = createEntity();

    sceneGraph.attach(childEntity, parentEntity);
    sceneGraph.runTransformUpdateSystem();
    sceneGraph.runHierarchyUpdateSystem();

    expect(hierarchyComponentManager.getCount()).toBe(1);

    sceneGraph.detach(childEntity);
    sceneGraph.runTransformUpdateSystem();
    sceneGraph.runHierarchyUpdateSystem();

    expect(hierarchyComponentManager.getCount()).toBe(0);
    expect(hierarchyComponentManager.getComponentByEntity(childEntity)).toBe(
      null,
    );
  });

  test("should detach all its' children from a parent entity.", () => {
    const childEntity = createEntity();
    const parentEntity = createEntity();

    sceneGraph.attach(childEntity, parentEntity);
    sceneGraph.runTransformUpdateSystem();
    sceneGraph.runHierarchyUpdateSystem();

    expect(hierarchyComponentManager.getCount()).toBe(1);

    sceneGraph.detachChildren(parentEntity);
    sceneGraph.runTransformUpdateSystem();
    sceneGraph.runHierarchyUpdateSystem();

    expect(hierarchyComponentManager.getCount()).toBe(0);
  });

  test("should apply parent's world transform to its child.", () => {
    const childEntity = createEntity();
    const parentEntity = createEntity();

    sceneGraph.attach(childEntity, parentEntity);
    sceneGraph.runTransformUpdateSystem();
    sceneGraph.runHierarchyUpdateSystem();

    const parentTransformComponent = transformComponentManager.getComponentByEntity(
      parentEntity,
    );
    const childTransformComponent = transformComponentManager.getComponentByEntity(
      childEntity,
    );

    expect(parentTransformComponent?.worldTransform).toStrictEqual(
      mat4.create(),
    );
    expect(childTransformComponent?.worldTransform).toStrictEqual(
      mat4.create(),
    );

    // scaling parent and affect its' children
    const scaling = vec3.fromValues(2, 2, 2);
    parentTransformComponent?.scale(scaling);
    sceneGraph.runTransformUpdateSystem();
    sceneGraph.runHierarchyUpdateSystem();
    expect(parentTransformComponent?.worldTransform).toStrictEqual(
      mat4.fromScaling(mat4.create(), scaling),
    );
    expect(childTransformComponent?.worldTransform).toStrictEqual(
      mat4.fromScaling(mat4.create(), scaling),
    );

    // translate child
    const translation = vec3.fromValues(1, 0, 0);
    childTransformComponent?.translate(translation);
    sceneGraph.runTransformUpdateSystem();
    sceneGraph.runHierarchyUpdateSystem();
    expect(parentTransformComponent?.worldTransform).toStrictEqual(
      mat4.fromScaling(mat4.create(), scaling),
    );
    expect(childTransformComponent?.worldTransform).toStrictEqual(
      mat4.fromRotationTranslationScale(
        mat4.create(),
        quat.create(),
        translation,
        scaling,
      ),
    );
  });
});
