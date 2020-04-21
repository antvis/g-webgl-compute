import { inject, injectable } from 'inversify';
import { Component, createEntity, Entity } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { EMPTY } from '../../Entity';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { NameComponent } from '../scenegraph/NameComponent';
import { PassNodeComponent } from './PassNodeComponent';
import { ResourceHandleComponent } from './ResourceHandleComponent';

/**
 * ported from FrameGraph implemented by SakuraRender
 * @see https://zhuanlan.zhihu.com/p/98572442
 * @see https://github.com/SaeruHikari/Sakura/blob/RenderGraph/SakuraCore/Source/Framework/GraphicTypes/FrameGraph/SakuraFrameGraph.cpp
 */
@injectable()
export class FrameGraphSystem implements ISystem {
  @inject(IDENTIFIER.NameComponentManager)
  private readonly nameManager: ComponentManager<NameComponent>;

  @inject(IDENTIFIER.PassNodeComponentManager)
  private readonly passNodeManager: ComponentManager<PassNodeComponent>;

  @inject(IDENTIFIER.ResourceHandleComponentManager)
  private readonly resourceHandleManager: ComponentManager<
    ResourceHandleComponent
  >;

  // 保存 ref 为 0 的 passNodeEntity 列表
  private rootNodes: Entity[] = [];

  public async execute() {
    // this.runTransformUpdateSystem();
  }

  public tearDown() {
    this.passNodeManager.clear();
    this.resourceHandleManager.clear();
  }

  public setup() {
    this.passNodeManager.forEach((entity, passNode) => {
      passNode.setup();
    });
  }

  public compile() {
    this.passNodeManager.forEach((entity, passNode) => {
      this.compilePassNode(entity, passNode);
      passNode.compiled = true;
    });

    // 保存根节点
    this.rootNodes = [];
    this.passNodeManager.forEach((entity, passNode) => {
      if (passNode.prevs.length === 0) {
        this.rootNodes.push(entity);
      }
    });
  }

  public getPassNodeEntityByName(passNodeName: string) {
    const namedPassNodeIndex = this.nameManager.findIndex(
      (c) => c.name === passNodeName,
    );
    const entity = this.nameManager.getEntityByComponentIndex(
      namedPassNodeIndex,
    );

    if (this.passNodeManager.getComponentByEntity(entity)) {
      return entity;
    }

    return EMPTY;
  }

  public getResourceHandleEntityByName(resourceHandleName: string) {
    const namedResourceHandleIndex = this.nameManager.findIndex(
      (c) => c.name === resourceHandleName,
    );
    const entity = this.nameManager.getEntityByComponentIndex(
      namedResourceHandleIndex,
    );

    if (this.resourceHandleManager.getComponentByEntity(entity)) {
      return entity;
    }

    return EMPTY;
  }

  /**
   * register a new PassNode
   *
   * @param passNodeName
   * @param params
   * @return entity of passNode
   */
  public registerPassNode(passNodeName: string, params: unknown) {
    const existedPassNodeEntity = this.getPassNodeEntityByName(passNodeName);
    if (existedPassNodeEntity === EMPTY) {
      const entity = createEntity();
      this.nameManager.create(entity, {
        name: passNodeName,
      });
      this.passNodeManager.create(entity, {});
      return entity;
    } else {
      return existedPassNodeEntity;
    }
  }

  /**
   * @example
   * const entity = frameGraphSystem.registerPassNode('SSAOPass');
   * frameGraphSystem.confirmInput(entity, ['GBuffer', 'DepthStencil']);
   *
   * @param entity entity of passNode
   * @param resources ResourceNames eg. ['GBuffer', 'DepthStencil']
   */
  public confirmInput(entity: Entity, resources: string[]) {
    const passNode = this.passNodeManager.getComponentByEntity(entity);
    if (passNode) {
      passNode.inputResources = [];
      resources.forEach((resourceName) => {
        const existedResourceHandleEntity = this.getResourceHandleEntityByName(
          resourceName,
        );
        if (existedResourceHandleEntity === EMPTY) {
          const resourceEntity = createEntity();
          this.nameManager.create(resourceEntity, {
            name: resourceName,
          });
          this.resourceHandleManager.create(resourceEntity, {});
          passNode.inputResources.push(resourceEntity);
        } else {
          passNode.inputResources.push(existedResourceHandleEntity);
        }
      });
    }
  }

