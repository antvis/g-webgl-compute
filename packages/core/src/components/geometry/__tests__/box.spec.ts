import { mat4, quat, vec3 } from 'gl-matrix';
import { injectable } from 'inversify';
import 'reflect-metadata';
import {
  ComponentManager,
  container,
  createEntity,
  IDENTIFIER,
  // @ts-ignore
  IRenderEngine,
} from '../../..';
import { GeometryComponent } from '../GeometryComponent';
import { GeometrySystem } from '../System';

@injectable()
class MockRenderEngine {}

describe('Box geometry', () => {
  container
    .bind<IRenderEngine>(IDENTIFIER.RenderEngine)
    // @ts-ignore
    .to(MockRenderEngine)
    .inSingletonScope();

  const geometrySystem = container.getNamed<GeometrySystem>(
    IDENTIFIER.Systems,
    IDENTIFIER.GeometrySystem,
  );

  const geometryManager = container.get<ComponentManager<GeometryComponent>>(
    IDENTIFIER.GeometryComponentManager,
  );

  afterEach(() => {
    geometryManager.clear();
  });

  afterAll(() => {
    container.unbind(IDENTIFIER.RenderEngine);
  });

  test('should generate a box geometry with default params.', () => {
    const entity = geometrySystem.createBox();
    const geometry = geometryManager.getComponentByEntity(entity);

    expect(geometry?.indices).toStrictEqual(
      Uint32Array.from([
        2,
        1,
        0,
        2,
        3,
        1,
        6,
        5,
        4,
        6,
        7,
        5,
        10,
        9,
        8,
        10,
        11,
        9,
        14,
        13,
        12,
        14,
        15,
        13,
        18,
        17,
        16,
        18,
        19,
        17,
        22,
        21,
        20,
        22,
        23,
        21,
      ]),
    );

    // expect(geometry?.aabb.center).toStrictEqual(vec3.create());
    // expect(geometry?.aabb.getMin()).toStrictEqual(
    //   vec3.fromValues(-0.5, -0.5, -0.5),
    // );
    // expect(geometry?.aabb.getMax()).toStrictEqual(
    //   vec3.fromValues(0.5, 0.5, 0.5),
    // );
  });

  test('should generate a box geometry with width/height/depthSegments.', () => {
    const entity = geometrySystem.createBox({
      widthSegments: 2,
      heightSegments: 2,
      depthSegments: 2,
    });
    const geometry = geometryManager.getComponentByEntity(entity);

    expect(geometry?.indices?.length).toBe(144);
  });

  test('should generate a box geometry with halfExtents.', () => {
    const entity = geometrySystem.createBox({
      halfExtents: vec3.fromValues(2, 2, 2),
    });
    const geometry = geometryManager.getComponentByEntity(entity);

    // expect(geometry?.aabb.getMin()).toStrictEqual(vec3.fromValues(-2, -2, -2));
    // expect(geometry?.aabb.getMax()).toStrictEqual(vec3.fromValues(2, 2, 2));
  });
});
