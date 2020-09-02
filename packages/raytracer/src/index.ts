import { CameraComponent, isSafari } from '@antv/g-webgpu-core';
import { WebGPUEngine } from '@antv/g-webgpu-engine';
import * as WebGPUConstants from '@webgpu/types/dist/constants';
import { mat4, vec3 } from 'gl-matrix';
import { InteractionSystem } from './interaction';
import { Mesh } from './Mesh';
import { cornellBoxScene } from './scene/cornell';
import blitFragCode from './shaders/blit.frag.glsl';
import blitVertCode from './shaders/blit.vert.glsl';
// import rayComputeCode from './shaders/raycasting.comp.glsl';
import rayComputeCode from './shaders/whitted.comp.glsl';

console.log(
  rayComputeCode,
  'ssssssssssssssssssssssssssssssssssssssssssssssssssssssss',
);

export class RayTracer {
  private engine: WebGPUEngine;
  private inited: boolean = false;
  private rafHandle: number;

  private computeBindGroupLayout: GPUBindGroupLayout;
  private computePipeline: GPUComputePipeline;
  private renderBindGroupLayout: GPUBindGroupLayout;
  private renderPipeline: GPURenderPipeline;
  private outputTexture: GPUTexture;
  private accumulatedTexture: GPUTexture;
  private verticesBuffer: Float32Array;
  private meshesBuffer: Float32Array;
  private trianglesBuffer: Int32Array;
  private camera: CameraComponent;
  private sampleCount = 0;
  private randomSeed = 0;
  private interactionSystem: InteractionSystem;

  constructor(
    private options: {
      canvas: HTMLCanvasElement;
      onInit?: (() => void) | null;
      onUpdate?: (() => void) | null;
    },
  ) {}

  public async init() {
    this.engine = new WebGPUEngine();
    await this.engine.init({
      canvas: this.options.canvas,
      swapChainFormat: WebGPUConstants.TextureFormat.BGRA8Unorm,
      antialiasing: false,
      supportCompute: true,
    });
    await this.update();
  }

  public setSize(width: number, height: number) {
    const canvas = this.engine.getCanvas();
    const pixelRatio = window.devicePixelRatio;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    this.engine.viewport({
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    });
  }

  public update = async () => {
    await this.render();
    // 考虑运行在 Worker 中，不能使用 window.requestAnimationFrame
    this.rafHandle = requestAnimationFrame(this.update);
  };

  public destroy() {
    this.engine.destroy();
    this.interactionSystem.tearDown();
    cancelAnimationFrame(this.rafHandle);
  }

  private async render() {
    this.engine.beginFrame();

    this.engine.clear({
      color: [1, 1, 1, 1],
      depth: 1,
    });

    if (!this.inited) {
      if (this.options.onInit) {
        this.options.onInit();
      }
      this.createCamera();
      this.createInteraction();
      this.createMeshes();
      this.createOutputTexture();
      await this.createComputePipeline();
      await this.createRenderPipeline();
      this.inited = true;
    }

    if (this.options.onUpdate) {
      this.options.onUpdate();
    }

    this.runComputePipeline();
    this.runRenderPipeline();

    this.engine.endFrame();
  }

  private createInteraction() {
    this.interactionSystem = new InteractionSystem(
      this.options.canvas,
      this.camera,
      () => {
        this.sampleCount = 0;
        this.randomSeed = 0;
      },
    );
    this.interactionSystem.initialize();
  }

  private createCamera() {
    this.camera = new CameraComponent({});
    this.camera.position = vec3.fromValues(-2.75, 2.75, 8.35);
    this.camera.setFocalPoint(vec3.fromValues(-2.75, 2.75, 0));
    this.camera.setPerspective(0.1, 100, 40, 1);
  }

