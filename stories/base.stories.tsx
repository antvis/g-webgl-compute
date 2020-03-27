import { storiesOf } from '@storybook/react';
import * as React from 'react';
import Flocking from './GPGPU/Flocking';
import RotatingCube from './Rendering/RotatingCube';
import RotatingCubeWithRecordBundle from './Rendering/RotatingCubeWithRecordBundle';
import TriangleMSAA from './Rendering/TriangleMSAA';

// @ts-ignore
storiesOf('Rendering', module)
  .add('TriangleMSAA', () => <TriangleMSAA />)
  .add('RotatingCube', () => <RotatingCube />)
  .add('RotatingCubeWithRecordBundle', () => <RotatingCubeWithRecordBundle />);
storiesOf('GPGPU', module).add('Flocking', () => <Flocking />);
