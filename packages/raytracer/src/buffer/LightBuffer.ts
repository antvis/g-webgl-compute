import { vec3 } from 'gl-matrix';
import { Buffer } from './Buffer';

export class LightBuffer extends Buffer {
  public static bytes = 8;

  constructor(length: number) {
    super(4, length);
  }

  public append(lightData: {
    position: vec3;
    color: vec3;
    intensity: number;
    radius: number;
  }) {
    this.appendF(lightData.position[0]);
    this.appendF(lightData.position[1]);
    this.appendF(lightData.position[2]);
    this.appendF(lightData.radius);
    this.appendF(lightData.color[0]);
    this.appendF(lightData.color[1]);
    this.appendF(lightData.color[2]);
    this.appendF(lightData.intensity);
  }
}
