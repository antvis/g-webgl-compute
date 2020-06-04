import { workGroupSize, workGroupID, localInvocationID } from 'g-webgpu';

@numthreads(1024, 1, 1)
class Reduce {
  @in
  gData: float[];

  @out(5120)
  oData: float[];

  @shared(1024)
  sData: float[];

  @main
  compute() {
    const tid = localInvocationID.x;
    const i = workGroupID.x * workGroupSize.x * 2 + localInvocationID.x;

    this.sData[tid] = this.gData[i] + this.gData[i + workGroupSize.x];
    barrier();

    for (let s = workGroupSize.x / 2; s > 0; s >>= 1) {
      if (tid < s) {
        this.sData[tid] += this.sData[tid + s];
      }
      barrier();
    }
    // unroll
    // if (tid < 32) {
    //   this.sData[tid] += this.sData[tid + 32];
    //   this.sData[tid] += this.sData[tid + 16];
    //   this.sData[tid] += this.sData[tid + 8];
    //   this.sData[tid] += this.sData[tid + 4];
    //   this.sData[tid] += this.sData[tid + 2];
    //   this.sData[tid] += this.sData[tid + 1];
    // }
    if (tid == 0) {
      this.oData[workGroupID.x] = this.sData[0];
    }
  }
}