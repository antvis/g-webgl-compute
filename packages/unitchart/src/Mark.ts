import { Entity, World } from '@antv/g-webgpu';
import * as d3 from 'd3';
import { Container } from './Container';
import fragmentShaderGLSL from './shaders/webgl.point.frag.glsl';
import vertexShaderGLSL from './shaders/webgl.point.vert.glsl';

export function encodePickingColor(
  featureIdx: number,
): [number, number, number] {
  return [
    (featureIdx + 1) & 255,
    ((featureIdx + 1) >> 8) & 255,
    (((featureIdx + 1) >> 8) >> 8) & 255,
  ];
}

export interface IMarkInitializationOptions {
  shape: 'circle';
  color: {
    key: string;
    type: 'categorical';
  };
  size: {
    type: 'max';
    isShared: boolean;
  };
}

export class Mark {
  private colorScale: d3.ScaleOrdinal<string, string>;
  private world: World;
  private material: Entity;
  private geometry: Entity;
  private startTime: number;

  private activeLayout: string;
  private inited: boolean;
  private attributesMap: Record<
    string,
    {
      positions: number[];
      instancedStartOffsets: number[];
      instancedEndOffsets: number[];
      instancedColors: number[];
      instancedStartSizes: number[];
      instancedEndSizes: number[];
      instancedShapes: number[];
      instancedPickingColors: number[];
    }
  > = {};

  constructor(private options: IMarkInitializationOptions) {}

  public update() {
    if (!this.startTime) {
      this.startTime = window.performance.now();
    } else {
      const elaspedTime = window.performance.now() - this.startTime;
      if (elaspedTime < 600) {
        this.world.setUniform(this.material, 'u_time', elaspedTime / 600);
      } else {
        this.world.setUniform(this.material, 'u_time', 1);
      }
    }
  }

  public buildAttributesForAllContainers(
    containerMap: Record<string, Container>,
  ) {
    if (this.options.color.type === 'categorical') {
      this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    }

    Object.keys(containerMap).forEach((layoutName) => {
      this.attributesMap[layoutName] = {
        positions: [1, 1, 1, -1, -1, -1, -1, 1],
        instancedStartOffsets: [],
        instancedEndOffsets: [],
        instancedColors: [],
        instancedStartSizes: [],
        instancedEndSizes: [],
        instancedShapes: [],
        instancedPickingColors: [],
      };
      this.buildAttributes(
        containerMap[layoutName],
        containerMap[layoutName],
        this.attributesMap[layoutName],
      );
    });
  }

