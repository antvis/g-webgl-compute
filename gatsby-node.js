const path = require('path');
exports.onCreateWebpackConfig = ({ getConfig }) => {
  const config = getConfig();

  config.module.rules.push({
    test: /\.glsl$/,
    use: [
      {
        loader: 'raw-loader',
        options: {},
      },
    ],
  });

  config.module.rules.push({
    test: /\.worker\.ts$/,
    use: {
      loader: 'worker-loader',
    },
  });

  // config.module.rules.push({
  //   test: /\.(ts|tsx)$/,
  //   loader: require.resolve('awesome-typescript-loader'),
  // });

  config.resolve.extensions.push('.glsl');
  config.resolve.alias = {
    ...config.resolve.alias,
    'https://cdn.jsdelivr.net/npm/@webgpu/glslang@0.0.15/dist/web-devel/glslang.js': path.resolve(__dirname, 'stub'),
    '@antv/g-webgpu': path.resolve(__dirname, 'packages/g-webgpu/src'),
    '@antv/g-webgpu-core': path.resolve(__dirname, 'packages/core/src'),
    '@antv/g-webgpu-engine': path.resolve(__dirname, 'packages/engine/src'),
    '@antv/g-webgpu-compiler': path.resolve(__dirname, 'packages/compiler/src'),
    '@antv/g-webgpu-unitchart': path.resolve(__dirname, 'packages/unitchart/src'),
    '@antv/g-webgpu-raytracer': path.resolve(__dirname, 'packages/raytracer/src'),
  };
};
