import { mat4 } from 'gl-matrix';
import { inject, injectable, named } from 'inversify';
import { ComponentManager } from '../../../ComponentManager';
import { IDENTIFIER } from '../../../identifier';
import { CameraComponent } from '../../camera/CameraComponent';
import { FrameGraphHandle } from '../../framegraph/FrameGraphHandle';
import { FrameGraphPass } from '../../framegraph/FrameGraphPass';
import { PassNode } from '../../framegraph/PassNode';
import { ResourcePool } from '../../framegraph/ResourcePool';
import { FrameGraphSystem } from '../../framegraph/System';
import { GeometryComponent } from '../../geometry/GeometryComponent';
import { MaterialComponent } from '../../material/MaterialComponent';
import { MaterialSystem } from '../../material/System';
import { CullableComponent } from '../../mesh/CullableComponent';
import { MeshComponent } from '../../mesh/MeshComponent';
import { SceneComponent } from '../../scene/SceneComponent';
import { TransformComponent } from '../../scenegraph/TransformComponent';
import { gl } from '../gl';
import { IAttribute } from '../IAttribute';
import { IModelInitializationOptions } from '../IModel';
import { IRendererService } from '../IRendererService';
import { IUniform } from '../IUniform';
import { IRenderPass } from './IRenderPass';

export interface RenderPassData {
  output: FrameGraphHandle;
}

@injectable()
export class RenderPass implements IRenderPass<RenderPassData> {
  public static IDENTIFIER = 'Render Pass';

  @inject(IDENTIFIER.SceneComponentManager)
  private readonly scene: ComponentManager<SceneComponent>;

  @inject(IDENTIFIER.CameraComponentManager)
  private readonly camera: ComponentManager<CameraComponent>;

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

  @inject(IDENTIFIER.Systems)
  @named(IDENTIFIER.MaterialSystem)
  private readonly materialSystem: MaterialSystem;

  @inject(IDENTIFIER.Systems)
  @named(IDENTIFIER.FrameGraphSystem)
  private readonly frameGraphSystem: FrameGraphSystem;

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  @inject(IDENTIFIER.ResourcePool)
  private readonly resourcePool: ResourcePool;

  public setup = (
    fg: FrameGraphSystem,
    passNode: PassNode,
    pass: FrameGraphPass<RenderPassData>,
  ): void => {
    const output = fg.createRenderTarget(passNode, 'color buffer', {
      width: 1,
      height: 1,
    });

    pass.data = {
      output: passNode.write(fg, output),
    };
  };

  public execute = async (
    fg: FrameGraphSystem,
    pass: FrameGraphPass<RenderPassData>,
  ): Promise<void> => {
    const { width, height } = this.engine.getViewportSize();
    // clear first, also start render & compute pass
    // this.engine.clear({
    //   color: [0, 0, 0, 0],
    //   depth: 1,
    // });

    // 实例化资源
    const resourceNode = fg.getResourceNode(pass.data.output);
    const framebuffer = this.resourcePool.getOrCreateResource(
      resourceNode.resource,
    );

    framebuffer.resize({
      width,
      height,
    });

    await new Promise((resolve) => {
      this.engine.clear({
        framebuffer,
        color: [1, 1, 1, 1],
        depth: 1,
      });
      this.engine.useFramebuffer(framebuffer, async () => {
        await this.renderScenes();
        resolve();
      });
    });
  };

