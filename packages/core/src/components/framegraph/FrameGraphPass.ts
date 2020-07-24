import { FrameGraphSystem } from './System';

export class FrameGraphPass<PassData> {
  public name: string;

  public data: PassData;

  public execute: (
    fg: FrameGraphSystem,
    pass: FrameGraphPass<PassData>,
  ) => Promise<void>;
}
