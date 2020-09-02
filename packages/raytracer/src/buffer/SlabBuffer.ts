// import { vec3 } from 'gl-matrix';
// import { Buffer } from './Buffer';

// export class SlabBuffer extends Buffer {
//   public static bytes = 8;

//   constructor(length: number) {
//     super(3, length);
//   }

//   public append(slab: Slab) {
//     this.appendF(slab.normal[0]);
//     this.appendF(slab.normal[1]);
//     this.appendF(slab.normal[2]);
//     this.appendF(slab.near);
//     this.appendF(slab.far);
//     this.pad(3);
//   }
// }
