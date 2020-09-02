export class Buffer {
  private cursor = 0;
  private buffer: ArrayBuffer;
  private bindingPoint: number;
  private i32: Int32Array;
  private f32: Float32Array;

  constructor(bindingPoint: number, length: number) {
    // we only use Int32 and Float32, so 4 bytes for each item
    this.buffer = new ArrayBuffer(length * 4);
    this.i32 = new Int32Array(this.buffer);
    this.f32 = new Float32Array(this.buffer);
    this.bindingPoint = bindingPoint;
  }

  // createWebGLBuffer(gl: WebGL2Context) {
  //   const id = gl.createBuffer();

  //   gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, id);
  //   // Important! Tell the buffer to bind to a specific binding point
  //   gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, this.bindingPoint, id);

  //   return {
  //     name,
  //     buffer: id as WebGLBuffer,
  //     length: 0,
  //   };
  // }

  protected appendF(n: number) {
    this.f32[this.cursor++] = n;
  }

  protected appendI(n: number) {
    this.i32[this.cursor++] = n;
  }

  protected pad(n: number) {
    this.cursor += n;
  }
}
