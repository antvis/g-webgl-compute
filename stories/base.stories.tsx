import { storiesOf } from '@storybook/react';
import * as React from 'react';
import RotatingCube from './BasicSamples/RotatingCube';
import RotatingCubeWithRecordBundle from './BasicSamples/RotatingCubeWithRecordBundle';
import TriangleMSAA from './BasicSamples/TriangleMSAA';
import Flocking from './GPGPU/Flocking';

// @ts-ignore
storiesOf('BasicSamples', module)
  .add('TriangleMSAA', () => <TriangleMSAA />)
  .add('RotatingCube', () => <RotatingCube />)
  .add('RotatingCubeWithRecordBundle', () => <RotatingCubeWithRecordBundle />);
storiesOf('GPGPU', module).add('Flocking', () => <Flocking />);
