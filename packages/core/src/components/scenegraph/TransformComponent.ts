import { mat4, quat, vec3, vec4 } from 'gl-matrix';
import { Component, NonFunctionProperties } from '../../ComponentManager';

export class TransformComponent extends Component<TransformComponent> {
  public static DIRTY = 1 << 0;

  public dirtyFlag: number;

  public localDirtyFlag: number;

  public parent: TransformComponent | null = null;

  /**
   * local space RTS
   */

  /**
   * XMFLOAT4X4._41
   * @see https://docs.microsoft.com/en-us/windows/win32/api/directxmath/nf-directxmath-xmfloat4x4-xmfloat4x4(constfloat)#remarks
   */
  public localPosition = vec3.fromValues(0, 0, 0);
  public localRotation = quat.fromValues(0, 0, 0, 1);
  public localScale = vec3.fromValues(1, 1, 1);
  public localTransform = mat4.create();

  /**
   * world space RTS
   */

  public position = vec3.fromValues(0, 0, 0);
  public rotation = quat.fromValues(0, 0, 0, 1);
  public scaling = vec3.fromValues(1, 1, 1);
  public worldTransform = mat4.create();

  // 高阶函数，利用闭包重复利用临时变量
  // @see playcanvas graph node
  public matrixTransform = (() => {
    const transformed = mat4.create();
    return (mat: mat4) => {
      mat4.multiply(transformed, this.getLocalTransform(), mat);
      mat4.getScaling(this.localScale, transformed);
      mat4.getTranslation(this.localPosition, transformed);
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
      vec3.lerp(this.localPosition, aT, bT, t);
    };
  })();

  /**
   * TODO: 支持以下两种：
   * * translate(x, y, z)
   * * translate(vec3(x, y, z))
   */
  public translate = (() => {
    const tr = vec3.create();

    return (translation: vec3) => {
      vec3.add(tr, this.getPosition(), translation);
      this.setPosition(tr);

      this.setDirty(true);

      return this;
    };
  })();

  public translateLocal = (() => {
    return (translation: vec3) => {
      vec3.transformQuat(translation, translation, this.localRotation);
      vec3.add(this.localPosition, this.localPosition, translation);

      this.setLocalDirty(true);

      return this;
    };
  })();

  public setPosition = (() => {
    const parentInvertMatrix = mat4.create();

    return (position: vec3) => {
      this.position = position;

      this.setLocalDirty(true);

      if (this.parent === null) {
        vec3.copy(this.localPosition, position);
      } else {
        mat4.copy(parentInvertMatrix, this.parent.worldTransform);
        mat4.invert(parentInvertMatrix, parentInvertMatrix);
        vec3.transformMat4(this.localPosition, position, parentInvertMatrix);
      }
      return this;
    };
  })();

  public rotate = (() => {
    const parentInvertRotation = quat.create();
    return (quaternion: quat) => {
      if (this.parent === null) {
        quat.multiply(this.localRotation, this.localRotation, quaternion);
        quat.normalize(this.localRotation, this.localRotation);
      } else {
        const rot = this.getRotation();
        const parentRot = this.parent.getRotation();

        quat.copy(parentInvertRotation, parentRot);
        quat.invert(parentInvertRotation, parentInvertRotation);
        quat.multiply(parentInvertRotation, parentInvertRotation, quaternion);
        quat.multiply(this.localRotation, quaternion, rot);
        quat.normalize(this.localRotation, this.localRotation);
      }
      this.setLocalDirty();
      return this;
    };
  })();

  public rotateLocal = (() => {
    return (quaternion: quat) => {
      quat.multiply(this.localRotation, this.localRotation, quaternion);
      quat.normalize(this.localRotation, this.localRotation);
      this.setLocalDirty(true);
      return this;
    };
  })();

  public setRotation = (() => {
    const invParentRot = quat.create();

    return (rotation: quat) => {
      if (this.parent === null) {
        quat.copy(this.localRotation, rotation);
      } else {
        quat.copy(invParentRot, this.parent.getRotation());
        quat.invert(invParentRot, invParentRot);
        quat.copy(this.localRotation, invParentRot);
        quat.mul(this.localRotation, this.localRotation, rotation);
      }

      this.setLocalDirty(true);
      return this;
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

  //     vec3.catmullRom(this.localPosition, aT, bT, cT, dT, t);
  //     vec3.catmullRom(R, aR, bR, cR, dR, t);
  //     quat.normalize(this.localRotation, R);
  //     vec3.catmullRom(this.localScale, aS, bS, cS, dS, t);
  //   };
  // })();

  constructor(data?: Partial<NonFunctionProperties<TransformComponent>>) {
    super(data);
  }

  public setLocalPosition(position: vec3) {
    vec3.copy(this.localPosition, position);
    this.setLocalDirty(true);
  }

  public setLocalScale(scale: vec3) {
    vec3.copy(this.localScale, scale);
    this.setLocalDirty(true);
  }

  public setLocalRotation(rotation: quat) {
    quat.copy(this.localRotation, rotation);

    this.setLocalDirty(true);
    return this;
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

  public isLocalDirty() {
    return this.localDirtyFlag;
  }

  public setLocalDirty(value = true) {
    if (value) {
      this.localDirtyFlag |= TransformComponent.DIRTY;
      this.setDirty(true);
    } else {
      this.localDirtyFlag &= ~TransformComponent.DIRTY;
    }
  }

  public updateTransform() {
    if (this.isLocalDirty()) {
      this.getLocalTransform();
    }
    if (this.isDirty()) {
      if (this.parent === null) {
        mat4.copy(this.worldTransform, this.getLocalTransform());
        this.setDirty(false);
      }
    }
  }

  public updateTransformWithParent(parent: TransformComponent) {
    mat4.multiply(
      this.worldTransform,
      parent.worldTransform,
      this.getLocalTransform(),
    );
  }

  public applyTransform() {
    this.setDirty();

    mat4.getScaling(this.localScale, this.worldTransform);
    mat4.getTranslation(this.localPosition, this.worldTransform);
    mat4.getRotation(this.localRotation, this.worldTransform);
  }

  public clearTransform() {
    this.setDirty();
    this.localPosition = vec3.fromValues(0, 0, 0);
    this.localRotation = quat.fromValues(0, 0, 0, 1);
    this.localScale = vec3.fromValues(1, 1, 1);
  }

  public scaleLocal(scaling: vec3) {
    this.setLocalDirty();
    vec3.multiply(this.localScale, this.localScale, scaling);
    return this;
  }

  public getLocalPosition() {
    return this.localPosition;
  }

  public getLocalRotation() {
    return this.localRotation;
  }

  public getLocalScale() {
    return this.localScale;
  }

  public getLocalTransform() {
    if (this.localDirtyFlag) {
      mat4.fromRotationTranslationScale(
        this.localTransform,
        this.localRotation,
        this.localPosition,
        this.localScale,
      );
      this.setLocalDirty(false);
    }
    return this.localTransform;
  }

  public getWorldTransform() {
    if (!this.isLocalDirty() && !this.isDirty()) {
      return this.worldTransform;
    }

    if (this.parent) {
      this.parent.getWorldTransform();
    }

    this.updateTransform();

    return this.worldTransform;
  }

  public getPosition() {
    mat4.getTranslation(this.position, this.worldTransform);
    return this.position;
  }

  public getRotation() {
    mat4.getRotation(this.rotation, this.worldTransform);
    return this.rotation;
  }

  public getScale() {
    mat4.getScaling(this.scaling, this.worldTransform);
    return this.scaling;
  }
}
