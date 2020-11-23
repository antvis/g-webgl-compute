import {
  GeometrySystem,
  gl,
  IDENTIFIER,
  MaterialSystem,
} from '@antv/g-webgpu-core';
import { inject, injectable, named } from 'inversify';
import { encodePickingColor } from '../../utils/picking';
import { Renderable } from '../Renderable';
import pointFrag from './shaders/webgl.point.frag.glsl';
import pointVert from './shaders/webgl.point.vert.glsl';

const pointShapes = [
  'circle',
  'triangle',
  'square',
  'pentagon',
  'hexagon',
  'octogon',
  'hexagram',
  'rhombus',
  'vesica',
];

interface IPointConfig {
  id: number;
  shape:
    | 'circle'
    | 'triangle'
    | 'square'
    | 'pentagon'
    | 'hexagon'
    | 'octogon'
    | 'hexagram'
    | 'rhombus'
    | 'vesica';
  position: [number, number];
  size: [number, number];
  color: [number, number, number, number]; // sRGB
  opacity: number;
  strokeWidth: number;
  strokeOpacity: number;
  strokeColor: [number, number, number, number]; // sRGB
}

interface IInstanceAttributes {
  positions: number[];
  instancedOffsets: number[];
  instancedColors: number[];
  instancedSizes: number[];
  instancedShapes: number[];
  instancedPickingColors: number[];
}

/**
 * Use SDF to draw 2D point with stroke.
 */
@injectable()
export class Point extends Renderable<
  Partial<IPointConfig> | Array<Partial<IPointConfig>>
> {
  @inject(IDENTIFIER.Systems)
  @named(IDENTIFIER.MaterialSystem)
  private readonly materialSystem: MaterialSystem;

  @inject(IDENTIFIER.Systems)
  @named(IDENTIFIER.GeometrySystem)
  private readonly geometrySystem: GeometrySystem;

  protected afterEntityCreated() {
    const material = this.materialSystem.createShaderMaterial({
      vertexShader: pointVert,
      fragmentShader: pointFrag,
      cull: {
        enable: false,
      },
      depth: {
        enable: false,
      },
      blend: {
        enable: true,
        func: {
          srcRGB: gl.SRC_ALPHA,
          dstRGB: gl.ONE_MINUS_SRC_ALPHA,
          srcAlpha: 1,
          dstAlpha: 1,
        },
      },
    });

    // TODO: support define stroke-relative props per point
    material.setUniform({
      u_stroke_width: 0.01,
      u_device_pixel_ratio: window.devicePixelRatio,
      u_stroke_color: [0, 0, 0, 0],
      u_stroke_opacity: 1,
      u_opacity: 0.35,
      u_blur: 0,
    });

    const attributes = this.buildAttributes();

    const geometry = this.geometrySystem.createInstancedBufferGeometry({
      maxInstancedCount: attributes.instancedOffsets.length / 2,
      vertexCount: 6,
    });

    geometry.setIndex([0, 2, 1, 0, 3, 2]);

    geometry.setAttribute('position', Float32Array.from(attributes.positions), {
      arrayStride: 4 * 2,
      stepMode: 'vertex',
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: 'float2',
        },
      ],
    });

    geometry.setAttribute(
      'offset',
      Float32Array.from(attributes.instancedOffsets),
      {
        arrayStride: 4 * 2,
        stepMode: 'instance',
        attributes: [
          {
            shaderLocation: 1,
            offset: 0,
            format: 'float2',
          },
        ],
      },
    );

    geometry.setAttribute(
      'color',
      Float32Array.from(attributes.instancedColors),
      {
        arrayStride: 4 * 4,
        stepMode: 'instance',
        attributes: [
          {
            shaderLocation: 2,
            offset: 0,
            format: 'float4',
          },
        ],
      },
    );

    geometry.setAttribute(
      'size',
      Float32Array.from(attributes.instancedSizes),
      {
        arrayStride: 4,
        stepMode: 'instance',
        attributes: [
          {
            shaderLocation: 3,
            offset: 0,
            format: 'float',
          },
        ],
      },
    );

    geometry.setAttribute(
      'shape',
      Float32Array.from(attributes.instancedShapes),
      {
        arrayStride: 4,
        stepMode: 'instance',
        attributes: [
          {
            shaderLocation: 4,
            offset: 0,
            format: 'float',
          },
        ],
      },
    );

    geometry.setAttribute(
      'a_PickingColor',
      Float32Array.from(attributes.instancedPickingColors),
      {
        arrayStride: 4 * 3,
        stepMode: 'instance',
        attributes: [
          {
            shaderLocation: 6,
            offset: 0,
            format: 'float3',
          },
        ],
      },
    );

    this.setMaterial(material);
    this.setGeometry(geometry);
  }

  private buildAttribute(
    config: Partial<IPointConfig>,
    attributes: IInstanceAttributes,
    index: number,
  ) {
    attributes.instancedPickingColors.push(
      ...encodePickingColor(config.id || index),
    );

    attributes.instancedShapes.push(
      pointShapes.indexOf(config.shape || 'circle'),
    );
    attributes.instancedColors.push(...(config.color || [1, 0, 0, 1]));
    attributes.instancedOffsets.push(...(config.position || [0, 0]));
    attributes.instancedSizes.push(...(config.size || [0.2, 0.2]));
  }

  private buildAttributes() {
    const attributes: IInstanceAttributes = {
      positions: [1, 1, 1, -1, -1, -1, -1, 1],
      instancedOffsets: [],
      instancedColors: [],
      instancedSizes: [],
      instancedShapes: [],
      instancedPickingColors: [],
    };

    if (Array.isArray(this.config)) {
      this.config.forEach((config, i) => {
        this.buildAttribute(config, attributes, i);
      });
    } else {
      this.buildAttribute(this.config, attributes, 0);
    }

    return attributes;
  }
}
