import { vec3 } from 'gl-matrix';

export class Mesh {
  // int offset; 4 bytes
  // int triangle_count; 4 bytes
  // 8 bytes padding
  // vec3 diffuseColor; 12 bytes
  // 4 bytes padding
  // vec3 emission; 12 bytes
  // 4 bytes padding
  // total : 48
  //
  // Rounded up to 16 byte padding
  //
  // total : 48
  //
  // See why padding is required here:
  // https://twitter.com/9ballsyndrome/status/1178039885090848770
  // https://www.khronos.org/registry/OpenGL/specs/es/3.1/es_spec_3.1.pdf "7.6.2.2 Standard Uniform Block Layout" [1-10]
  public static Padding = 48;

  public static createMeshesBuffer(meshes: Mesh[]) {
    const buffer = new ArrayBuffer(meshes.length * Mesh.Padding);
    const int32Data = new Int32Array(buffer);
    const float32Data = new Float32Array(buffer);
    const padding = Mesh.Padding / 4;

    for (let index = 0; index < meshes.length; index++) {
      const element = meshes[index];
      int32Data[padding * index] = element.offset;
      int32Data[padding * index + 1] = element.triangleCount;
      // padding
      float32Data[padding * index + 4] = element.diffuseColor[0];
      float32Data[padding * index + 5] = element.diffuseColor[1];
      float32Data[padding * index + 6] = element.diffuseColor[2];
      // padding
      float32Data[padding * index + 8] = element.emission[0];
      float32Data[padding * index + 9] = element.emission[1];
      float32Data[padding * index + 10] = element.emission[2];
    }
    return buffer;
  }

  public diffuseColor = vec3.fromValues(0.4, 0.4, 0.4);
  public emission = vec3.fromValues(0.0, 0.0, 0.0);
  public offset = 0;
  public verticeCount = 0;
  public triangleCount = 0;

  constructor(
    public name: string,
    public vertices: number[],
    public indices: number[],
  ) {
    this.verticeCount = this.vertices.length / 3;
    this.triangleCount = this.indices.length / 3;
  }
}
