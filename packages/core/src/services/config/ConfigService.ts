import { IConfig, IConfigService } from './IConfigService';

export class ConfigService implements IConfigService {
  private config: Partial<IConfig>;

  public get() {
    return this.config;
  }

  public set(config: Partial<IConfig>) {
    this.config = config;
  }
}
