import { mat4, vec4 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import { Component, createEntity, Entity, IDENTIFIER, System } from '../..';
import { ComponentManager } from '../../ComponentManager';
import { WebGPUEngine } from '../../WebGPUEngine';
import { CameraComponent } from '../camera/CameraComponent';
import { GeometryComponent } from '../geometry/GeometryComponent';
import { MaterialComponent } from '../material/MaterialComponent';
import { MaterialSystem } from '../material/System';
import { CullableComponent } from '../mesh/CullableComponent';
import { MeshComponent } from '../mesh/MeshComponent';
import { MeshSystem } from '../mesh/System';
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

  public render(engine: WebGPUEngine, systems: System[]) {
    const materialSystem = systems.find(
      (s) => s.name === IDENTIFIER.MaterialSystem,
    ) as MaterialSystem;

    // clear first
    engine.clear({ r: 0.0, g: 0.0, b: 0.0, a: 1.0 }, true, true, true);

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

        const modelViewProjectionMatrix = mat4.multiply(
          mat4.create(),
          viewProjectionMatrix,
          transform.worldTransform,
        );

        // set MVP matrix
        materialSystem.setUniform(
          engine,
          mesh.material,
          'mvpMatrix',
          // @ts-ignore
          modelViewProjectionMatrix,
        );

        // update other uniforms
        material.uniforms.forEach((binding) => {
          binding.uniforms.forEach((uniform) => {
            if (uniform.dirty) {
              materialSystem.setUniform(
                engine,
                mesh.material,
                uniform.name,
                // @ts-ignore
                uniform.data,
                true,
              );
            }
          });
        });

        engine.setRenderBindGroups([material.uniformBindGroup]);

        // TODO: use some semantic like POSITION, NORMAL, COLOR etc.
        engine.bindVertexInputs({
          indexBuffer: geometry.indicesBuffer,
          indexOffset: 0,
          vertexStartSlot: 0,
          vertexBuffers: [
            geometry.verticesBuffer,
            geometry.normalsBuffer,
            geometry.uvsBuffer,
          ],
          vertexOffsets: [0, 0, 0],
        });

        engine.drawElementsType(
          `render${meshEntity}`,
          {
            layout: material.pipelineLayout,
            ...material.stageDescriptor,
            primitiveTopology: material.primitiveTopology,
            vertexState: geometry.vertexState,
            rasterizationState: {
              cullMode: 'back',
            },
            depthStencilState: {
              depthWriteEnabled: true,
              depthCompare: 'less',
              format: 'depth24plus-stencil8',
            },
          },
          0,
          geometry.indices.length,
          1,
        );
      });
    });
  }
}
