import { World } from '@antv/g-webgpu';
import * as dat from 'dat.gui';
import { quat, vec3, vec4 } from 'gl-matrix';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Stats from 'stats.js';

const vertexShaderGLSL = `
attribute vec3 position;
attribute vec3 offset;
attribute vec4 color;
attribute vec4 orientationStart;
attribute vec4 orientationEnd;

varying vec3 v_Position;
varying vec4 v_Color;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float sineTime;
uniform float time;

void main() {
  v_Position = offset * max( abs( sineTime * 2.0 + 1.0 ), 0.5 ) + position;
  vec4 orientation = normalize( mix( orientationStart, orientationEnd, sineTime ) );
  vec3 vcV = cross( orientation.xyz, v_Position );
  v_Position = vcV * ( 2.0 * orientation.w ) + ( cross( orientation.xyz, vcV ) * 2.0 + v_Position );

  v_Color = color;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( v_Position, 1.0 );
}
`;

const fragmentShaderGLSL = `
varying vec3 v_Position;
varying vec4 v_Color;

uniform float sineTime;
uniform float time;

void main() {
  vec4 color = v_Color;
	color.r += sin(v_Position.x * 10.0 + time) * 0.5;
  gl_FragColor = color;
}
`;

/**
 * ported from
 * @see https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_instancing.html
 */
const App = React.memo(function Instanced() {
  useEffect(() => {
    // @ts-ignore
    const stats = new Stats();
    stats.showPanel(0);
    const $stats = stats.dom;
    $stats.style.position = 'absolute';
    $stats.style.left = '0px';
    $stats.style.top = '0px';
    const $wrapper = document.getElementById('wrapper');
    $wrapper.appendChild($stats);

    const canvas = document.getElementById('application') as HTMLCanvasElement;
    const instances = 50000;

    const vector = vec4.create();
    const positions = [];
    const offsets = [];
    const colors = [];
    const orientationsStart = [];
    const orientationsEnd = [];

    positions.push(0.025, -0.025, 0);
    positions.push(-0.025, 0.025, 0);
    positions.push(0, 0, 0.025);

    // instanced attributes

    for (let i = 0; i < instances; i++) {
      // offsets
      offsets.push(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      );

      // colors
      colors.push(Math.random(), Math.random(), Math.random(), Math.random());

      // orientation start
      vec4.set(
        vector,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      );
      vec4.normalize(vector, vector);
      orientationsStart.push(vector[0], vector[1], vector[2], vector[3]);

      // orientation end
      vec4.set(
        vector,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      );
      vec4.normalize(vector, vector);
      orientationsEnd.push(vector[0], vector[1], vector[2], vector[3]);
    }

    // create a world
    const world = new World({
      canvas,
      onUpdate: () => {
        const time = performance.now();

        world.setUniform(material, 'sineTime', Math.sin(time * 0.0005));
        world.setUniform(material, 'time', time * 0.0005);

        if (stats) {
          stats.update();
        }
      },
    });

    // create a camera
    const camera = world.createCamera({
      aspect: Math.abs(canvas.width / canvas.height),
      angle: 50,
      far: 10,
      near: 1,
    });
    world.getCamera(camera).setPosition(0, 0, 5);

    // create a scene
    const scene = world.createScene({ camera });

    // create geometry, material and attach them to mesh
    const geometry = world.createInstancedBufferGeometry({
      maxInstancedCount: instances,
      vertexCount: 3,
    });

    world.setAttribute(geometry, 'position', Float32Array.from(positions), {
      arrayStride: 4 * 3,
      stepMode: 'vertex',
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: 'float3',
        },
      ],
    });

    world.setAttribute(geometry, 'offset', Float32Array.from(offsets), {
      arrayStride: 4 * 3,
      stepMode: 'instance',
      attributes: [
        {
          shaderLocation: 1,
          offset: 0,
          format: 'float3',
        },
      ],
    });

    world.setAttribute(geometry, 'color', Float32Array.from(colors), {
      arrayStride: 4 * 4,
      stepMode: 'instance',
      attributes: [
        {
          shaderLocation: 2,
          offset: 0,
          format: 'float4',
        },
      ],
    });

    world.setAttribute(
      geometry,
      'orientationStart',
      Float32Array.from(orientationsStart),
      {
        arrayStride: 4 * 4,
        stepMode: 'instance',
        attributes: [
          {
            shaderLocation: 3,
            offset: 0,
            format: 'float4',
          },
        ],
      },
    );

    world.setAttribute(
      geometry,
      'orientationEnd',
      Float32Array.from(orientationsEnd),
      {
        arrayStride: 4 * 4,
        stepMode: 'instance',
        attributes: [
          {
            shaderLocation: 4,
            offset: 0,
            format: 'float4',
          },
        ],
      },
    );

    const material = world.createShaderMaterial({
      vertexShader: vertexShaderGLSL,
      fragmentShader: fragmentShaderGLSL,
    });

    world.setUniform(material, 'time', 0);
    world.setUniform(material, 'sineTime', 0);

    const mesh = world.createMesh({
      geometry,
      material,
    });

    // add meshes to current scene
    world.add(scene, mesh);

    return () => {
      world.destroy();
    };
  }, []);

  return (
    <>
      <canvas id="application" width="600" height="600" />
    </>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));
