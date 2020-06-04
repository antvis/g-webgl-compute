import Banner from '@antv/gatsby-theme-antv/site/components/Banner';
import BannerSVG from '@antv/gatsby-theme-antv/site/components/BannerSVG';
import Cases from '@antv/gatsby-theme-antv/site/components/Cases';
import SEO from '@antv/gatsby-theme-antv/site/components/Seo';
import React from 'react';
import { useTranslation } from 'react-i18next';
import '../css/home.css';

const IndexPage = () => {
  const { t, i18n } = useTranslation();

  const bannerButtons = [
    {
      text: t('示例'),
      link: `/${i18n.language}/examples/tutorial`,
      type: 'primary',
    },
    {
      text: t('开始使用'),
      link: `/${i18n.language}/docs/api/gwebgpu`,
    },
  ];

  const notifications = [
    // {
    //   type: t('推荐'),
    //   title: t('如何制作不一样的疫情世界地图-酷炫、动感的地理可视化'),
    //   date: '2020.03.12',
    //   link: 'https://www.yuque.com/antv/blog/wigku2',
    // },
    // {
    //   type: t('新版发布'),
    //   title: t('L7 2.1 正式版'),
    //   date: '2020.03.12',
    //   link: ' https://www.yuque.com/antv/blog/ows55v',
    // },
  ];

  return (
    <>
      <SEO title={t('GWebGPU 计算引擎')} lang={i18n.language} />
      <Banner
        coverImage={
          <img
            width="100%"
            className="Notification-module--number--31-3Z"
            src="https://gw.alipayobjects.com/mdn/antv_site/afts/img/A*cCI7RaJs46AAAAAAAAAAAABkARQnAQ"
          />
        }
        title={t('GWebGPU 计算引擎')}
        description={t(
          '蚂蚁金服 AntV 数据可视化团队推出的基于 WebGPU & WebGL 的通用计算引擎',
        )}
        buttons={bannerButtons}
        notifications={notifications}
        className="banner"
        githubStarLink="https://github.com/antvis/GWebGPU/stargazers"
      />
    </>
  );
};

export default IndexPage;
