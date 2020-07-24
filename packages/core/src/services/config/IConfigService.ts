import {
  IRendererConfig,
  IRendererService,
} from '../../components/renderer/IRendererService';

export interface IConfig {
  canvas: HTMLCanvasElement;
  useRenderBundle: boolean;
  engineOptions: IRendererConfig;
  onInit: (engine: IRendererService) => void;
  onUpdate: (engine: IRendererService) => void;
}

export interface IConfigService {
  get(): Partial<IConfig>;
  set(config: Partial<IConfig>): void;
}
