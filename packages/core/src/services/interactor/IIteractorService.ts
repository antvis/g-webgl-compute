export interface IInteractorService {
  listen(canvas: HTMLCanvasElement): void;
  disconnect(): void;
  connect(): void;
  destroy(): void;
  on(event: IInteractorEvent, args?: unknown): void;
}

export enum IInteractorEvent {
  PANSTART = 'PANSTART',
  PANEND = 'PANEND',
  PANMOVE = 'PANMOVE',
  PINCH = 'PINCH',
  KEYDOWN = 'KEYDOWN',
  KEYUP = 'KEYUP',
  HOVER = 'HOVER',
}