  public render(
    world: World,
    scene: Entity,
    rootContainer: Container,
    layout: string,
  ) {
    this.world = world;
    const attributes = this.attributesMap[layout];

    if (!this.inited) {
      // create geometry, material and attach them to mesh
      const geometry = world.createInstancedBufferGeometry({
        maxInstancedCount: attributes.instancedStartOffsets.length / 2,
        vertexCount: 6,
      });
      this.geometry = geometry;

      world.setIndex(geometry, [0, 2, 1, 0, 3, 2]);

      world.setAttribute(
        geometry,
        'position',
        Float32Array.from(attributes.positions),
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

      world.setAttribute(
        geometry,
        'startOffset',
        Float32Array.from(attributes.instancedStartOffsets),
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

      world.setAttribute(
        geometry,
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

      world.setAttribute(
        geometry,
        'startSize',
        Float32Array.from(attributes.instancedStartSizes),
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

      world.setAttribute(
        geometry,
        'endSize',
        Float32Array.from(attributes.instancedEndSizes),
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

      world.setAttribute(
        geometry,
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

      world.setAttribute(
        geometry,
        'endOffset',
        Float32Array.from(attributes.instancedEndOffsets),
        {
          arrayStride: 4 * 2,
          stepMode: 'instance',
          attributes: [
            {
              shaderLocation: 5,
              offset: 0,
              format: 'float2',
            },
          ],
        },
      );

      world.setAttribute(
        geometry,
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

      const material = world.createShaderMaterial({
        vertexShader: vertexShaderGLSL,
        fragmentShader: fragmentShaderGLSL,
      });
      this.material = material;

      world.setUniform(material, 'u_stroke_width', 1);
      world.setUniform(
        material,
        'u_device_pixel_ratio',
        window.devicePixelRatio,
      );
      world.setUniform(material, 'u_stroke_color', [0, 0, 0, 0]);
      world.setUniform(material, 'u_stroke_opacity', 1);
      world.setUniform(material, 'u_opacity', 0.35);
      world.setUniform(material, 'u_blur', 0.2);
      world.setUniform(material, 'u_time', 0);

      const {
        width: rootWidth,
        height: rootHeight,
      } = rootContainer.visualspace;
      world.setUniform(material, 'u_viewport', [rootWidth, rootHeight]);

      const mesh = world.createMesh({
        geometry,
        material,
      });

      // add meshes to current scene
      world.add(scene, mesh);

      this.inited = true;
    } else {
      // 布局切换，更新顶点数据
      if (this.activeLayout !== layout) {
        const currentAttributes = this.attributesMap[this.activeLayout];
        world.setAttribute(
          this.geometry,
          'startOffset',
          Float32Array.from(currentAttributes.instancedEndOffsets),
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
        world.setAttribute(
          this.geometry,
          'endOffset',
          Float32Array.from(attributes.instancedEndOffsets),
          {
            arrayStride: 4 * 2,
            stepMode: 'instance',
            attributes: [
              {
                shaderLocation: 5,
                offset: 0,
                format: 'float2',
              },
            ],
          },
        );
        world.setAttribute(
          this.geometry,
          'startSize',
          Float32Array.from(currentAttributes.instancedEndSizes),
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

        world.setAttribute(
          this.geometry,
          'endSize',
          Float32Array.from(attributes.instancedEndSizes),
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
      }

      this.startTime = window.performance.now();
    }

    this.activeLayout = layout;
  }

  private buildAttributes(
    container: Container,
    rootContainer: Container,
    attributes: {
      positions: number[];
      instancedStartOffsets: number[];
      instancedEndOffsets: number[];
      instancedColors: number[];
      instancedStartSizes: number[];
      instancedEndSizes: number[];
      instancedShapes: number[];
      instancedPickingColors: number[];
    },
  ) {
    container.contents.forEach((childContainer) => {
      if (!this.isContainer(childContainer)) {
        this.buildMark(container, rootContainer, attributes);
      } else {
        this.buildAttributes(childContainer, rootContainer, attributes);
      }
    });
  }

  private isContainer(container: Container) {
    if (
      container.hasOwnProperty('contents') &&
      container.hasOwnProperty('visualspace') &&
      container.hasOwnProperty('parent')
    ) {
      return true;
    }
    return false;
  }

  private buildMark(
    container: Container,
    rootContainer: Container,
    attributes: {
      positions: number[];
      instancedStartOffsets: number[];
      instancedEndOffsets: number[];
      instancedColors: number[];
      instancedStartSizes: number[];
      instancedEndSizes: number[];
      instancedShapes: number[];
      instancedPickingColors: number[];
    },
  ) {
    const { posX, posY, width, height } = container.visualspace;
    const {
      posX: parentPosX,
      posY: parentPosY,
    } = container.parent!.visualspace;
    const { width: rootWidth, height: rootHeight } = rootContainer.visualspace;

    const index = Number(container.contents[0].$unitChartId);

    attributes.instancedStartSizes[index] = width / 2;
    attributes.instancedEndSizes[index] = width / 2;

    // attributes.instancedStartSizes.push(width / 2);
    // attributes.instancedEndSizes.push(width / 2);

    const { r, g, b } = d3
      .color(this.colorScale(container.contents[0][this.options.color.key]))
      ?.rgb();

    attributes.instancedColors[index * 4] = r / 255;
    attributes.instancedColors[index * 4 + 1] = g / 255;
    attributes.instancedColors[index * 4 + 2] = b / 255;
    attributes.instancedColors[index * 4 + 3] = 1;
    // attributes.instancedColors.push(r / 255, g / 255, b / 255, 1);

    // attributes.instancedEndOffsets.push(
    //   this.convertCanvas2WebGLCoord(posX + parentPosX, rootWidth),
    //   -this.convertCanvas2WebGLCoord(posY + parentPosY, rootHeight),
    // );
    // attributes.instancedStartOffsets.push(
    //   Math.random() * 2 - 1,
    //   Math.random() * 2 - 1,
    // );
    attributes.instancedEndOffsets[index * 2] = this.convertCanvas2WebGLCoord(
      posX + parentPosX,
      rootWidth,
    );
    attributes.instancedEndOffsets[
      index * 2 + 1
    ] = -this.convertCanvas2WebGLCoord(posY + parentPosY, rootHeight);
    attributes.instancedStartOffsets[index * 2] = Math.random() * 2 - 1;
    attributes.instancedStartOffsets[index * 2 + 1] = Math.random() * 2 - 1;

    // attributes.instancedShapes.push(0);
    attributes.instancedShapes[index] = 0;

    // attributes.instancedPickingColors.push(
    //   ...encodePickingColor(Number(container.contents[0].$unitChartId)),
    // );
    const [encodedR, encodedG, encodedB] = encodePickingColor(
      Number(container.contents[0].$unitChartId),
    );
    attributes.instancedPickingColors[index * 3] = encodedR;
    attributes.instancedPickingColors[index * 3 + 1] = encodedG;
    attributes.instancedPickingColors[index * 3 + 2] = encodedB;
  }

  private convertCanvas2WebGLCoord(c: number, size: number) {
    return (c / size) * 2 - 1;
  }
}
