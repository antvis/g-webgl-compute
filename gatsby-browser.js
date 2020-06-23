
// @ts-ignore
import FruchtermanWorker from './examples/tutorial/fruchterman/worker/main.worker.ts';

require('./site/css/demo.css');
window.gCanvas = require('@antv/g-canvas');
window.gWebgpu = require('@antv/g-webgpu');
window.react = require('react');
window.reactDom = require('react-dom');
window.fruchtermanWorker = FruchtermanWorker;
