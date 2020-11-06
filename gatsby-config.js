module.exports = {
  plugins: [
    {
      resolve: '@antv/gatsby-theme-antv',
      options: {
        GATrackingId: 'UA-148148901-9'
      }
    },
    // 'gatsby-plugin-workerize-loader',
  ],
  siteMetadata: {
    title: 'GWebGPU',
    description: 'A GPGPU engine based on WebGPU & WebGL',
    siteUrl: 'https://gwebgpu.antv.vision',
    // cname: false,
    // pathPrefix: '/GWebGPUEngine',
    githubUrl: 'https://github.com/antvis/GWebGPUEngine',
    navs: [
      {
        slug: 'docs/api',
        title: {
          zh: '文档',
          en: 'Document'
        },
        redirect: 'docs/api/gpgpu/gwebgpu'
      },
      {
        slug: 'docs/tutorial',
        title: {
          zh: '教程',
          en: 'Tutorial'
        },
        redirect: 'docs/tutorial/gpgpu/quickstart'
      },
      {
        slug: 'examples',
        title: {
          zh: '示例',
          en: 'Examples'
        },
        redirect: 'examples/gpgpu/basic/add2vectors'
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
        slug: 'gpgpu',
        title: {
          zh: 'GPGPU',
          en: 'GPGPU'
        },
        order: 0
      },
      {
        slug: 'gpgpu/basic',
        title: {
          zh: '基础算法',
          en: 'Basic Algorithms'
        },
        order: 0
      },
      {
        slug: 'gpgpu/graph',
        title: {
          zh: '图算法',
          en: 'Graph'
        },
        order: 0
      },
      {
        slug: 'rendering',
        title: {
          zh: '渲染',
          en: 'Rendering'
        },
        order: 1
      },
    ],
    playground: {
      container: '<div style="min-height: 500px; justify-content: center;position: relative" id="wrapper"/>',
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