  public async renderScenes() {
    const { createModel, createAttribute } = this.engine;
    await Promise.all(
      this.scene.map(async (sceneEntity, scene) => {
        // get VP matrix from camera
        const camera = this.camera.getComponentByEntity(scene.camera)!;
        const viewMatrix = camera.getViewTransform()!;
        const viewProjectionMatrix = mat4.multiply(
          mat4.create(),
          camera.getPerspective(),
          viewMatrix,
        );
        // TODO: use cached planes if camera was not changed
        camera.getFrustum().extractFromVPMatrix(viewProjectionMatrix);

        for (const meshEntity of scene.meshes) {
          // filter meshes with frustum culling
          if (!this.cullable.getComponentByEntity(meshEntity)?.visible) {
            return;
          }

          const mesh = this.mesh.getComponentByEntity(meshEntity)!;
          const material = this.material.getComponentByEntity(mesh.material)!;
          const geometry = this.geometry.getComponentByEntity(mesh.geometry)!;

          // geometry 在自己的 System 中完成脏检查后的更新
          if (geometry.dirty) {
            return;
          }

          // get model matrix from mesh
          const transform = this.transform.getComponentByEntity(meshEntity)!;

          const modelViewMatrix = mat4.multiply(
            mat4.create(),
            viewMatrix,
            transform.worldTransform,
          );
          // const modelViewProjectionMatrix = mat4.multiply(
          //   mat4.create(),
          //   viewProjectionMatrix,
          //   transform.worldTransform,
          // );

          // set MVP matrix
          this.materialSystem.setUniform(
            mesh.material,
            'projectionMatrix',
            camera.getPerspective(),
          );

          this.materialSystem.setUniform(
            mesh.material,
            'modelViewMatrix',
            modelViewMatrix,
          );

          // 还不存在渲染对象，需要先创建
          if (!mesh.model) {
            const modelInitializationOptions: IModelInitializationOptions = {
              vs: material.vertexShaderGLSL,
              fs: material.fragmentShaderGLSL,
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
              cull: {
                enable: true,
                face: gl.BACK,
              },
              depth: {
                // TODO: material 可指定
                enable: false,
                func: gl.LESS,
              },
              blend: {
                enable: true,
                func: {
                  srcRGB: gl.SRC_ALPHA,
                  dstRGB: gl.ONE_MINUS_SRC_ALPHA,
                  srcAlpha: 1,
                  dstAlpha: 1,
                },
                // func: {
                //   srcRGB: gl.ONE,
                //   dstRGB: gl.ONE,
                //   srcAlpha: 1,
                //   dstAlpha: 1,
                // },
              },
            };

            if (geometry.indicesBuffer) {
              modelInitializationOptions.elements = geometry.indicesBuffer;
            }

            if (geometry.maxInstancedCount) {
              modelInitializationOptions.instances = geometry.maxInstancedCount;
              modelInitializationOptions.count = geometry.vertexCount || 3;
            }

            mesh.model = await createModel(modelInitializationOptions);
          }

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

          // this.engine.setRenderBindGroups([material.uniformBindGroup]);

          // // some custom shader doesn't need vertex, like our triangle MSAA example.
          // if (geometry.attributes.length) {
          //   const vertexBuffers = geometry.attributes
          //     .map((attribute) => {
          //       if (attribute.buffer) {
          //         return attribute.buffer;
          //       } else if (attribute.bufferGetter) {
          //         return attribute.bufferGetter();
          //       }
          //       return null;
          //     })
          //     .filter((v) => v) as GPUBuffer[];

          //   // TODO: use some semantic like POSITION, NORMAL, COLOR etc.
          //   this.engine.bindVertexInputs({
          //     indexBuffer: geometry.indicesBuffer,
          //     indexOffset: 0,
          //     vertexStartSlot: 0,
          //     vertexBuffers,
          //     vertexOffsets: new Array(vertexBuffers.length).fill(0),
          //     pipelineName,
          //   });
          // }

          // if (geometry.indices && geometry.indices.length) {
          //   this.engine.drawElementsType(
          //     pipelineName,
          //     {
          //       layout: material.pipelineLayout,
          //       ...material.stageDescriptor,
          //       primitiveTopology: material.primitiveTopology || 'triangle-list',
          //       vertexState: {
          //         indexFormat: 'uint32',
          //         vertexBuffers: geometry.attributes.map((attribute) => ({
          //           arrayStride: attribute.arrayStride,
          //           stepMode: attribute.stepMode,
          //           attributes: attribute.attributes,
          //           label: attribute.name,
          //         })),
          //       },
          //       rasterizationState: material.rasterizationState || {
          //         cullMode: 'back',
          //       },
          //       depthStencilState: material.depthStencilState || {
          //         depthWriteEnabled: true,
          //         depthCompare: 'less',
          //         format: 'depth24plus-stencil8',
          //       },
          //       // @ts-ignore
          //       colorStates: material.colorStates,
          //     },
          //     0,
          //     geometry.indices.length,
          //     geometry.maxInstancedCount || 1,
          //     material.uniforms,
          //   );
          // } else {
          //   this.engine.drawArraysType(
          //     pipelineName,
          //     {
          //       layout: material.pipelineLayout,
          //       ...material.stageDescriptor,
          //       primitiveTopology: material.primitiveTopology || 'triangle-list',
          //       vertexState: {
          //         vertexBuffers: geometry.attributes.map((attribute) => ({
          //           arrayStride: attribute.arrayStride,
          //           stepMode: attribute.stepMode,
          //           attributes: attribute.attributes,
          //         })),
          //       },
          //       rasterizationState: material.rasterizationState || {
          //         cullMode: 'back',
          //       },
          //       depthStencilState: material.depthStencilState || {
          //         depthWriteEnabled: true,
          //         depthCompare: 'less',
          //         format: 'depth24plus-stencil8',
          //       },
          //       // @ts-ignore
          //       colorStates: material.colorStates,
          //     },
          //     0,
          //     geometry.vertexCount || 3,
          //     geometry.maxInstancedCount || 1,
          //   );
          // }
        }
      }),
    );
  }
}
