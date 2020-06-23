import { World } from '@antv/g-webgpu';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const gCode = `
import { workGroupSize, workGroupID, localInvocationID } from 'g-webgpu';

@numthreads(1024, 1, 1)
class Reduce {
  @in
  gData: float[]; // 输入

  @out(10240)
  oData: float[]; // 输出

  @shared(1024)
  sData: float[];

  @main
  compute() {
    const tid = localInvocationID.x;
    const i = workGroupID.x * workGroupSize.x + localInvocationID.x;

    this.sData[tid] = this.gData[i]; // 1
    barrier(); // 2

    for (let s = 1; s < workGroupSize.x; s*=2) {
      if (tid % (s * 2) == 0) {
        this.sData[tid] += this.sData[tid + s]; // 3
      }
      barrier();
    }
    if (tid == 0) {
      this.oData[workGroupID.x] = this.sData[0]; // 4
    }
  }
}
`;

const App = React.memo(function Add2Vectors() {
  const [CPUTimeElapsed, setCPUTimeElapsed] = useState(0);
  const [GPUTimeElapsed, setGPUTimeElapsed] = useState(0);
  const [CPUResult, setCPUResult] = useState(0);
  const [GPUResult, setGPUResult] = useState(0);
  useEffect(() => {
    const data = new Array(1024 * 1024 * 10).fill(undefined).map((_, i) => 1);
    let timeStart = window.performance.now();
    const sum = data.reduce((cur, prev) => prev + cur, 0);
    setCPUTimeElapsed(window.performance.now() - timeStart);
    setCPUResult(sum);

    const world = new World({
      engineOptions: {
        supportCompute: true,
      },
    });

    timeStart = window.performance.now();
    const compute = world.createComputePipeline({
      shader: gCode,
      dispatch: [1024 * 10, 1, 1],
      onCompleted: (result) => {
        setGPUTimeElapsed(window.performance.now() - timeStart);
        setGPUResult(result.reduce((cur, prev) => prev + cur, 0));
        // 计算完成后销毁相关 GPU 资源
        world.destroy();
      },
    });

    world.setBinding(compute, 'gData', data);
  }, []);

  return (
    <>
      <h2>Reduce Sum (1024 * 1024 * 10 elements)</h2>
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
