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