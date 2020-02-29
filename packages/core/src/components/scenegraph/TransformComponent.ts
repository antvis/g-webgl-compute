import { mat4, quat, vec3, vec4 } from 'gl-matrix';
import { Component, NonFunctionProperties } from '../../ComponentManager';

export class TransformComponent extends Component<TransformComponent> {
  public static DIRTY = 1 << 0;

  public dirtyFlag: number;

  /**
   * local space RTS
   */

  /**
   * XMFLOAT4X4._41
   * @see https://docs.microsoft.com/en-us/windows/win32/api/directxmath/nf-directxmath-xmfloat4x4-xmfloat4x4(constfloat)#remarks
   */
  public localTranslation = vec3.fromValues(0, 0, 0);
  public localRotation = quat.fromValues(0, 0, 0, 1);
  public localScale = vec3.fromValues(1, 1, 1);
  public localTransform = mat4.create();

  /**
   * world space RTS
   */

  // public position = vec3.fromValues(0, 0, 0);
  // public rotation = quat.fromValues(0, 0, 0, 1);
  public worldTransform = mat4.create();

  // 高阶函数，利用闭包重复利用临时变量
  // @see playcanvas graph node
  public getRotation = (() => {
    const rotation = quat.create();
    return () => {
      mat4.getRotation(rotation, this.worldTransform);
      return rotation;
    };
  })();

  public getScale = (() => {
    const scaling = vec3.create();
    return () => {
      mat4.getScaling(scaling, this.worldTransform);
      return scaling;
    };
  })();

  public getPosition = (() => {
    const translation = vec3.create();
    return () => {
      mat4.getTranslation(translation, this.worldTransform);
      return translation;
    };
  })();

  public getLocalMatrix = (() => {
    const rts = mat4.create();
    return () => {
      mat4.fromRotationTranslationScale(
        rts,
        this.localRotation,
        this.localTranslation,
        this.localScale,
      );
      return rts;
    };
  })();

  public matrixTransform = (() => {
    const transformed = mat4.create();
    return (mat: mat4) => {
      mat4.multiply(transformed, this.getLocalMatrix(), mat);
      mat4.getScaling(this.localScale, transformed);
      mat4.getTranslation(this.localTranslation, transformed);
      mat4.getRotation(this.localRotation, transformed);
    };
  })();

  /**
   * @see https://docs.microsoft.com/en-us/windows/win32/api/directxmath/nf-directxmath-xmquaternionrotationrollpitchyaw
   */
  public rotateRollPitchYaw = (() => {
    const quatX = quat.create();
    const quatY = quat.create();
    const quatZ = quat.create();
    return (x: number, y: number, z: number) => {
      this.setDirty();

      quat.fromEuler(quatX, x, 0, 0);
      quat.fromEuler(quatY, 0, y, 0);
      quat.fromEuler(quatZ, 0, 0, z);

      quat.multiply(this.localRotation, quatX, this.localRotation);
      quat.multiply(this.localRotation, this.localRotation, quatY);
      quat.multiply(this.localRotation, quatZ, this.localRotation);
      quat.normalize(this.localRotation, this.localRotation);
    };
  })();

  /**
   * @see https://xiaoiver.github.io/coding/2018/12/28/Camera-%E8%AE%BE%E8%AE%A1-%E4%B8%80.html
   */
  public lerp = (() => {
    const aS = vec3.create();
    const aR = quat.create();
    const aT = vec3.create();
    const bS = vec3.create();
    const bR = quat.create();
    const bT = vec3.create();
    return (a: TransformComponent, b: TransformComponent, t: number) => {
      this.setDirty();

      mat4.getScaling(aS, a.worldTransform);
      mat4.getTranslation(aT, a.worldTransform);
      mat4.getRotation(aR, a.worldTransform);
      mat4.getScaling(bS, b.worldTransform);
      mat4.getTranslation(bT, b.worldTransform);
      mat4.getRotation(bR, b.worldTransform);

      vec3.lerp(this.localScale, aS, bS, t);
      quat.slerp(this.localRotation, aR, bR, t);
      vec3.lerp(this.localTranslation, aT, bT, t);
    };
  })();

