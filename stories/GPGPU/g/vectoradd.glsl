const vectorA: vec4[];
const vectorB: vec4[];

export function compute(threadId: int) {

  const a = vectorA[threadId];
  const b = vectorB[threadId];

  vectorA[threadId] = a + b;
}