import { mat4, quat, vec3 } from 'gl-matrix';
import { TransformComponent } from '../TransformComponent';

describe('Transform component', () => {
  test('should rotate correctly.', () => {
    const component = new TransformComponent();

    component.rotate(quat.create());
    component.updateTransform();

    expect(component.getRotation()).toStrictEqual(quat.create());
  });

  test('should scale correctly.', () => {
    const component = new TransformComponent();

    component.scale(vec3.fromValues(2, 2, 2));
    component.updateTransform();

    expect(component.getScale()).toStrictEqual(vec3.fromValues(2, 2, 2));
  });

  test('should rotate with pitch correctly.', () => {
    const component = new TransformComponent();

    component.rotateRollPitchYaw(90, 0, 0);
    component.updateTransform();

    expect(component.getRotation()).toStrictEqual(
      quat.fromValues(Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
    );
  });

  test('should lerp correctly.', () => {
    const component = new TransformComponent();
    const componentA = new TransformComponent();
    const componentB = new TransformComponent();

    componentA.translate(vec3.fromValues(10, 0, 0));
    componentB.translate(vec3.fromValues(20, 0, 0));
    componentA.updateTransform();
    componentB.updateTransform();

    expect(componentA.getPosition()).toStrictEqual(vec3.fromValues(10, 0, 0));

    component.lerp(componentA, componentB, 0.5);
    component.updateTransform();

    expect(component.localTranslation).toStrictEqual(vec3.fromValues(15, 0, 0));
  });

  test('should clear localMatrix correctly.', () => {
    const component = new TransformComponent();

    component.scale(vec3.fromValues(2, 2, 2));
    component.updateTransform();

    expect(component.getScale()).toStrictEqual(vec3.fromValues(2, 2, 2));

    component.clearTransform();
    expect(component.getLocalMatrix()).toStrictEqual(mat4.create());
  });
});
