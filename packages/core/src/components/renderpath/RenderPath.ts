import { System } from '../..';
import { WebGPUEngine } from '../../WebGPUEngine';

export interface IRenderPath {
  render(engine: WebGPUEngine, systems: System[]): void;
}
