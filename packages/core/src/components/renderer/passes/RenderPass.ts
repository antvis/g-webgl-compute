import { mat4 } from 'gl-matrix';
import { inject, injectable, named } from 'inversify';
import { Entity, IModel } from '../../..';
import { ComponentManager } from '../../../ComponentManager';
import { IDENTIFIER } from '../../../identifier';
import { FrameGraphHandle } from '../../framegraph/FrameGraphHandle';
import { FrameGraphPass } from '../../framegraph/FrameGraphPass';
import { PassNode } from '../../framegraph/PassNode';
import { ResourcePool } from '../../framegraph/ResourcePool';
import { FrameGraphSystem } from '../../framegraph/System';
import { GeometryComponent } from '../../geometry/GeometryComponent';
import { MaterialComponent } from '../../material/MaterialComponent';
import { CullableComponent } from '../../mesh/CullableComponent';
import { MeshComponent } from '../../mesh/MeshComponent';
import { HierarchyComponent } from '../../scenegraph/HierarchyComponent';
import { TransformComponent } from '../../scenegraph/TransformComponent';
import { gl } from '../gl';
import { IAttribute } from '../IAttribute';
import { IModelInitializationOptions } from '../IModel';
import { ICamera, IRendererService, IView } from '../IRendererService';
import { IUniform } from '../IUniform';
import { IRenderPass } from './IRenderPass';

export interface RenderPassData {
  output: FrameGraphHandle;
}

@injectable()
export class RenderPass implements IRenderPass<RenderPassData> {
  public static IDENTIFIER = 'Render Pass';

  @inject(IDENTIFIER.MeshComponentManager)
  private readonly mesh: ComponentManager<MeshComponent>;

  @inject(IDENTIFIER.GeometryComponentManager)
  private readonly geometry: ComponentManager<GeometryComponent>;

  @inject(IDENTIFIER.MaterialComponentManager)
  private readonly material: ComponentManager<MaterialComponent>;

  @inject(IDENTIFIER.CullableComponentManager)
  private readonly cullable: ComponentManager<CullableComponent>;

  @inject(IDENTIFIER.TransformComponentManager)
  private readonly transform: ComponentManager<TransformComponent>;

  @inject(IDENTIFIER.HierarchyComponentManager)
  private readonly hierarchy: ComponentManager<HierarchyComponent>;

  @inject(IDENTIFIER.Systems)
  @named(IDENTIFIER.FrameGraphSystem)
  private readonly frameGraphSystem: FrameGraphSystem;

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  @inject(IDENTIFIER.ResourcePool)
  private readonly resourcePool: ResourcePool;

  private modelCache: Record<string, IModel> = {};

  public setup = (
    fg: FrameGraphSystem,
    passNode: PassNode,
    pass: FrameGraphPass<RenderPassData>,
  ): void => {
    const output = fg.createRenderTarget(passNode, 'color buffer', {
      width: 1,
      height: 1,
      usage: gl.RENDER_ATTACHMENT | gl.SAMPLED | gl.COPY_SRC,
    });

    pass.data = {
      output: passNode.write(fg, output),
    };
  };

  public execute = async (
    fg: FrameGraphSystem,
    pass: FrameGraphPass<RenderPassData>,
    views: IView[],
  ): Promise<void> => {
    const resourceNode = fg.getResourceNode(pass.data.output);
    const framebuffer = this.resourcePool.getOrCreateResource(
      resourceNode.resource,
    );

    // initialize model of each mesh
    for (const view of views) {
      await this.initView(view);
    }

    const canvas = this.engine.getCanvas();
    framebuffer.resize({
      width: canvas.width,
      height: canvas.height,
    });

    this.engine.setScissor({
      enable: false,
    });
    this.engine.clear({
      framebuffer,
      color: views[0].getClearColor(), // TODO: use clearColor defined in view
      depth: 1,
    });

    this.engine.useFramebuffer(framebuffer, () => {
      for (const view of views) {
        // must do rendering in a sync way
        this.renderView(view);
      }
    });
  };

  public renderView(view: IView) {
    const scene = view.getScene();
    const camera = view.getCamera();

    // get VP matrix from camera
    const viewMatrix = camera.getViewTransform()!;
    const viewProjectionMatrix = mat4.multiply(
      mat4.create(),
      camera.getPerspective(),
      viewMatrix,
    );
    // TODO: use cached planes if camera was not changed
    camera.getFrustum().extractFromVPMatrix(viewProjectionMatrix);

    const { x, y, width, height } = view.getViewport();
    this.engine.viewport({
      x,
      y,
      width,
      height,
    });
    // this.engine.setScissor({
    //   enable: true,
    //   box: { x, y, width, height },
    // });
    // this.engine.clear({
    //   // framebuffer,
    //   color: [1, 1, 1, 1], // TODO: use clearColor defined in view
    //   depth: 1,
    // });

    for (const meshEntity of scene.getEntities()) {
      this.renderMesh(meshEntity, {
        camera,
        view,
        viewMatrix,
      });
    }
  }

