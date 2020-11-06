import { World } from '@antv/g-webgpu';
import { Compiler } from '@antv/g-webgpu-compiler';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const gCode = `
import { workGroupSize, workGroupID, localInvocationID } from 'g-webgpu';

@numthreads(1024, 1, 1)
class Reduce {
  @in
  gData: float[]; // 输入

  @out(10)
  oData: float[]; // 输出

  @shared(1024)
  sData: float[];

  @main
  compute() {
    const tid = localInvocationID.x;
    const i = workGroupID.x * workGroupSize.x + localInvocationID.x;

    this.sData[tid] = this.gData[i]; // 1
    barrier(); // 2

    for (let s: int = 1; s < workGroupSize.x; s*=2) {
      const index = 2 * s * tid;
      if (index < workGroupSize.x) {
        this.sData[index] += this.sData[index + s];
      }
      barrier();
    }
    if (tid == 0) {
      this.oData[workGroupID.x] = this.sData[0]; // 4
    }
  }
}
`;

const App = React.memo(function ReduceSum2() {
  const [CPUTimeElapsed, setCPUTimeElapsed] = useState(0);
  const [GPUTimeElapsed, setGPUTimeElapsed] = useState(0);
  const [CPUResult, setCPUResult] = useState(0);
  const [GPUResult, setGPUResult] = useState(0);
  useEffect(() => {
    const data = new Array(1024 * 10).fill(undefined).map((_, i) => 1);
    let timeStart = window.performance.now();
    const sum = data.reduce((cur, prev) => prev + cur, 0);
    setCPUTimeElapsed(window.performance.now() - timeStart);
    setCPUResult(sum);

    // compile our kernel code
    const compiler = new Compiler();
    const precompiledBundle = compiler.compileBundle(gCode);

    const world = World.create({
      engineOptions: {
        supportCompute: true,
      },
    });

    const executeKernel = async () => {
      const kernel = world
        .createKernel(precompiledBundle)
        .setDispatch([10, 1, 1])
        .setBinding('gData', data);

      timeStart = window.performance.now();
      await kernel.execute();
      const result = await kernel.getOutput();

      setGPUTimeElapsed(window.performance.now() - timeStart);
      setGPUResult(result.reduce((cur, prev) => prev + cur, 0));
    };
    executeKernel();
  }, []);

  return (
    <>
      <h2>Reduce Sum (1024 * 10 elements)</h2>
      <ul>
        <li>CPU time elapsed: {CPUTimeElapsed}</li>
        <li>GPU time elapsed: {GPUTimeElapsed}</li>
        <li>CPUResult: {CPUResult}</li>
        <li>GPUResult: {GPUResult}</li>
      </ul>
    </>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));
