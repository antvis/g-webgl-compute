module.exports = {
  plugins: [
    {
      resolve: '@antv/gatsby-theme-antv',
      options: {
        GATrackingId: 'UA-148148901-7'
      }
    }
  ],
  siteMetadata: {
    title: 'GWebGPU',
    description: 'A GPGPU engine based on WebGPU & WebGL',
    siteUrl: 'https://l7.antv.vision',
    githubUrl: 'https://github.com/antvis/GWebGPUEngine',
    navs: [
      {
        slug: 'docs/api',
        title: {
          zh: '文档',
          en: 'Document'
        },
        redirect: 'api/gwebgpu'
      },
      // {
      //   slug: 'docs/tutorial',
      //   title: {
      //     zh: '教程',
      //     en: 'Tutorial'
      //   }
      // },
      {
        slug: 'examples/tutorial',
        title: {
          zh: '示例',
          en: 'Examples'
        },
        redirect: 'tutorial/add2vectors'
      }
    ],
    docs: [
      {
        slug: 'api/gwebgpu',
        title: {
          zh: 'GWebGPU 简介',
          en: 'Introduction'
        },
        order: 0
      },
      {
        slug: 'api/syntax',
        title: {
          zh: '语法介绍',
          en: 'Shader Syntax'
        },
        order: 1
      },
      {
        slug: 'api/compute-pipeline',
        title: {
          zh: '计算管线 API',
          en: 'API of compute pipeline'
        },
        order: 2
      },
      {
        slug: 'api/workgroup',
        title: {
          zh: '线程组',
          en: 'Workgroup'
        },
        order: 3
      },
    ],
    examples: [
      {
        slug: 'tutorial',
        icon: 'gallery',
        title: {
          zh: '示例',
          en: 'Examples'
        }
      },
    ],
    playground: {
      container: '<div style="min-height: 500px; justify-content: center;position: relative" id="wrapper"/>',
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
