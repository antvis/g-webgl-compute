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