import { World } from '@antv/g-webgpu';
import { Compiler } from '@antv/g-webgpu-compiler';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

// ported from https://github.com/9ballsyndrome/WebGL_Compute_shader/blob/master/webgl-compute-bitonicSort/js/script.js
const gCode1 = `
import { localInvocationID, globalInvocationID } from 'g-webgpu';

@numthreads(8, 1, 1)
class BitonicSort1 {
  @in @out
  gData: float[];

  @shared(8)
  sData: float[];

  @main
  compute() {
    const tid = localInvocationID.x;
    const gid = globalInvocationID.x;

    this.sData[tid] = this.gData[gid];
    barrier();

    const offset = workGroupID.x * workGroupSize.x;

    let tmp;
    for (let k: int = 2; k <= workGroupSize.x; k <<= 1) {
      for (let j: int = k >> 1; j > 0; j >>= 1) {
        const ixj = (gid ^ j) - offset;
        if (ixj > tid) {
          if ((gid & k) == 0) {
            if (this.sData[tid] > this.sData[ixj]) {
              tmp = this.sData[tid];
              this.sData[tid] = this.sData[ixj];
              this.sData[ixj] = tmp;
            }
          } else {
            if (this.sData[tid] < this.sData[ixj]) {
              tmp = this.sData[tid];
              this.sData[tid] = this.sData[ixj];
              this.sData[ixj] = tmp;
            }
          }
        }
        barrier();
      }
    }
    this.gData[gid] = this.sData[tid];
  }
}
`;

const gCode2 = `
import { localInvocationID, globalInvocationID } from 'g-webgpu';

@numthreads(8, 1, 1)
class BitonicSort2 {
  @in @out
  gData: float[];

  @in
  k: int;

  @in
  j: int;

  @main
  compute() {
    let tmp;
    const ixj = globalInvocationID.x ^ this.j;
    if (ixj > globalInvocationID.x) {
      if ((globalInvocationID.x & this.k) == 0) {
        if (this.gData[globalInvocationID.x] > this.gData[ixj]) {
          tmp = this.gData[globalInvocationID.x];
          this.gData[globalInvocationID.x] = this.gData[ixj];
          this.gData[ixj] = tmp;
        }
      } else {
        if (this.gData[globalInvocationID.x] < this.gData[ixj]) {
          tmp = this.gData[globalInvocationID.x];
          this.gData[globalInvocationID.x] = this.gData[ixj];
          this.gData[ixj] = tmp;
        }
      }
    }
  }
}
`;

const resetData = (arr: Float32Array, sortLength: number) => {
  for (let i = 0; i < sortLength; i++) {
    arr[i] = Math.random();
  }
};

const validateSorted = (arr: Float32Array) => {
  const length = arr.length;
  for (let i = 0; i < length; i++) {
    if (i !== length - 1 && arr[i] > arr[i + 1]) {
      console.log('validation error:', i, arr[i], arr[i + 1]);
      return false;
    }
  }
  return true;
};

const MAX_THREAD_NUM = 8;
const ELEMENTS_NUM = 16;
const arr = new Float32Array([8, 6, 7, 1, 4, 3, 2, 5, 9, 10, 11, 12, 13, 14, 15, 16]);
// resetData(arr, ELEMENTS_NUM);
const threadgroupsPerGrid = Math.max(1, ELEMENTS_NUM / MAX_THREAD_NUM);

const App = React.memo(function BitonicSort() {
  const computeCPU = () => {
    const now = performance.now();
    arr.sort((a, b) => a - b);
    console.log(`CPU sort time: ${Math.round(performance.now() - now)} ms`);
    console.log(`CPU sort result validation: ${validateSorted(arr) ? 'success' : 'failure'}`);
  };

  const computeGPU = async () => {
    // compile our kernel code
    const compiler = new Compiler();
    const precompiledBundle1 = compiler.compileBundle(gCode1);
    const precompiledBundle2 = compiler.compileBundle(gCode2);

    // create world
    const world = World.create({
      engineOptions: {
        supportCompute: true,
      },
    });

    const now = performance.now();
    const kernel1 = world.createKernel(precompiledBundle1);

    await kernel1
      .setDispatch([threadgroupsPerGrid, 1, 1])
      .setBinding('gData', arr)
      .execute();

    const output = await kernel1.getOutput();

    console.log(output);

    const kernel2 = world.createKernel(precompiledBundle2);
    kernel2
      .setDispatch([threadgroupsPerGrid, 1, 1])
      .setBinding('gData', output);

    if (threadgroupsPerGrid > 1) {
      for (let k = threadgroupsPerGrid; k <= ELEMENTS_NUM; k <<= 1) {
        for (let j = k >> 1; j > 0; j >>= 1) {
          console.log(k, j);
          kernel2.setBinding('k', k);
          kernel2.setBinding('j', j);
          await kernel2.execute();

          const output2 = await kernel2.getOutput();

          console.log(output2);
        }
      }

      // console.log(`GPU sort time: ${Math.round(performance.now() - now)} ms`);
      // console.log(`GPU sort result validation: ${validateSorted(output2) ? 'success' : 'failure'}`);
    }
  };

  useEffect(() => {
    computeGPU();
    // computeCPU();
  }, []);

  return (
    <>
      {/* <li>Result: {result.toString()}</li> */}
    </>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));
