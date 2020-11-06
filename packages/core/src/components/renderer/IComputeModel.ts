export interface IComputeModel {
  destroy(): void;

  /**
   * dispatch
   */
  run(): void;

  /**
   * 读取结果数据
   */
  readData(): Promise<
    | Float32Array
    | Float64Array
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
  >;

  /**
   * 在运行时更新变量
   */
  updateUniform(
    uniformName: string,
    data:
      | number
      | number[]
      | Float32Array
      | Uint8Array
      | Uint16Array
      | Uint32Array
      | Int8Array
      | Int16Array
      | Int32Array,
  ): void;

  updateBuffer(
    bufferName: string,
    data:
      | number[]
      | Float32Array
      | Uint8Array
      | Uint16Array
      | Uint32Array
      | Int8Array
      | Int16Array
      | Int32Array,
    offset?: number,
  ): void;

  /**
   * 以另一个计算模型结果作为输入
   */
  confirmInput(model: IComputeModel, inputName: string): void;
}