  private createMeshes() {
    let totalVerticeCount = 0;
    let totalTriangleCount = 0;
    cornellBoxScene.forEach((mesh) => {
      totalVerticeCount += mesh.vertices.length;
      totalTriangleCount += mesh.indices.length;
    });

    const verticesBuffer = new Float32Array((totalVerticeCount / 3) * 4);
    let index = 0;
    let trianglesArray = new Array();
    let indicesOffset = 0;
    let accumulatingTriangleCount = 0;

    cornellBoxScene.forEach((mesh) => {
      const vertices = mesh.vertices;

      for (let i = 0; i < vertices.length; i += 3) {
        verticesBuffer[index++] = vertices[i];
        verticesBuffer[index++] = vertices[i + 1];
        verticesBuffer[index++] = vertices[i + 2];
        verticesBuffer[index++] = 0.0;
      }

      trianglesArray = trianglesArray.concat(
        mesh.indices.map((i) => i + indicesOffset),
      );
      mesh.offset = accumulatingTriangleCount;
      accumulatingTriangleCount += mesh.triangleCount * 3;
      indicesOffset += mesh.verticeCount;
    });

    const trianglesBuffer = new Int32Array(trianglesArray);
    const meshesBuffer = new Float32Array(
      Mesh.createMeshesBuffer(cornellBoxScene),
    );

    this.verticesBuffer = verticesBuffer;
    this.trianglesBuffer = trianglesBuffer;
    this.meshesBuffer = meshesBuffer;
  }

  private createOutputTexture() {
    this.outputTexture = this.engine.device.createTexture({
      label: 'Output Texture',
      size: {
        width: this.options.canvas.width,
        height: this.options.canvas.height,
        depth: 1,
      },
      // TODO: arrayLayerCount is deprecated: use size.depth
      // arrayLayerCount: 1,
      mipLevelCount: 1,
      sampleCount: 1,
      dimension: WebGPUConstants.TextureDimension.E2d,
      format: WebGPUConstants.TextureFormat.RGBA32Float,
      usage: WebGPUConstants.TextureUsage.Storage,
    });

    this.accumulatedTexture = this.engine.device.createTexture({
      label: 'Accumulated Texture',
      size: {
        width: this.options.canvas.width,
        height: this.options.canvas.height,
        depth: 1,
      },
      // TODO: arrayLayerCount is deprecated: use size.depth
      // arrayLayerCount: 1,
      mipLevelCount: 1,
      sampleCount: 1,
      dimension: WebGPUConstants.TextureDimension.E2d,
      format: WebGPUConstants.TextureFormat.RGBA32Float,
      usage: WebGPUConstants.TextureUsage.Storage,
    });
  }

  private async createRenderPipeline() {
    const {
      vertexStage,
      fragmentStage,
    } = await this.compilePipelineStageDescriptor(blitVertCode, blitFragCode);

    const bindGroupLayoutEntries = [
      {
        binding: 0,
        visibility: WebGPUConstants.ShaderStage.Fragment,
        type: 'readonly-storage-texture',
        viewDimension: WebGPUConstants.TextureViewDimension.E2d,
        storageTextureFormat: WebGPUConstants.TextureFormat.RGBA32Float,
      },
    ];

    this.renderBindGroupLayout = this.engine.device.createBindGroupLayout(
      isSafari
        ? // @ts-ignore
          { bindings: bindGroupLayoutEntries }
        : { entries: bindGroupLayoutEntries },
    );

    const pipelineLayout = this.engine.device.createPipelineLayout({
      bindGroupLayouts: [this.renderBindGroupLayout],
    });

    this.renderPipeline = this.engine.device.createRenderPipeline({
      sampleCount: this.engine.mainPassSampleCount,
      primitiveTopology: WebGPUConstants.PrimitiveTopology.TriangleList,
      rasterizationState: {
        frontFace: WebGPUConstants.FrontFace.CCW,
        cullMode: WebGPUConstants.CullMode.Back,
        depthBias: 0,
        depthBiasClamp: 0,
        depthBiasSlopeScale: 0,
      },
      depthStencilState: {
        depthWriteEnabled: false,
        // depthCompare: depthFuncMap[depth?.func || gl.ALWAYS],
        format: WebGPUConstants.TextureFormat.Depth24PlusStencil8,
        // stencilFront: stencilFrontBack,
        // stencilBack: stencilFrontBack,
        stencilReadMask: 0xffffffff,
        stencilWriteMask: 0xffffffff,
      },
      colorStates: [
        {
          format: this.engine.options.swapChainFormat!,
          alphaBlend: {
            srcFactor: WebGPUConstants.BlendFactor.One,
            dstFactor: WebGPUConstants.BlendFactor.One,
            operation: WebGPUConstants.BlendOperation.Add,
          },
          colorBlend: {
            srcFactor: WebGPUConstants.BlendFactor.SrcAlpha,
            dstFactor: WebGPUConstants.BlendFactor.OneMinusDstAlpha,
            operation: WebGPUConstants.BlendOperation.Add,
          },
          writeMask: WebGPUConstants.ColorWrite.All,
        },
      ],
      alphaToCoverageEnabled: false,
      layout: pipelineLayout,
      vertexStage,
      fragmentStage,
      vertexState: {
        indexFormat: WebGPUConstants.IndexFormat.Uint32,
        vertexBuffers: [],
      },
    });
  }

