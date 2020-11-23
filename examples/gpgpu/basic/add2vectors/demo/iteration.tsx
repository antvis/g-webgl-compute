import { World } from '@antv/g-webgpu';
import { Compiler } from '@antv/g-webgpu-compiler';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const gCode = `
import { globalInvocationID } from 'g-webgpu';

@numthreads(8, 1, 1)
class Add2Vectors {
  @in
  vectorA: float[];

  @in
  vectorB: float[];

  @out(8)
  result: float[];

  sum(a: float, b: float): float {
    return a + b;
  }

  @main
  compute() {
    // 获取当前线程处理的数据
    const a = this.vectorA[globalInvocationID.x];
    const b = this.vectorB[globalInvocationID.x];
  
    // 输出当前线程处理完毕的数据，即两个向量相加后的结果
    this.result[globalInvocationID.x] = this.sum(a, b);
  }
}
`;

const App = React.memo(function Add2Vectors() {
  const [result, setResult] = useState([]);
  useEffect(() => {
    // compile our kernel code
    const compiler = new Compiler();
    const precompiledBundle = compiler.compileBundle(gCode);

    // create world
    const world = World.create({
      engineOptions: {
        supportCompute: true,
      },
    });
    const executeKernel = async () => {
      const kernel = world
        .createKernel(precompiledBundle)
        .setDispatch([1, 1, 1])
        .setBinding({
          vectorA: [0, 0, 0, 0, 0, 0, 0, 0],
          vectorB: [1, 1, 1, 1, 1, 1, 1, 1],
        });

      for (let i = 2; i < 11; i++) {
        await kernel.execute();
        kernel.setBinding({
          vectorA: kernel,
          vectorB: [i, i, i, i, i, i, i, i],
        });
      }
      setResult(await kernel.getOutput());
    };
    executeKernel();

    window.gwebgpuClean = () => {
      world.destroy();
    };
  }, []);

  return (
    <>
      <h2> Run the same kernel 9 times, sum 0-9 </h2>
      <ul>
        <li>WorkGroup: 1</li>
        <li>Threads per WorkGroup: 8</li>
        <li>Result: {result.toString()}</li>
      </ul>
    </>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));
