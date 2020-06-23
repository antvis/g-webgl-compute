const path = require('path');

module.exports = {
  stories: ['../stories/**/*.stories.[tj]sx'],
  addons: [
    '@storybook/addon-notes',
    {
      name: '@storybook/addon-storysource',
      options: {
        rule: {
          test: [/\.stories\.[tj]sx?$/],
          include: [path.resolve(__dirname, '../src')], // You can specify directories
        },
        loaderOptions: {
          prettierConfig: { printWidth: 80, singleQuote: false },
        },
      },
    },
    // '@storybook/addon-essentials',
  ],
  webpackFinal: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'https://cdn.jsdelivr.net/npm/@webgpu/glslang@0.0.15/dist/web-devel/glslang.js': path.resolve(__dirname, '../stub'),
      '@antv/g-webgpu': path.resolve(__dirname, '../packages/g-webgpu/src'),
      '@antv/g-webgpu-core': path.resolve(__dirname, '../packages/core/src'),
      '@antv/g-webgpu-engine': path.resolve(__dirname, '../packages/engine/src'),
      '@antv/g-webgpu-compiler': path.resolve(__dirname, '../packages/compiler/src'),
    };

    config.module.rules.push({
      test: /\.worker\.ts$/,
      use: {
        loader: 'worker-loader',
      },
    });

    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      loader: require.resolve('awesome-typescript-loader'),
    });
    
    config.module.rules.push({
      test: /\.stories\.tsx?$/,
      loaders: [
        {
          loader: require.resolve('@storybook/source-loader'),
          options: { parser: 'typescript' },
        },
      ],
      enforce: 'pre',
    },{
      test: /\.stories\.css?$/,
      use: ['style-loader', 'css-loader'],
    });
  
    config.resolve.extensions.push('.ts', '.tsx', '.js', '.glsl');

    return config;
  },
};