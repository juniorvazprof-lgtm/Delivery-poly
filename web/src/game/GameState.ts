import { createUnit } from '../domain/battle/Battle';
import { HEROES } from '../data/content';
import type { Unit } from '../domain/types';

/** Estado persistente da jornada (entre exploração e batalhas). */
export class GameState {
  party: Unit[] = HEROES.map((d) => createUnit(d, 'hero', d.id));
  cleared = new Set<string>();
  freedVillagers = 0;

  /** Após cada batalha: caídos levantam com 25% de vida, energia volta ao inicial. */
  afterBattle(): void {
    for (const u of this.party) {
      if (u.downed) { u.downed = false; u.hp = Math.round(u.def.stats.maxHp * 0.25); }
      u.statuses = [];
      u.energy = 2;
    }
  }

  restAll(): void {
    for (const u of this.party) { u.hp = u.def.stats.maxHp; u.downed = false; }
  }
}
