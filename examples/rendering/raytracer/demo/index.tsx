import { RayTracer } from '@antv/g-webgpu-raytracer';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

let raytracer;

const App = React.memo(function RayTracerDemo() {
  useEffect(() => {
    (async () => {
      const canvas = document.getElementById(
        'application',
      ) as HTMLCanvasElement;

      raytracer = new RayTracer({
        canvas,
      });
      await raytracer.init();
    })();

    return function cleanup() {
      if (raytracer) {
        raytracer.destroy();
      }
    };
  }, []);

  return <canvas id="application" width="600" height="600" />;
});

ReactDOM.render(<App />, document.getElementById('wrapper'));
