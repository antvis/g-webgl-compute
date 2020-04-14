import { vec3 } from 'gl-matrix';
import { BoundingSphere } from '../BoundingSphere';

describe('Bounding Sphere', () => {
  test('should overlap with another bounding sphere.', () => {
    const sphere1 = new BoundingSphere();
    const sphere2 = new BoundingSphere();
    const sphere3 = new BoundingSphere(vec3.fromValues(10, 0, 0));

    expect(sphere1.intersects(sphere2)).toBeTruthy();
    expect(sphere1.intersects(sphere3)).toBeFalsy();
  });

  test('should contain a point.', () => {
    const sphere1 = new BoundingSphere();

    expect(sphere1.containsPoint(vec3.fromValues(0, 0, 0))).toBeTruthy();
    expect(sphere1.containsPoint(vec3.fromValues(10, 0, 0))).toBeFalsy();
  });
});
