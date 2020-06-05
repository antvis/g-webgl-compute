import { World } from '@antv/g-webgpu';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const gCode = `
import { globalInvocationID } from 'g-webgpu';

@numthreads(8, 1, 1)
class Add2Vectors {
  @in @out
  vectorA: float[];

  @in
  vectorB: float[];

  sum(a: float, b: float): float {
    return a + b;
  }

  @main
  compute() {
    // 获取当前线程处理的数据
    const a = this.vectorA[globalInvocationID.x];
    const b = this.vectorB[globalInvocationID.x];
  
    // 输出当前线程处理完毕的数据，即两个向量相加后的结果
    this.vectorA[globalInvocationID.x] = this.sum(a, b);
  }
}
`;

const App = React.memo(function Add2Vectors() {
  const [result, setResult] = useState([]);
  useEffect(() => {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      const world = new World(canvas, {
        engineOptions: {
          supportCompute: true,
        },
      });

      const compute = world.createComputePipeline({
        shader: gCode,
        dispatch: [1, 1, 1],
        onCompleted: (r) => {
          setResult(r);
          // 计算完成后销毁相关 GPU 资源
          world.destroy();
        },
      });

      world.setBinding(compute, 'vectorA', [1, 2, 3, 4, 5, 6, 7, 8]);
      world.setBinding(compute, 'vectorB', [1, 2, 3, 4, 5, 6, 7, 8]);
    }
  }, []);

  return (
    <>
      <h2> Add 2 Vectors</h2>
      <ul>
        <li>WorkGroup: 1</li>
        <li>Threads per WorkGroup: 8</li>
        <li>VectorA: 1, 2, 3, 4, 5, 6, 7, 8</li>
        <li>VectorB: 1, 2, 3, 4, 5, 6, 7, 8</li>
      </ul>
      <canvas id="application" style={{ display: 'none' }} />
      Result: {result.toString()}
    </>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));
