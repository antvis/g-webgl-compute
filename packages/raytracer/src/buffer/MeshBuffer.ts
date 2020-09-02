import { vec3 } from 'gl-matrix';
import { Buffer } from './Buffer';

export class MeshBuffer extends Buffer {
  public static bytes = 20;

  constructor(length: number) {
    super(2, length);
  }

  public append(meshData: {
    faceCount: number;
    // the starting index in the vertex buffer
    vertexOffset: number;
    slabCount?: number;
    slabOffset?: number;
    specularExponent: number;
    diffuseColor: vec3;
    specularColor: vec3;
    refractionColor: vec3;
  }) {
    // padding required: https://twitter.com/9ballsyndrome/status/1178039885090848770
    // under std430 layout, a struct in an array use the largest alignment of its member.
    // int face_count;
    this.appendI(meshData.faceCount);
    // int offset;
    this.appendI(meshData.vertexOffset);
    // int slab_count
    this.appendI(meshData.slabCount ?? 0);
    // int slab_offset;
    this.appendI(meshData.slabOffset ?? 0);
    // alpha
    this.appendF(meshData.specularExponent ?? 100);
    // paddings
    this.pad(3);

    // vec3 color;
    this.appendF(meshData.diffuseColor[0] || 0);
    this.appendF(meshData.diffuseColor[1] || 0);
    this.appendF(meshData.diffuseColor[2] || 0);
    // padding
    this.pad(1);
    // vec3 specular
    this.appendF(meshData.specularColor[0] || 0);
    this.appendF(meshData.specularColor[1] || 0);
    this.appendF(meshData.specularColor[2] || 0);
    // padding
    this.pad(1);
    // vec3 refraction;
    this.appendF(meshData.refractionColor[0] || 0);
    this.appendF(meshData.refractionColor[1] || 0);
    this.appendF(meshData.refractionColor[2] || 0);
    // padding
    this.pad(1);
  }
}
