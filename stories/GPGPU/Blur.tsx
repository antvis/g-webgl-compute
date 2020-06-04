// @ts-nocheck
import { World } from '@antv/g-webgpu';
import * as React from 'react';
// @ts-ignore
import IMG_URL from './data/safari-alpha.png';
// @ts-ignore
import gCode from './g/blur.glsl';

const IMG_WIDTH = 600;

/**
 * @see https://webkit.org/demos/webgpu/compute-blur.html
 */
export default class Blur extends React.Component {
  // @ts-ignore
  private world: World;
  private context2d: CanvasRenderingContext2D;

  public async loadImage(canvas: HTMLCanvasElement) {
    const image = new Image();
    const imageLoadPromise = new Promise((resolve) => {
      image.onload = () => resolve();
      image.src = IMG_URL;
    });
    await Promise.resolve(imageLoadPromise);

    canvas.height = IMG_WIDTH;
    canvas.width = IMG_WIDTH;

    this.context2d.drawImage(image, 0, 0, IMG_WIDTH, IMG_WIDTH);
    return image;
  }

  public async componentDidMount() {
    const canvas = document.getElementById('application') as HTMLCanvasElement;
    const imgCanvas = document.getElementById('img') as HTMLCanvasElement;
    if (canvas && imgCanvas) {
      this.context2d = imgCanvas.getContext('2d')!;

      await this.loadImage(imgCanvas);

      const originalData = this.context2d.getImageData(
        0,
        0,
        IMG_WIDTH,
        IMG_WIDTH,
      );
      const numXGroups = Math.ceil(IMG_WIDTH / 1);

      // @ts-ignore
      this.world = new World(canvas, {
        engineOptions: {
          supportCompute: true,
        },
      });

      const compute = this.world.createComputePipeline({
        shader: gCode,
        dispatch: [numXGroups, numXGroups, 1],
        onCompleted: (result: Uint8ClampedArray) => {
          this.context2d.putImageData(
            new ImageData(new Uint8ClampedArray(result), IMG_WIDTH, IMG_WIDTH),
            0,
            0,
          );
          // 计算完成后销毁相关 GPU 资源
          this.world.destroy();
        },
      });

      this.world.setBinding(compute, 'srcTex', originalData.data);
    }
  }

  public componentWillUnmount() {
    if (this.world) {
      this.world.destroy();
    }
  }

  public render() {
    return (
      <>
        <canvas id="application" style={{ display: 'none' }} />
        <canvas id="img" style={{ width: 600, height: 600 }} />
      </>
    );
  }
}
