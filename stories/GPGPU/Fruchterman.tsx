// @ts-nocheck
import { World } from '@antv/g-webgpu';
import * as dat from 'dat.gui';
import * as React from 'react';
import lineFragmentShaderGLSL from './shaders/fruchterman-line.frag.glsl';
import lineVertexShaderGLSL from './shaders/fruchterman-line.vert.glsl';
import computeShaderGLSL from './shaders/fruchterman.comp.glsl';
import fragmentShaderGLSL from './shaders/fruchterman.frag.glsl';
import vertexShaderGLSL from './shaders/fruchterman.vert.glsl';

const MAX_ITERATION = 8000;

let numParticles = 0;
let numEdges = 0;

/**
 * ported from G6
 * @see https://github.com/antvis/G6/blob/master/src/layout/fruchterman.ts
 *
 * WebGL/Unity implements
 * @see https://nblintao.github.io/ParaGraphL/
 * @see https://github.com/l-l/UnityNetworkGraph/blob/master/Assets/Shaders/GraphCS.compute
 */
export default class Fruchterman extends React.Component {
  private gui: dat.GUI;
  private $stats: Node;
  private world: World;
  // index buffer or edges
  private lineIndexBufferData = [];

  public async componentDidMount() {
    // @see https://g6.antv.vision/en/examples/net/forceDirected/#basicForceDirected
    const data = await (
      await fetch(
        'https://gw.alipayobjects.com/os/basement_prod/7bacd7d1-4119-4ac1-8be3-4c4b9bcbc25f.json',
      )
    ).json();

    const nodes = data.nodes.map((n) => ({
      x: (Math.random() * 2 - 1) / 10,
      y: (Math.random() * 2 - 1) / 10,
      id: n.id,
    }));
    const edges = data.edges;

    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      numParticles = nodes.length;
      numEdges = edges.length;
      const nodesEdgesArray = this.buildTextureData(nodes, edges);

      const simParamData = new Float32Array([
        (numParticles * numParticles) / (numParticles + 1) / 300 / 300, // k^2
        Math.sqrt((numParticles * numParticles) / (numParticles + 1) / 300), // k
        this.maxEdgePerVetex, // maxEdgePerVetex
        50, // gravity
        0.1, // speed
        Math.sqrt(numParticles * numParticles) / 10, // maxDisplace
      ]);

      this.world = new World(canvas, {
        engineOptions: {
          supportCompute: true,
        },
      });

      const compute = this.world.createComputePipeline({
        type: 'layout',
        shader: computeShaderGLSL,
        particleCount: numParticles,
        particleData: nodesEdgesArray,
        maxIteration: MAX_ITERATION,
        onCompleted: (finalParticleData) => {
          const scene = this.createScene(canvas);
          this.renderLines(scene, finalParticleData, nodes);
          this.renderCircles(scene, finalParticleData, nodes);
        },
      });

      this.world.setBinding(compute, 'simParams', simParamData, {
        binding: 1,
        type: 'uniform-buffer',
      });
    }
  }

  public componentWillUnmount() {
    if (this.world) {
      this.world.destroy();
    }
  }

  public render() {
    return <canvas id="application" width="600" height="600" />;
  }

  private createScene(canvas) {
    // create a camera
    const camera = this.world.createCamera({
      aspect: Math.abs(canvas.width / canvas.height),
      angle: 50,
      far: 1000,
      near: 0.1,
    });
    this.world.getCamera(camera).setPosition(0, 0, 2);

    // create a scene
    return this.world.createScene({ camera });
  }

  private renderCircles(scene, particleData, nodes) {
    const geometry = this.world.createInstancedBufferGeometry({
      maxInstancedCount: numParticles,
      vertexCount: numParticles * 6,
    });

    const extrudeData = [];
    const colorData = [];
    const sizeData = [];

    nodes.forEach(() => {
      colorData.push(198 / 255, 229 / 255, 1, 1);
      sizeData.push(10); // radius
      extrudeData.push(1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1);
    });

    this.world.setAttribute(geometry, 'particle', particleData, {
      // instanced particles buffer
      arrayStride: 4 * 4,
      stepMode: 'instance',
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: 'float4',
        },
      ],
    });

    this.world.setAttribute(
      geometry,
      'extrude',
      new Float32Array(extrudeData),
      {
        arrayStride: 2 * 4,
        stepMode: 'vertex',
        attributes: [
          {
            shaderLocation: 1,
            offset: 0,
            format: 'float2',
          },
        ],
      },
    );

    this.world.setAttribute(geometry, 'color', new Float32Array(colorData), {
      arrayStride: 4 * 4,
      stepMode: 'instance',
      attributes: [
        {
          shaderLocation: 2,
          offset: 0,
          format: 'float4',
        },
      ],
    });

    this.world.setAttribute(geometry, 'size', new Float32Array(sizeData), {
      arrayStride: 4,
      stepMode: 'instance',
      attributes: [
        {
          shaderLocation: 3,
          offset: 0,
          format: 'float',
        },
      ],
    });

    const material = this.world.createShaderMaterial({
      vertexShader: vertexShaderGLSL,
      fragmentShader: fragmentShaderGLSL,
      rasterizationState: {
        cullMode: 'none',
      },
      depthStencilState: {
        depthWriteEnabled: false,
      },
      colorStates: [
        {
          format: 'bgra8unorm',
          colorBlend: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add',
          },
          alphaBlend: {
            srcFactor: 'one',
            dstFactor: 'one',
            operation: 'add',
          },
        },
      ],
    });

    this.world.addUniform(material, {
      binding: 1,
      name: 'opacity',
      format: 'float',
      data: Float32Array.from([1]),
      dirty: true,
    });

    this.world.addUniform(material, {
      binding: 1,
      name: 'strokeWidth',
      format: 'float',
      data: Float32Array.from([2]),
      dirty: true,
    });

    this.world.addUniform(material, {
      binding: 1,
      name: 'strokeColor',
      format: 'float4',
      data: Float32Array.from([1, 1, 0, 1]),
      dirty: true,
    });

    this.world.addUniform(material, {
      binding: 1,
      name: 'strokeOpacity',
      format: 'float',
      data: Float32Array.from([0.8]),
      dirty: true,
    });

    const mesh = this.world.createMesh({
      geometry,
      material,
    });

    this.world.add(scene, mesh);
  }

  private renderLines(scene, particleData, nodes) {
    const geometry = this.world.createInstancedBufferGeometry({
      maxInstancedCount: 1,
      vertexCount: numEdges * 2,
    });

    this.world.setAttribute(geometry, 'particle', particleData, {
      arrayStride: 4 * 4,
      stepMode: 'vertex',
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: 'float4',
        },
      ],
    });

    this.world.setIndex(geometry, new Uint32Array(this.lineIndexBufferData));

    const material = this.world.createShaderMaterial({
      vertexShader: lineVertexShaderGLSL,
      fragmentShader: lineFragmentShaderGLSL,
      primitiveTopology: 'line-list',
    });

    const mesh = this.world.createMesh({
      geometry,
      material,
    });
    this.world.add(scene, mesh);
  }

  // @see https://github.com/nblintao/ParaGraphL/blob/master/sigma.layout.paragraphl.js#L192-L229
  private buildTextureData(nodes, edges) {
    const dataArray = [];
    const nodeDict = [];
    const mapIdPos = {};
    let i = 0;
    for (i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      mapIdPos[n.id] = i;
      dataArray.push(n.x);
      dataArray.push(n.y);
      dataArray.push(0);
      dataArray.push(0);
      nodeDict.push([]);
    }
    for (i = 0; i < edges.length; i++) {
      const e = edges[i];
      nodeDict[mapIdPos[e.source]].push(mapIdPos[e.target]);
      nodeDict[mapIdPos[e.target]].push(mapIdPos[e.source]);
      this.lineIndexBufferData.push(mapIdPos[e.source], mapIdPos[e.target]);
    }

    this.maxEdgePerVetex = 0;
    for (i = 0; i < nodes.length; i++) {
      const offset = dataArray.length;
      const dests = nodeDict[i];
      const len = dests.length;
      dataArray[i * 4 + 2] = offset;
      dataArray[i * 4 + 3] = dests.length;
      this.maxEdgePerVetex = Math.max(this.maxEdgePerVetex, dests.length);
      for (let j = 0; j < len; ++j) {
        const dest = dests[j];
        dataArray.push(+dest);
      }
    }

    while (dataArray.length % 4 !== 0) {
      dataArray.push(0);
    }
    return new Float32Array(dataArray);
  }
}