  private renderMesh(
    meshEntity: Entity,
    {
      camera,
      view,
      viewMatrix,
    }: {
      camera: ICamera;
      view: IView;
      viewMatrix: mat4;
    },
  ) {
    const mesh = this.mesh.getComponentByEntity(meshEntity);

    if (!mesh || !mesh.visible) {
      return;
    }

    // filter meshes with frustum culling
    // if (!this.cullable.getComponentByEntity(meshEntity)?.visible) {
    //   return;
    // }
    const material = mesh.material;
    const geometry = mesh.geometry;

    // geometry 在自己的 System 中完成脏检查后的更新
    if (!geometry || geometry.dirty || !material) {
      return;
    }

    // get model matrix from mesh
    const transform = this.transform.getComponentByEntity(meshEntity)!;

    const modelViewMatrix = mat4.multiply(
      mat4.create(),
      viewMatrix,
      transform.worldTransform,
    );
    const { width, height } = view.getViewport();

    // set MVP matrix, other builtin uniforms @see https://threejs.org/docs/#api/en/renderers/webgl/WebGLProgram
    material.setUniform({
      projectionMatrix: camera.getPerspective(),
      modelViewMatrix,
      modelMatrix: transform.worldTransform,
      viewMatrix,
      cameraPosition: camera.getPosition(),
      u_viewport: [width, height],
    });

    if (mesh.model) {
      mesh.model.draw({
        uniforms: material.uniforms.reduce(
          (cur: { [key: string]: IUniform }, prev) => {
            cur[prev.name] = prev.data;
            return cur;
          },
          {},
        ),
      });

      material.uniforms.forEach((u) => {
        u.dirty = false;
      });
      material.dirty = false;
    }
  }

  private async initMesh(meshEntity: Entity, view: IView) {
    const mesh = this.mesh.getComponentByEntity(meshEntity);

    if (!mesh) {
      return;
    }

    const material = mesh.material;
    const geometry = mesh.geometry;

    if (!geometry || geometry.dirty || !material) {
      return;
    }

    if (!mesh.model) {
      const modelCacheKey = `m-${material.entity}-g-${geometry.entity}`;
      if (this.modelCache[modelCacheKey]) {
        mesh.model = this.modelCache[modelCacheKey];
        return;
      }

      material.setUniform({
        projectionMatrix: 1,
        modelViewMatrix: 1,
        modelMatrix: 1,
        viewMatrix: 1,
        cameraPosition: 1,
        u_viewport: 1,
      });

      const { createModel, createAttribute } = this.engine;
      const modelInitializationOptions: IModelInitializationOptions = {
        vs: material.vertexShaderGLSL,
        fs: material.fragmentShaderGLSL,
        defines: material.defines,
        attributes: geometry.attributes.reduce(
          (cur: { [key: string]: IAttribute }, prev) => {
            if (prev.data && prev.buffer) {
              cur[prev.name] = createAttribute({
                buffer: prev.buffer,
                attributes: prev.attributes,
                arrayStride: prev.arrayStride,
                stepMode: prev.stepMode,
                divisor: prev.stepMode === 'vertex' ? 0 : 1,
              });
            }
            return cur;
          },
          {},
        ),
        uniforms: material.uniforms.reduce(
          (cur: { [key: string]: IUniform }, prev) => {
            cur[prev.name] = prev.data;
            return cur;
          },
          {},
        ),
        scissor: {
          enable: true,
          // @ts-ignore
          box: () => view.getViewport(),
        },
      };

      if (material.cull) {
        modelInitializationOptions.cull = material.cull;
      }
      if (material.depth) {
        modelInitializationOptions.depth = material.depth;
      }
      if (material.blend) {
        modelInitializationOptions.blend = material.blend;
      }

      if (geometry.indicesBuffer) {
        modelInitializationOptions.elements = geometry.indicesBuffer;
      }

      if (geometry.maxInstancedCount) {
        modelInitializationOptions.instances = geometry.maxInstancedCount;
        modelInitializationOptions.count = geometry.vertexCount || 3;
      }

      mesh.model = await createModel(modelInitializationOptions);
      this.modelCache[modelCacheKey] = mesh.model;
    }
  }

  private async initView(view: IView) {
    const scene = view.getScene();
    for (const meshEntity of scene.getEntities()) {
      await this.initMesh(meshEntity, view);
    }
  }
}
