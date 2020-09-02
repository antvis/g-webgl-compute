import { vec3 } from 'gl-matrix';
import { Buffer } from './Buffer';

export class VertexBuffer extends Buffer {
  public static bytes = 4;

  constructor(length: number) {
    super(1, length);
  }

  public append(v: vec3) {
    // copy vertices data to the buffer
    this.appendF(v[0]);
    this.appendF(v[1]);
    this.appendF(v[2]);
    this.pad(1);
  }
}
