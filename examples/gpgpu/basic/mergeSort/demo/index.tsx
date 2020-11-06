import { World } from '@antv/g-webgpu';
import { Compiler } from '@antv/g-webgpu-compiler';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

// ported from https://bl.ocks.org/zz85/cafa1b8b3098b5a40e918487422d47f6
const gCode = `
import { localInvocationID, globalInvocationID } from 'g-webgpu';

@numthreads(1024, 1, 1)
class MergeSort {
  @in @out
  gData: float[];

  @in
  uPass: float;

  @in
  uStage2: float;

  @in
  uPassModStage: float;

  @in
  uStage2PmS1: float;

  @main
  compute() {
    const gid = globalInvocationID.x;
    const j = floor(mod(float(gid), this.uStage2));

    const compare =
			(j < this.uPassModStage || j > this.uStage2PmS1) ? 0 :
				mod((j + this.uPassModStage) / this.uPass, 2) < 1 ? 1:
				 -1;

    const offset = int(compare * this.uPass);
    
    const current = this.gData[gid];
    const reference = this.gData[gid + offset];

		this.gData[gid] = (current * compare < reference * compare) ? current : reference;
  }
}
`;

const resetData = (arr: Float32Array, sortLength: number) => {
  for (let i = 0; i < sortLength; i++) {
    arr[i] = Math.fround(Math.random() * 10);
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

const MAX_THREAD_NUM = 1024;
const ELEMENTS_NUM = 2048000;
const data = new Float32Array(ELEMENTS_NUM);
resetData(data, ELEMENTS_NUM);
const threadgroupsPerGrid = Math.max(1, ELEMENTS_NUM / MAX_THREAD_NUM);

let stage = 0; // stage iterations
let pass = 0;

const App = React.memo(function MergeSort() {
  const [cpuElapsedTime, setCpuElapsedTime] = useState(0);
  const [gpuElapsedTime, setGpuElapsedTime] = useState(0);

  const computeCPU = () => {
    const now = performance.now();
    data.sort((a, b) => a - b);

    setCpuElapsedTime(Math.round(performance.now() - now));
    console.log(`CPU sort result validation: ${validateSorted(data) ? 'success' : 'failure'}`);
  };

  const computeGPU = async () => {
    // compile our kernel code
    const compiler = new Compiler();
    const precompiledBundle1 = compiler.compileBundle(gCode);

    // create world
    const world = World.create({
      engineOptions: {
        supportCompute: true,
      },
    });

    const kernel = world
      .createKernel(precompiledBundle1)
      .setDispatch([threadgroupsPerGrid, 1, 1])
      .setBinding('gData', data);

    const now = performance.now();
    while (true) {
      if (stage > Math.log2(ELEMENTS_NUM) + 1) {
        break;
      }

      const tPass = 1 << pass;
      const tStage = 1 << stage;
      const uStage2 = tStage + tStage;
      const uPassModStage = tPass % tStage;
      const uStage2PmS1 = uStage2 - uPassModStage - 1;

      kernel.setBinding({
        uStage2,
        uPassModStage,
        uStage2PmS1,
        uPass: tPass,
      });

      await kernel.execute();

      pass--;
      if (pass < 0) {
        stage++;
        pass = stage;
      }
    }

    const output = await kernel.getOutput();

    setGpuElapsedTime(Math.round(performance.now() - now));
    console.log(`GPU sort result validation: ${validateSorted(output) ? 'success' : 'failure'}`);
  };

  useEffect(() => {
    computeGPU();
    computeCPU();
  }, []);

  return (
    <ul>
      <li>number of elements: {ELEMENTS_NUM}</li>
      <li>CPU sort time: {cpuElapsedTime} ms</li>
      <li>GPU sort time: {gpuElapsedTime} ms</li>
    </ul>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));
