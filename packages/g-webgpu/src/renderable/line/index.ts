import {
  BufferData,
  GeometrySystem,
  gl,
  IDENTIFIER,
  IShaderModuleService,
  MaterialSystem,
} from '@antv/g-webgpu-core';
import { inject, injectable, named } from 'inversify';
import { encodePickingColor } from '../../utils/picking';
import getNormals from '../../utils/polyline-normals';
import { Renderable } from '../Renderable';
import lineFrag from './shaders/webgl.line.frag.glsl';
import lineVert from './shaders/webgl.line.vert.glsl';

interface ILineConfig {
  id: number;
  points: number[][];
  thickness: number;
  color: [number, number, number, number]; // sRGB
  dashOffset: number;
  dashArray: number;
  dashRatio: number;
}

@injectable()
export class Line extends Renderable<Partial<ILineConfig>> {
  @inject(IDENTIFIER.Systems)
  @named(IDENTIFIER.MaterialSystem)
  private readonly materialSystem: MaterialSystem;

  @inject(IDENTIFIER.Systems)
  @named(IDENTIFIER.GeometrySystem)
  private readonly geometrySystem: GeometrySystem;

  @inject(IDENTIFIER.ShaderModuleService)
  private readonly shaderModuleService: IShaderModuleService;

  private vertexCount: number;

  protected onAttributeChanged({
    name,
    data,
  }: {
    name: string;
    data: BufferData;
  }) {
    const mesh = this.getMeshComponent();
    if (mesh && mesh.material) {
      switch (name) {
        case 'dashArray':
          mesh.material.setUniform('u_dash_array', data);
          break;
        case 'dashOffset':
          mesh.material.setUniform('u_dash_offset', data);
          break;
        case 'dashRatio':
          mesh.material.setUniform('u_dash_ratio', data);
          break;
        case 'thickness':
          mesh.material.setUniform('u_thickness', data);
          break;
        case 'color':
          const colors = new Array(this.vertexCount)
            .fill(undefined)
            .map(() => data)
            .reduce((prev, cur) => {
              // @ts-ignore
              return [...prev, ...cur];
            }, []);
          // @ts-ignore
          mesh.geometry.setAttribute('a_color', Float32Array.from(colors), {
            arrayStride: 4 * 4,
            stepMode: 'vertex',
            attributes: [
              {
                shaderLocation: 1,
                offset: 0,
                format: 'float4',
              },
            ],
          });
          break;
      }
    }
  }

  protected onEntityCreated() {
    this.shaderModuleService.registerModule('line', {
      vs: lineVert,
      fs: lineFrag,
    });
    const {
      vs,
      fs,
      uniforms: extractedUniforms,
    } = this.shaderModuleService.getModule('line');

    const material = this.materialSystem.createShaderMaterial({
      vertexShader: vs,
      fragmentShader: fs,
    });

    const { normals, attrIndex, attrPos, attrCounters } = getNormals(
      this.config.points!,
      false,
    );
    const vertexCount = attrPos.length;
    this.vertexCount = vertexCount;
    const geometry = this.geometrySystem.createBufferGeometry({
      vertexCount,
    });

    this.setMaterial(material);
    this.setGeometry(geometry);

    material
      .setCull({
        enable: false,
        face: gl.BACK,
      })
      // @ts-ignore
      .setUniform(extractedUniforms);

    this.setAttributes({
      dashArray: this.config.dashArray,
      dashOffset: this.config.dashOffset,
      dashRatio: this.config.dashRatio,
      thickness: this.config.thickness,
    });

    const attrNormal: number[][] = [];
    const attrMiter: number[] = [];

    normals.forEach((n: number[][]) => {
      const norm = n[0];
      const miter = n[1];
      attrNormal.push([norm[0], norm[1]]);
      // @ts-ignore
      attrMiter.push(miter);
    });

    // [[0,1,2], [2,1,3]]
    geometry.setIndex(
      attrIndex.reduce((prev, cur) => {
        return [...prev, ...cur];
      }, []),
    );

    geometry.setAttribute(
      'a_pos',
      Float32Array.from(
        attrPos.reduce((prev, cur) => {
          return [...prev, ...cur];
        }, []),
      ),
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

    const colors = new Array(vertexCount)
      .fill(undefined)
      .map(() => [...this.config.color!])
      .reduce((prev, cur) => {
        return [...prev, ...cur];
      }, []);
    geometry.setAttribute('a_color', Float32Array.from(colors), {
      arrayStride: 4 * 4,
      stepMode: 'vertex',
      attributes: [
        {
          shaderLocation: 1,
          offset: 0,
          format: 'float4',
        },
      ],
    });

    geometry.setAttribute('a_line_miter', Float32Array.from(attrMiter), {
      arrayStride: 4 * 1,
      stepMode: 'vertex',
      attributes: [
        {
          shaderLocation: 2,
          offset: 0,
          format: 'float',
        },
      ],
    });

    geometry.setAttribute(
      'a_line_normal',
      Float32Array.from(
        attrNormal.reduce((prev, cur) => {
          return [...prev, ...cur];
        }, []),
      ),
      {
        arrayStride: 4 * 2,
        stepMode: 'vertex',
        attributes: [
          {
            shaderLocation: 3,
            offset: 0,
            format: 'float2',
          },
        ],
      },
    );

    geometry.setAttribute('a_counters', Float32Array.from(attrCounters), {
      arrayStride: 4 * 1,
      stepMode: 'vertex',
      attributes: [
        {
          shaderLocation: 4,
          offset: 0,
          format: 'float',
        },
      ],
    });
  }
}
