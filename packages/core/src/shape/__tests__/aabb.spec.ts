import { mat4, quat, vec3 } from 'gl-matrix';
import { AABB } from '../AABB';
import { Plane } from '../Plane';
import { Ray } from '../Ray';

describe('AABB', () => {
  test('should construct correctly.', () => {
    const aabb = new AABB();

    expect(aabb.getMin()).toStrictEqual(vec3.fromValues(-0.5, -0.5, -0.5));
    expect(aabb.getMax()).toStrictEqual(vec3.fromValues(0.5, 0.5, 0.5));

    aabb.setMinMax(vec3.fromValues(1, 1, 1), vec3.fromValues(2, 2, 2));
    expect(aabb.center).toStrictEqual(vec3.fromValues(1.5, 1.5, 1.5));
    expect(aabb.halfExtents).toStrictEqual(vec3.fromValues(0.5, 0.5, 0.5));
    expect(aabb.getMin()).toStrictEqual(vec3.fromValues(1, 1, 1));
    expect(aabb.getMax()).toStrictEqual(vec3.fromValues(2, 2, 2));
  });

  test('should merge 2 AABBs correctly.', () => {
    const aabb1 = new AABB(vec3.fromValues(0, 0, 0));
    const aabb2 = new AABB(vec3.fromValues(1, 1, 1));

    aabb1.add(aabb2);

    expect(aabb1.center).toStrictEqual(vec3.fromValues(0.5, 0.5, 0.5));
    expect(aabb1.halfExtents).toStrictEqual(vec3.fromValues(1, 1, 1));
    expect(aabb1.getMin()).toStrictEqual(vec3.fromValues(-0.5, -0.5, -0.5));
    expect(aabb1.getMax()).toStrictEqual(vec3.fromValues(1.5, 1.5, 1.5));
  });

  test('should intersects with another AABB.', () => {
    const aabb1 = new AABB(vec3.fromValues(0, 0, 0));
    const aabb2 = new AABB(vec3.fromValues(1, 1, 1));
    const aabb3 = new AABB(vec3.fromValues(2, 2, 2));

    expect(aabb1.intersects(aabb2)).toBeTruthy();
    expect(aabb1.intersects(aabb3)).toBeFalsy();
  });

  test('should contains a Point.', () => {
    const aabb1 = new AABB(vec3.fromValues(0, 0, 0));

    expect(aabb1.containsPoint(vec3.fromValues(0.1, 0.1, 0.1))).toBeTruthy();
    expect(aabb1.containsPoint(vec3.fromValues(0.6, 0.1, 0.1))).toBeFalsy();
  });

  test('should intersects with Ray.', () => {
    const aabb1 = new AABB(vec3.fromValues(0, 0, 0));

    const ray1 = new Ray(vec3.fromValues(0, 10, 0), vec3.fromValues(0, -1, 0));
    const ray2 = new Ray(vec3.fromValues(0, 10, 0), vec3.fromValues(0, 1, 0));

    let intersection = vec3.create();
    let intersects = ray1.intersectsAABB(aabb1, intersection);
    expect(intersects).toBeTruthy();
    expect(intersection).toStrictEqual(vec3.fromValues(0, 0.5, 0));

    intersection = vec3.create();
    intersects = ray2.intersectsAABB(aabb1, intersection);
    expect(intersects).toBeFalsy();
    expect(intersection).toStrictEqual(vec3.create());
  });

  test('should get p-vertex & n-vertex based on each plane of culling volume.', () => {
    const aabb = new AABB(vec3.fromValues(0, 0, 0));
    let plane = new Plane(0, vec3.fromValues(1, 1, 1));
    expect(aabb.getNegativeFarPoint(plane)).toStrictEqual(
      vec3.fromValues(-0.5, -0.5, -0.5),
    );
    expect(aabb.getPositiveFarPoint(plane)).toStrictEqual(
      vec3.fromValues(0.5, 0.5, 0.5),
    );

    plane = new Plane(0, vec3.fromValues(1, -1, 1));
    expect(aabb.getNegativeFarPoint(plane)).toStrictEqual(
      vec3.fromValues(-0.5, 0.5, -0.5),
    );
    expect(aabb.getPositiveFarPoint(plane)).toStrictEqual(
      vec3.fromValues(0.5, -0.5, 0.5),
    );

    plane = new Plane(0, vec3.fromValues(1, 1, -1));
    expect(aabb.getNegativeFarPoint(plane)).toStrictEqual(
      vec3.fromValues(-0.5, -0.5, 0.5),
    );
    expect(aabb.getPositiveFarPoint(plane)).toStrictEqual(
      vec3.fromValues(0.5, 0.5, -0.5),
    );

    plane = new Plane(0, vec3.fromValues(-1, 1, 1));
    expect(aabb.getNegativeFarPoint(plane)).toStrictEqual(
      vec3.fromValues(0.5, -0.5, -0.5),
    );
    expect(aabb.getPositiveFarPoint(plane)).toStrictEqual(
      vec3.fromValues(-0.5, 0.5, 0.5),
    );

    plane = new Plane(0, vec3.fromValues(-1, -1, 1));
    expect(aabb.getNegativeFarPoint(plane)).toStrictEqual(
      vec3.fromValues(0.5, 0.5, -0.5),
    );
    expect(aabb.getPositiveFarPoint(plane)).toStrictEqual(
      vec3.fromValues(-0.5, -0.5, 0.5),
    );

    plane = new Plane(0, vec3.fromValues(1, -1, -1));
    expect(aabb.getNegativeFarPoint(plane)).toStrictEqual(
      vec3.fromValues(-0.5, 0.5, 0.5),
    );
    expect(aabb.getPositiveFarPoint(plane)).toStrictEqual(
      vec3.fromValues(0.5, -0.5, -0.5),
    );

    plane = new Plane(0, vec3.fromValues(-1, 1, -1));
    expect(aabb.getNegativeFarPoint(plane)).toStrictEqual(
      vec3.fromValues(0.5, -0.5, 0.5),
    );
    expect(aabb.getPositiveFarPoint(plane)).toStrictEqual(
      vec3.fromValues(-0.5, 0.5, -0.5),
    );

    plane = new Plane(0, vec3.fromValues(-1, -1, -1));
    expect(aabb.getNegativeFarPoint(plane)).toStrictEqual(
      vec3.fromValues(0.5, 0.5, 0.5),
    );
    expect(aabb.getPositiveFarPoint(plane)).toStrictEqual(
      vec3.fromValues(-0.5, -0.5, -0.5),
    );
  });
});
