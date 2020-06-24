import { mat3, mat4, vec3 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { createEntity } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { AABB } from '../../shape/AABB';
import { Mask } from '../../shape/Frustum';
import { Plane } from '../../shape/Plane';
import { getRotationScale } from '../../utils/math';
import { CameraComponent } from '../camera/CameraComponent';
import { GeometryComponent } from '../geometry/GeometryComponent';
import { MaterialComponent } from '../material/MaterialComponent';
import { SceneComponent } from '../scene/SceneComponent';
import { HierarchyComponent } from '../scenegraph/HierarchyComponent';
import { NameComponent } from '../scenegraph/NameComponent';
import { TransformComponent } from '../scenegraph/TransformComponent';
import { CullableComponent } from './CullableComponent';
import { IMeshParams } from './interface';
import { MeshComponent } from './MeshComponent';

@injectable()
export class MeshSystem implements ISystem {
  @inject(IDENTIFIER.SceneComponentManager)
  private readonly scene: ComponentManager<SceneComponent>;

  @inject(IDENTIFIER.CameraComponentManager)
  private readonly camera: ComponentManager<CameraComponent>;

  @inject(IDENTIFIER.MeshComponentManager)
  private readonly mesh: ComponentManager<MeshComponent>;

  @inject(IDENTIFIER.CullableComponentManager)
  private readonly cullable: ComponentManager<CullableComponent>;

  @inject(IDENTIFIER.GeometryComponentManager)
  private readonly geometry: ComponentManager<GeometryComponent>;

  @inject(IDENTIFIER.MaterialComponentManager)
  private readonly material: ComponentManager<MaterialComponent>;

  @inject(IDENTIFIER.HierarchyComponentManager)
  private readonly hierarchy: ComponentManager<HierarchyComponent>;

  @inject(IDENTIFIER.NameComponentManager)
  private readonly nameManager: ComponentManager<NameComponent>;

  @inject(IDENTIFIER.TransformComponentManager)
  private readonly transform: ComponentManager<TransformComponent>;

  private planes: Plane[];

  public setFrustumPlanes(planes: Plane[]) {
    this.planes = planes;
  }

  public async execute() {
    this.scene.forEach((sceneEntity, scene) => {
      // get VP matrix from camera
      const camera = this.camera.getComponentByEntity(scene.camera)!;
      this.mesh.forEach((entity, component) => {
        const hierarchyComponent = this.hierarchy.getComponentByEntity(entity);
        const cullableComponent = this.cullable.getComponentByEntity(entity);
        const geometryComponent = this.geometry.getComponentByEntity(
          component.geometry,
        );
        const meshTransform = this.transform.getComponentByEntity(entity);

        // update mesh.aabb
        if (
          geometryComponent &&
          geometryComponent.aabb &&
          meshTransform &&
          component.aabbDirty
        ) {
          const { worldTransform } = meshTransform;

          // apply transform to geometry.aabb
          const { center, halfExtents } = geometryComponent.aabb;
          const transformedCenter = vec3.transformMat4(
            vec3.create(),
            center,
            worldTransform,
          );

          const rotationScale = getRotationScale(worldTransform, mat3.create());
          const transformedHalfExtents = vec3.transformMat3(
            vec3.create(),
            halfExtents,
            rotationScale,
          );

          component.aabb.update(transformedCenter, transformedHalfExtents);
          component.aabbDirty = false;
        }

        // culling
        if (cullableComponent && geometryComponent) {
          const parentCullableComponent = this.cullable.getComponentByEntity(
            hierarchyComponent?.parentID || -1,
          );
          cullableComponent.visibilityPlaneMask = this.computeVisibilityWithPlaneMask(
            component.aabb,
            parentCullableComponent?.visibilityPlaneMask || Mask.INDETERMINATE,
            this.planes || camera.getFrustum().planes,
          );
          cullableComponent.visible =
            cullableComponent.visibilityPlaneMask !== Mask.OUTSIDE;
        }
      });
    });
  }

  public tearDown() {
    this.cullable.clear();
    this.mesh.clear();
  }

  public createMesh(params: IMeshParams) {
    const entity = createEntity();
    this.mesh.create(entity, params);
    this.transform.create(entity);
    this.cullable.create(entity);
    // if (name) {
    //   this.nameManager.create(entity, {
    //     name,
    //   });
    // }
    return entity;
  }

  /**
   *
   * @see「Optimized View Frustum Culling Algorithms for Bounding Boxes」
   * @see https://github.com/antvis/GWebGPUEngine/issues/3
   *
   * * 基础相交测试 the basic intersection test
   * * 标记 masking @see https://cesium.com/blog/2015/08/04/fast-hierarchical-culling/
   * * TODO: 平面一致性测试 the plane-coherency test
   * * TODO: 支持 mesh 指定自身的剔除策略，参考 Babylon.js @see https://doc.babylonjs.com/how_to/optimizing_your_scene#changing-mesh-culling-strategy
   *
   * @param aabb aabb
   * @param parentPlaneMask mask of parent
   * @param planes planes of frustum
   */
  public computeVisibilityWithPlaneMask(
    aabb: AABB,
    parentPlaneMask: Mask,
    planes: Plane[],
  ) {
    if (parentPlaneMask === Mask.OUTSIDE || parentPlaneMask === Mask.INSIDE) {
      // 父节点完全位于视锥内或者外部，直接返回
      return parentPlaneMask;
    }

    // Start with MASK_INSIDE (all zeros) so that after the loop, the return value can be compared with MASK_INSIDE.
    // (Because if there are fewer than 31 planes, the upper bits wont be changed.)
    let mask = Mask.INSIDE;

    for (let k = 0, len = planes.length; k < len; ++k) {
      // For k greater than 31 (since 31 is the maximum number of INSIDE/INTERSECTING bits we can store), skip the optimization.
      const flag = k < 31 ? 1 << k : 0;
      if (k < 31 && (parentPlaneMask & flag) === 0) {
        // 父节点处于当前面内部，可以跳过
        continue;
      }

      // 使用 p-vertex 和 n-vertex 加速，避免进行平面和 aabb 全部顶点的相交检测
      const { normal, distance } = planes[k];
      if (
        vec3.dot(normal, aabb.getNegativeFarPoint(planes[k])) + distance >
        0
      ) {
        return Mask.OUTSIDE;
      }
      if (
        vec3.dot(normal, aabb.getPositiveFarPoint(planes[k])) + distance >
        0
      ) {
        // 和当前面相交，对应位置为1，继续检测下一个面
        mask |= flag;
      }
    }

    return mask;
  }
}
