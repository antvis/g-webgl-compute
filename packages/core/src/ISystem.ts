/**
 * inspired by Entitas' Systems
 * @see https://github.com/sschmid/Entitas-CSharp/wiki/Systems
 */

import { IView } from '.';

export interface ISystem {
  /**
   * in a similar way to Unity's `Start()`, we can do some initialization works:
   * * create global entities
   * * init event listeners
   */
  initialize?(): Promise<void>;

  /**
   * in a similar way to Unity's `Update()`, run once per frame
   */
  execute?(views: IView[]): Promise<void>;

  /**
   * run at the end of each frame
   */
  cleanup?(): void;

  /**
   * run once at the end of your program
   */
  tearDown?(): void;
}
