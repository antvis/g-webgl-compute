import { Canvas } from '@antv/g-canvas';
import * as React from 'react';
// @ts-ignore
import Worker from './main.worker.ts';

const CANVAS_HEIGHT = 600;
const CANVAS_WIDTH = 600;

/**
 * ported from G6 and render with g-canvas
 * @see https://github.com/antvis/G6/blob/master/src/layout/fruchterman.ts
 *
 * WebGL/Unity implements
 * @see https://nblintao.github.io/ParaGraphL/
 * @see https://github.com/l-l/UnityNetworkGraph/blob/master/Assets/Shaders/GraphCS.compute
 */
export default class Fruchterman extends React.Component {
  public state = {
    timeElapsed: 0,
  };

  public async componentDidMount() {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    if (canvas) {
      const worker = new Worker();
      const offscreen = canvas.transferControlToOffscreen();
      const timeStart = window.performance.now();
      worker.postMessage({ canvas: offscreen }, [offscreen]);
      worker.addEventListener('message', (e: MessageEvent) => {
        this.setState({
          timeElapsed: window.performance.now() - timeStart,
        });

        const { vertexNum, edgeIndexBufferData, vertexEdgeData } = e.data;
        this.renderCircles(vertexNum, edgeIndexBufferData, vertexEdgeData);
      });
    }
  }

  public render() {
    return (
      <>
        <div>Elapsed time: {this.state.timeElapsed / 1000}s</div>
        <div>
          Ported from the same{' '}
          <a href="https://g6.antv.vision/en/examples/net/furchtermanLayout#fruchtermanWebWorker">
            example
          </a>{' '}
          in G6
        </div>
        <canvas id="application" style={{ display: 'none' }} />
        <div id="container" />
      </>
    );
  }

  private renderCircles(
    numParticles: number,
    edgeIndexBufferData: number[],
    finalParticleData: Float32Array,
  ) {
    const canvas = new Canvas({
      container: 'container',
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });

    // draw edges
    for (let i = 0; i < edgeIndexBufferData.length; i += 2) {
      const x1 = finalParticleData[edgeIndexBufferData[i] * 4];
      const y1 = finalParticleData[edgeIndexBufferData[i] * 4 + 1];
      const x2 = finalParticleData[edgeIndexBufferData[i + 1] * 4];
      const y2 = finalParticleData[edgeIndexBufferData[i + 1] * 4 + 1];
      const group = canvas.addGroup();
      group.addShape('line', {
        attrs: {
          x1: this.convertWebGLCoord2Canvas(x1, CANVAS_WIDTH),
          y1: this.convertWebGLCoord2Canvas(y1, CANVAS_HEIGHT),
          x2: this.convertWebGLCoord2Canvas(x2, CANVAS_WIDTH),
          y2: this.convertWebGLCoord2Canvas(y2, CANVAS_HEIGHT),
          stroke: '#1890FF',
          lineWidth: 1,
        },
      });
    }

    // draw nodes
    for (let i = 0; i < numParticles * 4; i += 4) {
      const x = finalParticleData[i];
      const y = finalParticleData[i + 1];
      const group = canvas.addGroup();
      group.addShape('circle', {
        attrs: {
          x: this.convertWebGLCoord2Canvas(x, CANVAS_WIDTH),
          y: this.convertWebGLCoord2Canvas(y, CANVAS_HEIGHT),
          r: 5,
          fill: 'red',
          stroke: 'blue',
          lineWidth: 2,
        },
      });
    }
  }

  private convertWebGLCoord2Canvas(c: number, size: number) {
    return ((c + 1) / 2) * size;
  }
}
