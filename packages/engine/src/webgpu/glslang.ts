import { loadScriptAsync } from '../utils/dom';

let glslang: any;
export default async function() {
  if (glslang) {
    return glslang;
  }
  // // @see https://github.com/webpack/webpack/issues/10446
  // // @see https://github.com/austinEng/webgpu-samples/issues/33
  // const glslangModule = await import(
  //   /* webpackIgnore: true */
  //   'https://cdn.jsdelivr.net/npm/@webgpu/glslang@0.0.15/dist/web-devel/glslang.js'
  // );
  // glslang = await glslangModule.default();

  await loadScriptAsync('https://preview.babylonjs.com/glslang/glslang.js');

  glslang = (window as any).glslang(
    'https://preview.babylonjs.com/glslang/glslang.wasm',
  );

  return glslang;
}
