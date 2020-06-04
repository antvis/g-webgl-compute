import { globalInvocationID, workGroupID, numWorkGroups, localInvocationIndex, workGroupSize } from 'g-webgpu';

@numthreads(1, 1, 1)
class Blur {
  @in(600, 600)
  srcTex: image2D;

  @out(360000)
  destTex: vec4[];

  @main
  compute() {
    const index = globalInvocationID.x * workGroupSize.x * numWorkGroups.x + globalInvocationID.y;

    let pixel = [0, 0, 0, 0];
    const uSigma = 0.9544;
    const kernel = int(ceil(4.0 * uSigma));
    let coef = 0;
    for (let dx = -kernel; dx <= kernel; dx++) {
      for (let dy = -kernel; dy <= kernel; dy++) {
        const x = globalInvocationID.x + dx;
        const y = globalInvocationID.y + dy;
        if (x < 0 || x >= 600 ||
            y < 0 || y >= 600) {
          continue;
        }
        const c: float = exp(-(dx * dx + dy * dy) / (2 * uSigma * uSigma));
        pixel += imageLoad(this.srcTex, [x, y] / [600, 600]) * c;
        coef += c;
      }
    }

    this.destTex[index] = pixel / coef * 255;
  }
}