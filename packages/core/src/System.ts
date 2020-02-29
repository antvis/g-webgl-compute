/**
 * inspired by Entitas' Systems
 * @see https://github.com/sschmid/Entitas-CSharp/wiki/Systems
 */

import { injectable } from 'inversify';

export type System =
  | InitializeSystem
  | ExecuteSystem
  | CleanupSystem
  | TearDownSystem;

/**
 * in a similar way to Unity's `Start()`, we can do some initialization works:
 * * create global entities
 * * init event listeners
 */
@injectable()
export abstract class InitializeSystem {
  public static TYPE = 'InitializeSystem';
  public name: string;
  public type = InitializeSystem.TYPE;
  public abstract initialize(canvas: HTMLCanvasElement): void;
}

/**
 * in a similar way to Unity's `Update()`, run once per frame
 */
// tslint:disable-next-line:max-classes-per-file
@injectable()
export abstract class ExecuteSystem {
  public static TYPE = 'ExecuteSystem';
  public name: string;
  public type = ExecuteSystem.TYPE;
  public abstract execute(): void;
}

/**
 * run at the end of each frame
 */
// tslint:disable-next-line:max-classes-per-file
@injectable()
export abstract class CleanupSystem {
  public static TYPE = 'CleanupSystem';
  public name: string;
  public type = CleanupSystem.TYPE;
  public abstract cleanup(): void;
}

/**
 * run once at the end of your program
 */
// tslint:disable-next-line:max-classes-per-file
@injectable()
export abstract class TearDownSystem {
  public static TYPE = 'TearDownSystem';
  public name: string;
  public type = TearDownSystem.TYPE;
  public abstract tearDown(): void;
}
