import { injectable } from 'inversify';
import { IInteractorEvent, IInteractorService } from './IIteractorService';

@injectable()
export class InteractorService implements IInteractorService {
  public listen(canvas: HTMLCanvasElement): void {}
  public on(event: IInteractorEvent, args?: unknown): void {}
  public connect() {}
  public disconnect() {}
  public destroy() {}
}
