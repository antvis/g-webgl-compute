import { storiesOf } from '@storybook/react';
import * as React from 'react';
import Blur from './GPGPU/Blur';
// import Curl from './GPGPU/Curl';
// import Flocking from './GPGPU/Flocking';
// import Fruchterman from './GPGPU/Fruchterman';
import FruchtermanRenderWithG from './GPGPU/FruchtermanRenderWithG';
import Reduction from './GPGPU/Reduction';
// import Gravity from './GPGPU/Gravity';
import VectorAdd from './GPGPU/VectorAdd';

// import Instanced from './Rendering/Instanced';
// import RotatingCube from './Rendering/RotatingCube';
// import RotatingCubeWithRecordBundle from './Rendering/RotatingCubeWithRecordBundle';
// import TriangleMSAA from './Rendering/TriangleMSAA';

// @ts-ignore
// storiesOf('Rendering', module)
//   .add('TriangleMSAA', () => <TriangleMSAA />)
//   .add('RotatingCube', () => <RotatingCube />)
//   .add('RotatingCubeWithRecordBundle', () => <RotatingCubeWithRecordBundle />)
//   .add('Instanced', () => <Instanced />);
storiesOf('GPGPU', module)
  // .add('Flocking', () => <Flocking />)
  // .add('Curl', () => <Curl />)
  // .add('Gravity', () => <Gravity />)
  // .add('Fruchterman', () => <Fruchterman />)
  .add('FruchtermanRenderWithG', () => <FruchtermanRenderWithG />)
  .add('VectorAdd', () => <VectorAdd />)
  .add('Reduction', () => <Reduction />)
  .add('Blur', () => <Blur />);