  /**
   * @see https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline
   */
  // public catmullRom = (() => {
  //   const aS = vec3.create();
  //   const aR = quat.create();
  //   const aT = vec3.create();
  //   const bS = vec3.create();
  //   const bR = quat.create();
  //   const bT = vec3.create();
  //   const cS = vec3.create();
  //   const cR = quat.create();
  //   const cT = vec3.create();
  //   const dS = vec3.create();
  //   const dR = quat.create();
  //   const dT = vec3.create();
  //   const R = quat.create();
  //   return (
  //     a: TransformComponent,
  //     b: TransformComponent,
  //     c: TransformComponent,
  //     d: TransformComponent,
  //     t: number,
  //   ) => {
  //     this.setDirty();
  //     mat4.getScaling(aS, a.worldTransform);
  //     mat4.getTranslation(aT, a.worldTransform);
  //     mat4.getRotation(aR, a.worldTransform);
  //     mat4.getScaling(bS, b.worldTransform);
  //     mat4.getTranslation(bT, b.worldTransform);
  //     mat4.getRotation(bR, b.worldTransform);
  //     mat4.getScaling(cS, c.worldTransform);
  //     mat4.getTranslation(cT, c.worldTransform);
  //     mat4.getRotation(cR, c.worldTransform);
  //     mat4.getScaling(dS, d.worldTransform);
  //     mat4.getTranslation(dT, d.worldTransform);
  //     mat4.getRotation(dR, d.worldTransform);

  //     vec3.catmullRom(this.localTranslation, aT, bT, cT, dT, t);
  //     vec3.catmullRom(R, aR, bR, cR, dR, t);
  //     quat.normalize(this.localRotation, R);
  //     vec3.catmullRom(this.localScale, aS, bS, cS, dS, t);
  //   };
  // })();

  constructor(data?: Partial<NonFunctionProperties<TransformComponent>>) {
    super(data);
  }

  public isDirty() {
    return this.dirtyFlag;
  }

  public setDirty(value = true) {
    if (value) {
      this.dirtyFlag |= TransformComponent.DIRTY;
    } else {
      this.dirtyFlag &= ~TransformComponent.DIRTY;
    }
  }

  public updateTransform() {
    if (this.isDirty()) {
      this.setDirty(false);
      mat4.copy(this.worldTransform, this.getLocalMatrix());
    }
  }

  public updateTransformWithParent(parent: TransformComponent) {
    mat4.multiply(
      this.worldTransform,
      this.getLocalMatrix(),
      parent.worldTransform,
    );
  }

  public applyTransform() {
    this.setDirty();

    mat4.getScaling(this.localScale, this.worldTransform);
    mat4.getTranslation(this.localTranslation, this.worldTransform);
    mat4.getRotation(this.localRotation, this.worldTransform);
  }

  public clearTransform() {
    this.setDirty();
    this.localTranslation = vec3.fromValues(0, 0, 0);
    this.localRotation = quat.fromValues(0, 0, 0, 1);
    this.localScale = vec3.fromValues(1, 1, 1);
  }

  /**
   * TODO: 支持以下两种：
   * * translate(x, y, z)
   * * translate(vec3(x, y, z))
   */
  public translate(translation: vec3) {
    this.setDirty();
    vec3.add(this.localTranslation, this.localTranslation, translation);
  }

  public scale(scaling: vec3) {
    this.setDirty();
    vec3.multiply(this.localScale, this.localScale, scaling);
  }

  public rotate(quaternion: quat) {
    this.setDirty();
    quat.multiply(this.localRotation, this.localRotation, quaternion);
    quat.normalize(this.localRotation, this.localRotation);
  }
}
