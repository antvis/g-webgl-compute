const path = require('path');

module.exports = {
  entry: './build/bundle.ts',
  mode: 'production',
  output: {
    library: 'GWebGPU',
    libraryTarget: 'umd',
    filename: 'gwebgpu.js',
    path: path.resolve(__dirname, '../packages/g-webgpu/dist')
  },
  module: {
    rules: [
      {
        test: /\.worker\.ts$/,
        use: {
          loader: 'worker-loader',
        },
      },
      {
        test: /\.(ts|tsx)$/,
        loader: require.resolve('awesome-typescript-loader'),
      },
    ]
  }
};