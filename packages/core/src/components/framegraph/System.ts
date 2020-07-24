import { inject, injectable } from 'inversify';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { IRendererService } from '../renderer/IRendererService';
import { FrameGraphHandle, TextureDescriptor } from './FrameGraphHandle';
import { FrameGraphPass } from './FrameGraphPass';
import { PassNode } from './PassNode';
import { ResourceEntry } from './ResourceEntry';
import { ResourceNode } from './ResourceNode';

/**
 * ported from FrameGraph implemented by SakuraRender
 * @see https://zhuanlan.zhihu.com/p/98572442
 * @see https://github.com/SaeruHikari/Sakura/blob/RenderGraph/SakuraCore/Source/Framework/GraphicTypes/FrameGraph/SakuraFrameGraph.cpp
 */
@injectable()
export class FrameGraphSystem implements ISystem {
  public passNodes: PassNode[] = [];

  public resourceNodes: ResourceNode[] = [];

  public frameGraphPasses: Array<FrameGraphPass<any>> = [];

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  public async execute() {
    // this.engine.beginFrame();
    this.compile();
    await this.executePassNodes();
    // this.engine.endFrame();
  }

  public tearDown() {
    this.reset();
  }

  public addPass<PassData>(
    name: string,
    setup: (
      fg: FrameGraphSystem,
      passNode: PassNode,
      pass: FrameGraphPass<PassData>,
    ) => void,
    execute: (
      fg: FrameGraphSystem,
      pass: FrameGraphPass<PassData>,
    ) => Promise<void>,
  ) {
    const frameGraphPass = new FrameGraphPass<PassData>();
    frameGraphPass.execute = execute;
    frameGraphPass.name = name;

    const passNode = new PassNode();
    passNode.name = name;
    this.passNodes.push(passNode);

    this.frameGraphPasses.push(frameGraphPass);

    setup(this, passNode, frameGraphPass);

    return frameGraphPass;
  }

  public getPass<T>(name: string): FrameGraphPass<T> | undefined {
    return this.frameGraphPasses.find((p) => p.name === name);
  }

  public compile() {
    for (const pass of this.passNodes) {
      pass.refCount = pass.writes.length + (pass.hasSideEffect ? 1 : 0);

      pass.reads.forEach((handle) => {
        this.resourceNodes[handle.index].readerCount++;
      });
    }

    const stack: ResourceNode[] = [];
    for (const node of this.resourceNodes) {
      if (node.readerCount === 0) {
        stack.push(node);
      }
    }
    while (stack.length) {
      const pNode = stack.pop();
      const writer = pNode && pNode.writer;
      if (writer) {
        if (--writer.refCount === 0) {
          // this pass is culled
          // assert(!writer->hasSideEffect);
          for (const resource of writer.reads) {
            const r = this.resourceNodes[resource.index];
            if (--r.readerCount === 0) {
              stack.push(r);
            }
          }
        }
      }
    }

    // update the final reference counts
    this.resourceNodes.forEach((node) => {
      node.resource.refs += node.readerCount;
    });

    for (const pass of this.passNodes) {
      if (!pass.refCount) {
        continue;
      }
      for (const resource of pass.reads) {
        const pResource = this.resourceNodes[resource.index].resource;
        pResource.first = pResource.first ? pResource.first : pass;
        pResource.last = pass;
      }
      for (const resource of pass.writes) {
        const pResource = this.resourceNodes[resource.index].resource;
        pResource.first = pResource.first ? pResource.first : pass;
        pResource.last = pass;
      }
    }

    for (let priority = 0; priority < 2; priority++) {
      for (const resoureNode of this.resourceNodes) {
        const resource = resoureNode.resource;
        if (resource.priority === priority && resource.refs) {
          const pFirst = resource.first;
          const pLast = resource.last;
          if (pFirst && pLast) {
            pFirst.devirtualize.push(resource);
            pLast.destroy.push(resource);
          }
        }
      }
    }
  }

  public async executePassNodes() {
    for (const [index, node] of this.passNodes.entries()) {
      if (node.refCount) {
        for (const resource of node.devirtualize) {
          resource.preExecuteDevirtualize(this.engine);
        }

        for (const resource of node.destroy) {
          resource.preExecuteDestroy(this.engine);
        }

        await this.frameGraphPasses[index].execute(
          this,
          this.frameGraphPasses[index],
        );

        for (const resource of node.devirtualize) {
          resource.postExecuteDevirtualize(this.engine);
        }

        for (const resource of node.destroy) {
          resource.postExecuteDestroy(this.engine);
        }
      }
    }
    this.reset();
  }

  public reset() {
    this.passNodes = [];
    this.resourceNodes = [];
    this.frameGraphPasses = [];
  }

  public getResourceNode(r: FrameGraphHandle) {
    return this.resourceNodes[r.index];
  }

  public createResourceNode(resourceEntry: ResourceEntry) {
    const resourceNode = new ResourceNode();
    resourceNode.resource = resourceEntry;
    resourceNode.version = resourceEntry.version;

    this.resourceNodes.push(resourceNode);

    const fgh = new FrameGraphHandle();
    fgh.index = this.resourceNodes.length - 1;

    return fgh;
  }

  public createTexture(
    passNode: PassNode,
    name: string,
    descriptor: TextureDescriptor,
  ) {
    const resource = new ResourceEntry();
    resource.name = name;
    resource.descriptor = descriptor;
    return this.createResourceNode(resource);
  }

  public createRenderTarget(
    passNode: PassNode,
    name: string,
    descriptor: TextureDescriptor,
  ) {
    const resource = new ResourceEntry();
    resource.name = name;
    resource.descriptor = descriptor;
    return this.createResourceNode(resource);
  }

  public present(input: FrameGraphHandle) {
    this.addPass<{}>(
      'Present',
      (fg, passNode) => {
        passNode.read(input);
        passNode.hasSideEffect = true;
      },
      async () => {
        // 不需要执行
      },
    );
  }
}
