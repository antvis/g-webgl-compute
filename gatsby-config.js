const { version, homepage, repository } = require('./package.json');

module.exports = {
  plugins: [
    {
      resolve: '@antv/gatsby-theme-antv',
      options: {
        GATrackingId: 'UA-148148901-9'
      }
    },
  ],
  siteMetadata: {
    title: 'GWebGPU',
    description: 'A GPGPU engine based on WebGPU & WebGL',
    siteUrl: 'https://gwebgpu.antv.vision',
    // cname: false,
    // pathPrefix: '/GWebGPUEngine',
    githubUrl: repository.url,
    showAPIDoc: true,
    isAntVSite: false,
    versions: {
      [version]: 'https://gwebgpu.antv.vision',
    },
    navs: [
      {
        slug: 'docs/api',
        title: {
          zh: '文档',
          en: 'Document'
        }
      },
      {
        slug: 'docs/tutorial',
        title: {
          zh: '教程',
          en: 'Tutorial'
        }
      },
      {
        slug: 'examples',
        title: {
          zh: '示例',
          en: 'Examples'
        }
      }
    ],
    docs: [
      {
        slug: 'api/gpgpu',
        title: {
          zh: 'GPGPU',
          en: 'GPGPU'
        },
        order: 0
      },
      {
        slug: 'api/rendering',
        title: {
          zh: '渲染',
          en: 'Rendering'
        },
        order: 0
      },
      {
        slug: 'tutorial/gpgpu',
        title: {
          zh: 'GPGPU',
          en: 'GPGPU'
        },
        order: 0
      },
      {
        slug: 'tutorial/rendering',
        title: {
          zh: '渲染',
          en: 'Rendering'
        },
        order: 0
      },
    ],
    examples: [
      {
        slug: 'gpgpu/basic',
        icon: 'gallery',
        title: {
          zh: '基础算法',
          en: 'Basic Algorithms'
        },
        order: 0
      },
      {
        slug: 'gpgpu/graph',
        icon: 'gallery',
        title: {
          zh: '图算法',
          en: 'Graph'
        },
        order: 1
      },
      {
        slug: 'rendering',
        icon: 'gallery',
        title: {
          zh: '渲染',
          en: 'Rendering'
        },
        order: 2
      },
    ],
    playground: {
      container: '<div style="justify-content: center;position: relative" id="wrapper"/>',
      playgroundDidMount: `(function(history){
        var pushState = history.pushState;
        history.pushState = function(state) {
          window.gwebgpuClean && window.gwebgpuClean();
          return pushState.apply(history, arguments);
        };
      })(window.history);`,
      playgroundWillUnmount: 'window.gwebgpuClean && window.gwebgpuClean();',
      dependencies: {
        '@antv/g-webgpu': 'latest'
      }
    },
    docsearchOptions: {
      apiKey: '97db146dbe490416af81ef3a8923bcaa',
      indexName: 'antv_gwebgpu'
    }
  }
};
