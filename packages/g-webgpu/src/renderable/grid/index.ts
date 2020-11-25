import {
  BufferData,
  GeometrySystem,
  gl,
  IDENTIFIER,
  IShaderModuleService,
  MaterialSystem,
} from '@antv/g-webgpu-core';
import { inject, injectable, named } from 'inversify';
import { Renderable } from '../Renderable';
import gridFrag from './shaders/webgl.grid.frag.glsl';
import gridVert from './shaders/webgl.grid.vert.glsl';

interface IGridConfig {
  gridColor: number[];
  gridSize: number;
}

@injectable()
export class Grid extends Renderable<Partial<IGridConfig>> {
  @inject(IDENTIFIER.Systems)
  @named(IDENTIFIER.MaterialSystem)
  private readonly materialSystem: MaterialSystem;

  @inject(IDENTIFIER.Systems)
  @named(IDENTIFIER.GeometrySystem)
  private readonly geometrySystem: GeometrySystem;

  @inject(IDENTIFIER.ShaderModuleService)
  private readonly shaderModuleService: IShaderModuleService;

  protected onAttributeChanged({
    name,
    data,
  }: {
    name: string;
    data: BufferData;
  }) {
    const mesh = this.getMeshComponent();
    if (mesh && mesh.material) {
      if (name === 'gridColor') {
        mesh.material.setUniform('u_GridColor', data);
        mesh.material.setUniform('u_GridColor2', data);
      } else if (name === 'gridSize') {
        mesh.material.setUniform('u_GridSize', data);
        mesh.material.setUniform('u_GridSize2', data);
      }
    }
  }

  protected onEntityCreated() {
    this.shaderModuleService.registerModule('grid', {
      vs: gridVert,
      fs: gridFrag,
    });
    const {
      vs,
      fs,
      uniforms: extractedUniforms,
    } = this.shaderModuleService.getModule('grid');

    const material = this.materialSystem.createShaderMaterial({
      vertexShader: vs,
      fragmentShader: fs,
    });
    this.setMaterial(material);

    const geometry = this.geometrySystem.createBufferGeometry({
      vertexCount: 4,
    });
    this.setGeometry(geometry);

    material
      .setCull({
        enable: false,
        face: gl.BACK,
      })
      .setDepth({
        enable: true,
        func: gl.LESS,
      });

    // @ts-ignore
    material.setUniform(extractedUniforms);

    this.setAttributes({
      gridColor: this.config.gridColor,
      gridSize: this.config.gridSize,
    });

    geometry.setIndex([0, 3, 2, 2, 1, 0]);

    geometry.setAttribute(
      'a_Position',
      Float32Array.from([-4, -1, -4, 4, -1, -4, 4, -1, 4, -4, -1, 4]),
      {
        arrayStride: 4 * 2,
        stepMode: 'vertex',
        attributes: [
          {
            shaderLocation: 0,
            offset: 0,
            format: 'float2',
          },
        ],
      },
    );
  }
}
