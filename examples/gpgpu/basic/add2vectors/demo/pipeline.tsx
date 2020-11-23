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
      const kernel1 = world
        .createKernel(precompiledBundle)
        .setDispatch([1, 1, 1])
        .setBinding({
          vectorA: [1, 2, 3, 4, 5, 6, 7, 8],
          vectorB: [1, 2, 3, 4, 5, 6, 7, 8],
        });

      const kernel2 = world
        .createKernel(precompiledBundle)
        .setDispatch([1, 1, 1])
        .setBinding({
          vectorA: kernel1,
          vectorB: [1, 2, 3, 4, 5, 6, 7, 8],
        });

      const kernel3 = world
        .createKernel(precompiledBundle)
        .setDispatch([1, 1, 1])
        .setBinding({
          vectorA: kernel2,
          vectorB: [1, 2, 3, 4, 5, 6, 7, 8],
        });

      await kernel1.execute();
      await kernel2.execute();
      await kernel3.execute();
      setResult(await kernel3.getOutput());

      window.gwebgpuClean = () => {
        world.destroy();
      };
    };
    executeKernel();
  }, []);

  return (
    <>
      <h2> Create a pipeline with 3 kernels </h2>
      <ul>
        <li>WorkGroup: 1</li>
        <li>Threads per WorkGroup: 8</li>
        <li>Kernel1 VectorA: 1, 2, 3, 4, 5, 6, 7, 8</li>
        <li>Kernel1 VectorB: 1, 2, 3, 4, 5, 6, 7, 8</li>
        <li>Kernel2 VectorC: 1, 2, 3, 4, 5, 6, 7, 8</li>
        <li>Kernel3 VectorD: 1, 2, 3, 4, 5, 6, 7, 8</li>
        <li>Result: {result.toString()}</li>
      </ul>
    </>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));
