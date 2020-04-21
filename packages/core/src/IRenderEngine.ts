/**
 * We try to use WebGPU first and fallback to WebGL1 if not supported.
 * So we use WebGPU-styled API here.
 */
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Uint8ClampedArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

/**
 * Options to create the WebGPU engine
 */
export interface IWebGPUEngineOptions extends GPURequestAdapterOptions {
  /**
   * Defines the category of adapter to use.
   * Is it the discrete or integrated device.
   */
  powerPreference?: GPUPowerPreference;

  /**
   * Defines the device descriptor used to create a device.
   */
  deviceDescriptor?: GPUDeviceDescriptor;

  /**
   * Defines the requested Swap Chain Format.
   */
  swapChainFormat?: GPUTextureFormat;

  /**
   * Defines wether MSAA is enabled on the canvas.
   */
  antialiasing?: boolean;

  /**
   * Whether to support ComputePipeline.
   */
  supportCompute?: boolean;
}

export interface IRenderEngine {
  /**
   * create GPU command encoders
   */
  beginFrame(): void;

  /**
   * finish GPU command encoders and submit queues.
   */
  endFrame(): void;

  startRecordBundle(): void;

  stopRecordBundle(): GPURenderBundle;

  executeBundles(bundles: GPURenderBundle[]): void;

  enableScissor(x: number, y: number, width: number, height: number): void;

  disableScissor(): void;

  clear(
    color: GPUColor,
    backBuffer: boolean,
    depth: boolean,
    stencil?: boolean,
  ): void;

  compileRawPipelineStageDescriptor(
    vertexCode: string,
    fragmentCode: string,
  ): Promise<
    Pick<GPURenderPipelineDescriptor, 'vertexStage' | 'fragmentStage'>
  >;

  compilePipelineStageDescriptor(
    vertexCode: string,
    fragmentCode: string,
    defines: string | null,
  ): Promise<
    Pick<GPURenderPipelineDescriptor, 'vertexStage' | 'fragmentStage'>
  >;

  compileComputePipelineStageDescriptor(
    computeCode: string,
    defines: string | null,
  ): Promise<Pick<GPUComputePipelineDescriptor, 'computeStage'>>;

  drawElementsType(
    pipelineName: string,
    descriptor: WithOptional<
      Pick<
        GPURenderPipelineDescriptor,
        | 'primitiveTopology'
        | 'rasterizationState'
        | 'depthStencilState'
        | 'colorStates'
        | 'vertexStage'
        | 'fragmentStage'
        | 'vertexState'
        | 'layout'
      >,
      | 'primitiveTopology'
      | 'rasterizationState'
      | 'depthStencilState'
      | 'colorStates'
      | 'fragmentStage'
      | 'vertexState'
    >,
    indexStart: number,
    indexCount: number,
    instancesCount?: number,
  ): void;

  drawArraysType(
    pipelineName: string,
    descriptor: WithOptional<
      Pick<
        GPURenderPipelineDescriptor,
        | 'primitiveTopology'
        | 'rasterizationState'
        | 'depthStencilState'
        | 'colorStates'
        | 'vertexStage'
        | 'fragmentStage'
        | 'vertexState'
        | 'layout'
      >,
      | 'primitiveTopology'
      | 'rasterizationState'
      | 'depthStencilState'
      | 'colorStates'
      | 'fragmentStage'
      | 'vertexState'
    >,
    verticesStart: number,
    verticesCount: number,
    instancesCount?: number,
  ): void;

  createVertexBuffer(
    data: number[] | ArrayBuffer | ArrayBufferView,
    usage?: number,
  ): GPUBuffer;

  createUniformBuffer(
    data: number[] | ArrayBuffer | ArrayBufferView,
  ): GPUBuffer;

  createIndexBuffer(data: number[] | ArrayBuffer | ArrayBufferView): GPUBuffer;

  setRenderBindGroups(bindGroups: GPUBindGroup[]): void;

  setComputeBindGroups(bindGroups: GPUBindGroup[]): void;

  setComputePipeline(
    computePipelineName: string,
    descriptor: GPUComputePipelineDescriptor,
  ): void;

  setSubData(
    destBuffer: GPUBuffer,
    destOffset: number,
    srcArrayBuffer: ArrayBufferView,
  ): void;

  readData(
    destBuffer: GPUBuffer,
    byteCount: number,
    arrayClazz: TypedArrayConstructor,
  ): Promise<ArrayBufferView>;

  bindVertexInputs(vertexInputs: {
    indexBuffer: GPUBuffer | null;
    indexOffset: number;
    vertexStartSlot: number;
    vertexBuffers: GPUBuffer[];
    vertexOffsets: number[];
  }): void;

  dispatch(num: number): void;

  getDevice(): GPUDevice;

  /**
   * lifecycle
   */

  init(
    canvas: HTMLCanvasElement,
    options?: IWebGPUEngineOptions,
  ): Promise<void>;

  dispose(): void;
}