  public confirmOutput(entity: Entity, resources: string[]) {
    const passNode = this.passNodeManager.getComponentByEntity(entity);
    if (passNode) {
      passNode.outputResources = [];
      resources.forEach((resourceName) => {
        const existedResourceHandleEntity = this.getResourceHandleEntityByName(
          resourceName,
        );
        if (existedResourceHandleEntity === EMPTY) {
          const resourceEntity = createEntity();
          this.nameManager.create(resourceEntity, {
            name: resourceName,
          });
          this.resourceHandleManager.create(resourceEntity, {
            writer: entity,
          });
          passNode.outputResources.push(resourceEntity);
        } else {
          passNode.outputResources.push(existedResourceHandleEntity);
        }
      });
    }
  }

  private compilePassNode(
    entity: Entity,
    passNode: Component<PassNodeComponent> & PassNodeComponent,
  ) {
    // 处理输入资源节点
    for (const resourceEntity of passNode.inputResources) {
      const resource = this.resourceHandleManager.getComponentByEntity(
        resourceEntity,
      );
      const resourceName = this.nameManager.getComponentByEntity(
        resourceEntity,
      );
      if (resource) {
        const parentPassNodeEntity = resource.writer;
        const parentPassNode = this.passNodeManager.getComponentByEntity(
          parentPassNodeEntity,
        );

        // 没有上游输入的资源可以直接跳过
        if (!parentPassNode) {
          continue;
        }

        if (!parentPassNode.compiled) {
          // 首先编译父 PassNode
          if (!this.compilePassNode(parentPassNodeEntity, parentPassNode)) {
            return false;
          }
        }

        if (this.hasOutput(parentPassNode, resourceName?.name || '')) {
          this.addInputPass(
            passNode,
            parentPassNode,
            entity,
            parentPassNodeEntity,
          );
        }
      }
    }

    // 处理输出节点
    for (const resourceEntity of passNode.outputResources) {
      const resource = this.resourceHandleManager.getComponentByEntity(
        resourceEntity,
      );
      if (resource) {
        resource.writer = entity;
      }
    }

    return true;
  }

  private hasOutput(
    passNode: Component<PassNodeComponent> & PassNodeComponent,
    outputResourceName: string,
  ) {
    return !!passNode.outputResources.find((resourceEntity) => {
      const resourceName = this.nameManager.getComponentByEntity(
        resourceEntity,
      );
      return resourceName && resourceName.name === outputResourceName;
    });
  }

  private addInputPass(
    passNode: PassNodeComponent,
    inputPassNode: PassNodeComponent,
    passNodeEntity: Entity,
    inputPassNodeEntity: Entity,
  ) {
    // 已经添加过
    if (
      inputPassNode.nexts.find((e) => {
        const {
          name: inputPassNodeName,
        } = this.nameManager.getComponentByEntity(e) || { name: '' };
        const {
          name: passNodeName = '',
        } = this.nameManager.getComponentByEntity(passNodeEntity) || {
          name: '',
        };
        return inputPassNodeName === passNodeName;
      }) ||
      passNode.prevs.find((e) => {
        const {
          name: inputPassNodeName,
        } = this.nameManager.getComponentByEntity(e) || { name: '' };
        const {
          name: passNodeName = '',
        } = this.nameManager.getComponentByEntity(inputPassNodeEntity) || {
          name: '',
        };
        return passNodeName === inputPassNodeName;
      })
    ) {
      return;
    }

    inputPassNode.nexts.push(passNodeEntity);
    passNode.prevs.push(inputPassNodeEntity);

    // 更新引用计数
    inputPassNode.ref++;
  }
}
