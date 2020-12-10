import { Component, Entity, MaterialComponent } from '../..';
import { NonFunctionProperties } from '../../ComponentManager';
import { AABB } from '../../shape/AABB';
import { GeometryComponent } from '../geometry/GeometryComponent';
import { IModel } from '../renderer/IModel';

export class MeshComponent extends Component<MeshComponent> {
  public material: MaterialComponent;

  public geometry: GeometryComponent;

  /**
   * aabb 应该存在 Mesh 而非 Geometry 中，原因包括：
   * 1. 包围盒会受 transform 影响。例如每次 transform 之后应该重新计算包围盒（center 发生偏移）。
   * 2. 多个 Mesh 可以共享一个 Geometry，但可以各自拥有不同的 aabb
   */
  public aabb: AABB = new AABB();

  /**
   * transform 之后需要重新计算包围盒
   */
  public aabbDirty = true;

  /**
   * 实际渲染 Model
   */
  public model: IModel | undefined;

  public visible = true;

  public children: Entity[] = [];

  constructor(data: Partial<NonFunctionProperties<MeshComponent>>) {
    super(data);

    Object.assign(this, data);
  }
}
