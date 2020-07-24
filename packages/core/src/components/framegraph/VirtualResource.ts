import { IRendererService } from '../renderer/IRendererService';
import { PassNode } from './PassNode';

/**
 * ported from filament
 */
export abstract class VirtualResource {
  public first: PassNode;
  public last: PassNode;

  public abstract preExecuteDevirtualize(engine: IRendererService): void;
  public abstract preExecuteDestroy(engine: IRendererService): void;
  public abstract postExecuteDestroy(engine: IRendererService): void;
  public abstract postExecuteDevirtualize(engine: IRendererService): void;
}