  private async createComputePipeline() {
    const { computeStage } = await this.compileComputePipelineStageDescriptor(
      rayComputeCode,
    );

    const bindGroupLayoutEntries = [
      {
        binding: 0,
        visibility: WebGPUConstants.ShaderStage.Compute,
        type: 'uniform-buffer',
      },
      {
        binding: 1,
        visibility: WebGPUConstants.ShaderStage.Compute,
        type: 'writeonly-storage-texture',
        viewDimension: WebGPUConstants.TextureViewDimension.E2d,
        storageTextureFormat: WebGPUConstants.TextureFormat.RGBA32Float,
      },
      {
        binding: 2,
        visibility: WebGPUConstants.ShaderStage.Compute,
        type: 'readonly-storage-texture',
        viewDimension: WebGPUConstants.TextureViewDimension.E2d,
        storageTextureFormat: WebGPUConstants.TextureFormat.RGBA32Float,
      },
      {
        binding: 3,
        visibility: WebGPUConstants.ShaderStage.Compute,
        type: 'readonly-storage-buffer',
      },
      {
        binding: 4,
        visibility: WebGPUConstants.ShaderStage.Compute,
        type: 'readonly-storage-buffer',
      },
      {
        binding: 5,
        visibility: WebGPUConstants.ShaderStage.Compute,
        type: 'readonly-storage-buffer',
      },
    ];

    this.computeBindGroupLayout = this.engine.device.createBindGroupLayout(
      isSafari
        ? // @ts-ignore
          { bindings: bindGroupLayoutEntries }
        : { entries: bindGroupLayoutEntries },
    );

    const pipelineLayout = this.engine.device.createPipelineLayout({
      bindGroupLayouts: [this.computeBindGroupLayout],
    });

    this.computePipeline = this.engine.device.createComputePipeline({
      layout: pipelineLayout,
      computeStage,
    });
  }

  private runComputePipeline() {
    if (this.engine.currentComputePass) {
      const cameraWorldMatrix = this.camera.matrix;
      const projectionInverseMatrix = mat4.invert(
        mat4.create(),
        this.camera.getPerspective(),
      );

      const NDCToScreenMatrix = mat4.create();
      mat4.identity(NDCToScreenMatrix);
      mat4.translate(NDCToScreenMatrix, NDCToScreenMatrix, [-1, -1, 0]);
      mat4.scale(NDCToScreenMatrix, NDCToScreenMatrix, [2, 2, 1]);

      mat4.multiply(
        projectionInverseMatrix,
        projectionInverseMatrix,
        NDCToScreenMatrix,
      );

      const mergedUniformData = [
        ...cameraWorldMatrix,
        ...projectionInverseMatrix,
        this.randomSeed,
        this.sampleCount,
        0,
        0,
      ];
      const uniformBuffer = this.engine.createBuffer({
        data: new Float32Array(mergedUniformData),
        usage:
          WebGPUConstants.BufferUsage.Uniform |
          WebGPUConstants.BufferUsage.CopyDst,
      });

      const verticeBuffer = this.engine.createBuffer({
        data: this.verticesBuffer,
        // @ts-ignore
        usage:
          WebGPUConstants.BufferUsage.Storage |
          WebGPUConstants.BufferUsage.CopyDst,
      });
      const trianglesBuffer = this.engine.createBuffer({
        data: this.trianglesBuffer,
        // @ts-ignore
        usage:
          WebGPUConstants.BufferUsage.Storage |
          WebGPUConstants.BufferUsage.CopyDst,
      });
      const meshesBuffer = this.engine.createBuffer({
        data: this.meshesBuffer,
        // @ts-ignore
        usage:
          WebGPUConstants.BufferUsage.Storage |
          WebGPUConstants.BufferUsage.CopyDst,
      });

      const bindGroupEntries = [
        {
          binding: 0,
          // https://gpuweb.github.io/gpuweb/#typedefdef-gpubindingresource
          resource: {
            // @ts-ignore
            buffer: uniformBuffer.get(),
          },
        },
        {
          binding: 1,
          resource: isSafari
            ? // @ts-ignore
              this.outputTexture.createDefaultView()
            : this.outputTexture.createView(),
        },
        {
          binding: 2,
          resource: isSafari
            ? // @ts-ignore
              this.accumulatedTexture.createDefaultView()
            : this.accumulatedTexture.createView(),
        },
        {
          binding: 3,
          resource: {
            // @ts-ignore
            buffer: verticeBuffer.get(),
          },
        },
        {
          binding: 4,
          resource: {
            // @ts-ignore
            buffer: trianglesBuffer.get(),
          },
        },
        {
          binding: 5,
          resource: {
            // @ts-ignore
            buffer: meshesBuffer.get(),
          },
        },
      ];
      const computeBindGroup = this.engine.device.createBindGroup(
        isSafari
          ? {
              label: 'Compute Bind Group',
              layout: this.computeBindGroupLayout,
              // @ts-ignore
              bindings: bindGroupEntries,
            }
          : {
              label: 'Compute Bind Group',
              layout: this.computeBindGroupLayout,
              entries: bindGroupEntries,
            },
      );

      this.engine.currentComputePass.setPipeline(this.computePipeline);
      this.engine.currentComputePass.setBindGroup(0, computeBindGroup);
      this.engine.currentComputePass.dispatch(
        this.options.canvas.width / 16,
        this.options.canvas.height / 16,
        1,
      );
      this.sampleCount++;
      this.randomSeed++;
    }
  }

