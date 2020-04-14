import { mat4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { Entity, IDENTIFIER } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { ExecuteSystem } from '../../System';
import { MeshComponent } from '../mesh/MeshComponent';
import { HierarchyComponent } from './HierarchyComponent';
import { TransformComponent } from './TransformComponent';

@injectable()
export class SceneGraphSystem extends ExecuteSystem {
  public name = IDENTIFIER.SceneGraphSystem;

  @inject(IDENTIFIER.HierarchyComponentManager)
  private readonly hierarchy: ComponentManager<HierarchyComponent>;

  @inject(IDENTIFIER.TransformComponentManager)
  private readonly transform: ComponentManager<TransformComponent>;

  @inject(IDENTIFIER.MeshComponentManager)
  private readonly mesh: ComponentManager<MeshComponent>;

  public async execute() {
    this.runTransformUpdateSystem();
    this.runHierarchyUpdateSystem();
  }

  public getHierarchyComponentManager() {
    return this.hierarchy;
  }

  public getTransformComponentManager() {
    return this.transform;
  }

  public runTransformUpdateSystem() {
    // 原版基于 JobSystem 实现
    this.transform.forEach((entity, transform) => {
      if (transform.isDirty()) {
        // 需要通知 mesh（如果有）更新 aabb
        const mesh = this.mesh.getComponentByEntity(entity);
        if (mesh) {
          mesh.aabbDirty = true;
        }
        transform.updateTransform();
      }
    });
  }

  public runHierarchyUpdateSystem() {
    this.hierarchy.forEach((entity, parentComponent) => {
      const transformChild = this.transform.getComponentByEntity(entity);
      const transformParent = this.transform.getComponentByEntity(
        parentComponent.parentID,
      );
      if (transformChild !== null && transformParent !== null) {
        transformChild.updateTransformWithParent(transformParent);
      }
    });
  }

  public attach(
    entity: Entity,
    parent: Entity,
    isChildAlreadyInLocalSpace?: boolean,
  ) {
    if (this.hierarchy.contains(entity)) {
      this.detach(entity);
    }

    this.hierarchy.create(entity, {
      parentID: parent,
    });

    if (this.hierarchy.getCount() > 1) {
      for (let i = this.hierarchy.getCount() - 1; i > 0; --i) {
        const parentCandidateEntity = this.hierarchy.getEntity(i);
        // const parentCandidateComponent = this.hierarchy.getComponent(i);
        for (let j = 0; j < i; ++j) {
          const childCandidateEntity = this.hierarchy.getComponent(j);

          if (childCandidateEntity.parentID === parentCandidateEntity) {
            this.hierarchy.moveItem(i, j);
            ++i; // next outer iteration will check the same index again as parent candidate, however things were moved upwards, so it will be a different entity!
            break;
          }
        }
      }
    }

    // Re-query parent after potential MoveItem(), because it invalidates references:
    const parentcomponent = this.hierarchy.getComponentByEntity(entity);

    let transformParent = this.transform.getComponentByEntity(parent);
    if (transformParent === null) {
      transformParent = this.transform.create(parent);
    }

    let transformChild = this.transform.getComponentByEntity(entity);
    if (transformChild === null) {
      transformChild = this.transform.create(entity);
      // after transforms.Create(), transform_parent pointer could have become invalidated!
      transformParent = this.transform.getComponentByEntity(parent);
    }
    if (!isChildAlreadyInLocalSpace && transformParent) {
      transformChild.matrixTransform(
        mat4.invert(mat4.create(), transformParent.worldTransform),
      );
      transformChild.updateTransform();
    }
    if (transformParent) {
      transformChild.updateTransformWithParent(transformParent);
    }
  }

  public detach(entity: Entity) {
    const parent = this.hierarchy.getComponentByEntity(entity);
    if (parent !== null) {
      const transform = this.transform.getComponentByEntity(entity);
      if (transform !== null) {
        transform.applyTransform();
      }

      this.hierarchy.removeKeepSorted(entity);
    }
  }

  public detachChildren(parent: Entity) {
    for (let i = 0; i < this.hierarchy.getCount(); ) {
      if (this.hierarchy.getComponent(i)?.parentID === parent) {
        const entity = this.hierarchy.getEntity(i);
        this.detach(entity);
      } else {
        ++i;
      }
    }
  }
}
