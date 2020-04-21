import { mat4, vec4 } from 'gl-matrix';
import { inject, injectable, named } from 'inversify';
import { IRenderEngine } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { IDENTIFIER } from '../../identifier';
import { CameraComponent } from '../camera/CameraComponent';
import { GeometryComponent } from '../geometry/GeometryComponent';
import { MaterialComponent } from '../material/MaterialComponent';
import { MaterialSystem } from '../material/System';
import { CullableComponent } from '../mesh/CullableComponent';
import { MeshComponent } from '../mesh/MeshComponent';
import { SceneComponent } from '../scene/SceneComponent';
import { TransformComponent } from '../scenegraph/TransformComponent';
import { IRenderPath } from './RenderPath';

/**
 * 简单的前向渲染
 */
@injectable()
export class ForwardRenderPath implements IRenderPath {
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

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRenderEngine;

  public render() {
    this.scene.forEach((sceneEntity, scene) => {
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

      scene.meshes.forEach((meshEntity) => {
        // filter meshes with frustum culling
        if (!this.cullable.getComponentByEntity(meshEntity)?.visible) {
          return;
        }

        const mesh = this.mesh.getComponentByEntity(meshEntity)!;
        const material = this.material.getComponentByEntity(mesh.material)!;
        const geometry = this.geometry.getComponentByEntity(mesh.geometry)!;

        if (material.dirty || geometry.dirty) {
          return;
        }

        // get model matrix from mesh
        const transform = this.transform.getComponentByEntity(meshEntity)!;

        if (transform) {
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
            // @ts-ignore
            camera.getPerspective(),
          );

          this.materialSystem.setUniform(
            mesh.material,
            'modelViewMatrix',
            // @ts-ignore
            modelViewMatrix,
          );
        }

        // update other uniforms
        material.uniforms.forEach((binding) => {
          binding.uniforms.forEach((uniform) => {
            if (uniform.dirty) {
              this.materialSystem.setUniform(
                mesh.material,
                uniform.name,
                // @ts-ignore
                uniform.data,
                true,
              );
            }
          });
        });

        this.engine.setRenderBindGroups([material.uniformBindGroup]);

        // some custom shader doesn't need vertex, like our triangle MSAA example.
        if (geometry.attributes.length) {
          const vertexBuffers = geometry.attributes
            .map((attribute) => {
              if (attribute.buffer) {
                return attribute.buffer;
              } else if (attribute.bufferGetter) {
                return attribute.bufferGetter();
              }
              return null;
            })
            .filter((v) => v) as GPUBuffer[];

          // TODO: use some semantic like POSITION, NORMAL, COLOR etc.
          this.engine.bindVertexInputs({
            indexBuffer: geometry.indicesBuffer,
            indexOffset: 0,
            vertexStartSlot: 0,
            vertexBuffers,
            vertexOffsets: new Array(vertexBuffers.length).fill(0),
          });
        }

        if (geometry.indices && geometry.indices.length) {
          this.engine.drawElementsType(
            `render-${meshEntity}-elements`,
            {
              layout: material.pipelineLayout,
              ...material.stageDescriptor,
              primitiveTopology: material.primitiveTopology || 'triangle-list',
              vertexState: {
                indexFormat: 'uint32',
                vertexBuffers: geometry.attributes.map((attribute) => ({
                  arrayStride: attribute.arrayStride,
                  stepMode: attribute.stepMode,
                  attributes: attribute.attributes,
                })),
              },
              rasterizationState: material.rasterizationState || {
                cullMode: 'back',
              },
              depthStencilState: material.depthStencilState || {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus-stencil8',
              },
              // @ts-ignore
              colorStates: material.colorStates,
            },
            0,
            geometry.indices.length,
            geometry.maxInstancedCount || 1,
          );
        } else {
          this.engine.drawArraysType(
            `render-${meshEntity}-arrays`,
            {
              layout: material.pipelineLayout,
              ...material.stageDescriptor,
              primitiveTopology: material.primitiveTopology || 'triangle-list',
              vertexState: {
                vertexBuffers: geometry.attributes.map((attribute) => ({
                  arrayStride: attribute.arrayStride,
                  stepMode: attribute.stepMode,
                  attributes: attribute.attributes,
                })),
              },
              rasterizationState: material.rasterizationState || {
                cullMode: 'back',
              },
              depthStencilState: material.depthStencilState || {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus-stencil8',
              },
              // @ts-ignore
              colorStates: material.colorStates,
            },
            0,
            geometry.vertexCount || 3,
            geometry.maxInstancedCount || 1,
          );
        }
      });
    });
  }
}