  private runRenderPipeline() {
    const renderPass =
      this.engine.bundleEncoder || this.engine.currentRenderPass!;

    if (this.renderPipeline) {
      renderPass.setPipeline(this.renderPipeline);
    }

    const bindGroupEntries = [
      {
        binding: 0,
        resource: isSafari
          ? // @ts-ignore
            this.outputTexture.createDefaultView()
          : this.outputTexture.createView(),
      },
    ];

    const renderBindGroup = this.engine.device.createBindGroup(
      isSafari
        ? {
            label: 'Render Bind Group',
            layout: this.renderBindGroupLayout,
            // @ts-ignore
            bindings: bindGroupEntries,
          }
        : {
            label: 'Render Bind Group',
            layout: this.renderBindGroupLayout,
            entries: bindGroupEntries,
          },
    );

    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(3);

    // swap
    const tmp = this.accumulatedTexture;
    this.accumulatedTexture = this.outputTexture;
    this.outputTexture = tmp;
  }

  private compileShaderToSpirV(
    source: string,
    type: string,
    shaderVersion: string,
  ): Promise<Uint32Array> {
    return this.compileRawShaderToSpirV(shaderVersion + source, type);
  }

  private compileRawShaderToSpirV(
    source: string,
    type: string,
  ): Promise<Uint32Array> {
    return this.engine.glslang.compileGLSL(source, type);
  }

  private async compilePipelineStageDescriptor(
    vertexCode: string,
    fragmentCode: string,
  ): Promise<
    Pick<GPURenderPipelineDescriptor, 'vertexStage' | 'fragmentStage'>
  > {
    const shaderVersion = '#version 450\n';
    const vertexShader = await this.compileShaderToSpirV(
      vertexCode,
      'vertex',
      shaderVersion,
    );
    const fragmentShader = await this.compileShaderToSpirV(
      fragmentCode,
      'fragment',
      shaderVersion,
    );

    return this.createPipelineStageDescriptor(vertexShader, fragmentShader);
  }

  private createPipelineStageDescriptor(
    vertexShader: Uint32Array,
    fragmentShader: Uint32Array,
  ): Pick<GPURenderPipelineDescriptor, 'vertexStage' | 'fragmentStage'> {
    return {
      vertexStage: {
        module: this.engine.device.createShaderModule({
          code: vertexShader,
          // @ts-ignore
          isWHLSL: isSafari,
        }),
        entryPoint: 'main',
      },
      fragmentStage: {
        module: this.engine.device.createShaderModule({
          code: fragmentShader,
          // @ts-ignore
          isWHLSL: isSafari,
        }),
        entryPoint: 'main',
      },
    };
  }

  private async compileComputePipelineStageDescriptor(
    computeCode: string,
  ): Promise<Pick<GPUComputePipelineDescriptor, 'computeStage'>> {
    let computeShader;
    if (isSafari) {
      computeShader = computeCode;
    } else {
      const shaderVersion = '#version 450\n';
      computeShader = await this.compileShaderToSpirV(
        computeCode,
        'compute',
        shaderVersion,
      );
    }

    return {
      computeStage: {
        module: this.engine.device.createShaderModule({
          code: computeShader,
          // @ts-ignore
          isWHLSL: isSafari,
        }),
        entryPoint: 'main',
      },
    };
  }
}
