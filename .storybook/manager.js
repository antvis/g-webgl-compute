import { create } from '@storybook/theming/create';
import { addons } from '@storybook/addons';
// @ts-nocheck
import '!style-loader!css-loader!sass-loader!./iframe.scss';
import theme from './theme';

addons.setConfig({
  isFullscreen: false,
  panelPosition: 'right',
  enableShortcuts: true,
  theme: theme,
});