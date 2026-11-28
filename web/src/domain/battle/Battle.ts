import type {
  BattleEvent,
  DamageKind,
  Side,
  Skill,
  StatusId,
  Unit,
  UnitDef,
} from '../types';
import { MAX_ENERGY } from '../types';
import { SKILLS } from '../../data/content';

export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createUnit(def: UnitDef, side: Side, uid: string): Unit {
  return {
    uid,
    def,
    side,
    hp: def.stats.maxHp,
    energy: side === 'hero' ? 2 : 1,
    statuses: [],
    downed: false,
    freed: false,
    nextAt: 0,
  };
}

const BASIC_ATTACK_ID = 'attack';

function active(u: Unit): boolean {
  return !u.downed && !u.freed;
}

function roundHalfUp(n: number): number {
  return Math.floor(n + 0.5);
}

export class Battle {
  units: Unit[];
  private rng: Rng;

  constructor(
    heroes: Unit[],
    enemies: Unit[],
    rng: Rng,
    opts?: { heroesFirst?: boolean },
  ) {
    this.rng = rng;
    this.units = [...heroes, ...enemies];
    this.units.forEach((u, i) => {
      const spd = Math.max(1, u.def.stats.spd);
      u.nextAt = 100 / spd + 0.001 * i;
      if (opts?.heroesFirst && u.side === 'hero') {
        u.nextAt -= 100;
      }
    });
  }

  private isActive(u: Unit): boolean {
    return active(u);
  }

  private activeUnits(): Unit[] {
    return this.units.filter((u) => this.isActive(u));
  }

  private findUid(uid: string): Unit | undefined {
    return this.units.find((u) => u.uid === uid);
  }

  current(): Unit {
    const actives = this.activeUnits();
    if (actives.length === 0) {
      throw new Error('Nenhuma unidade ativa');
    }
    let best = actives[0];
    for (let i = 1; i < actives.length; i++) {
      const u = actives[i];
      if (u.nextAt < best.nextAt) {
        best = u;
      }
    }
    return best;
  }

  timeline(n: number): Unit[] {
    const sim = this.units.map((u) => ({
      uid: u.uid,
      nextAt: u.nextAt,
      spd: Math.max(1, u.def.stats.spd),
      active: this.isActive(u),
    }));
    const result: Unit[] = [];
    for (let i = 0; i < n; i++) {
      let best: (typeof sim)[number] | null = null;
      for (const s of sim) {
        if (!s.active) continue;
        if (best === null || s.nextAt < best.nextAt) {
          best = s;
        }
      }
      if (!best) break;
      const unit = this.findUid(best.uid);
      if (unit) result.push(unit);
      best.nextAt += 100 / best.spd;
    }
    return result;
  }

  getSkills(u: Unit): Skill[] {
    const list: Skill[] = [];
    if (u.side === 'hero') {
      list.push(SKILLS[BASIC_ATTACK_ID]);
      for (const id of u.def.skills) {
        const s = SKILLS[id];
        if (s) list.push(s);
      }
    } else {
      let basic: Skill | null = null;
      const firstId = u.def.skills[0];
      if (firstId) {
        const candidate = SKILLS[firstId];
        if (candidate && candidate.cost === 0) basic = candidate;
      }
      list.push(basic ?? SKILLS[BASIC_ATTACK_ID]);
      for (const id of u.def.skills) {
        const s = SKILLS[id];
        if (s && s !== basic) list.push(s);
      }
    }
    return list;
  }

  private enemiesOf(u: Unit): Unit[] {
    return this.units.filter((x) => x.side !== u.side && this.isActive(x));
  }

  private alliesOf(u: Unit): Unit[] {
    return this.units.filter((x) => x.side === u.side && this.isActive(x));
  }

  private downedAlliesOf(u: Unit): Unit[] {
    return this.units.filter((x) => x.side === u.side && x.downed && !x.freed);
  }

  validTargets(u: Unit, s: Skill): Unit[] {
    switch (s.target) {
      case 'enemy':
        return this.enemiesOf(u);
      case 'all_enemies':
        return this.enemiesOf(u);
      case 'ally':
        return this.alliesOf(u);
      case 'all_allies':
        return this.alliesOf(u);
      case 'self':
        return this.isActive(u) ? [u] : [];
      case 'downed_ally':
        return this.downedAlliesOf(u);
      default:
        return [];
    }
  }

  canUse(u: Unit, s: Skill): boolean {
    if (u.energy < s.cost) return false;
    return this.validTargets(u, s).length > 0;
  }

  private hasStatus(u: Unit, id: StatusId): boolean {
    return u.statuses.some((st) => st.id === id);
  }

  private getStatus(u: Unit, id: StatusId) {
    return u.statuses.find((st) => st.id === id);
  }

  private applyStatus(target: Unit, statusId: StatusId, turns: number, potency: number | undefined, sourceId: string, events: BattleEvent[]): void {
    if (!this.isActive(target)) return;
    target.statuses = target.statuses.filter((st) => st.id !== statusId);
    const inst = { id: statusId, turns, potency, sourceId };
    target.statuses.push(inst);
    events.push({ type: 'status', target: target.uid, status: statusId, turns });
  }

  private mitigationFactor(kind: DamageKind, target: Unit): number {
    const def = kind === 'physical' ? target.def.stats.def : target.def.stats.res;
    return 50 / (50 + def);
  }

  private computeDamage(attacker: Unit, target: Unit, skill: Skill): { amount: number; crit: boolean; affinity: 'weak' | 'resist' | null } {
    const kind: DamageKind = skill.id === BASIC_ATTACK_ID ? attacker.def.basicKind : (skill.kind as DamageKind);
    const baseStat = kind === 'physical' ? attacker.def.stats.atk : attacker.def.stats.mag;
    const variance = 0.9 + this.rng() * 0.2;
    let dmg = baseStat * skill.power * variance;
    dmg *= this.mitigationFactor(kind, target);

    const resist = target.def.resist?.[kind];
    let affinity: 'weak' | 'resist' | null = null;
    if (typeof resist === 'number') {
      dmg *= resist;
      if (resist > 1) affinity = 'weak';
      else if (resist < 1) affinity = 'resist';
    }

    const critChance = 0.1 + (skill.critBonus ?? 0);
    const crit = this.rng() < critChance;
    if (crit) {
      dmg *= 1.5;
    }

    const weaken = this.getStatus(attacker, 'weaken');
    if (weaken && typeof weaken.potency === 'number') {
      dmg *= 1 - weaken.potency;
    }
    const fortify = this.getStatus(target, 'fortify');
    if (fortify && typeof fortify.potency === 'number') {
      dmg *= 1 - fortify.potency;
    }

    let amount = roundHalfUp(dmg);
    if (amount < 1) amount = 1;
    return { amount, crit, affinity };
  }

  private findGuardian(target: Unit): Unit | null {
    const guard = this.getStatus(target, 'guarded');
    if (!guard) return null;
    const source = this.findUid(guard.sourceId);
    if (!source || source === target) return null;
    if (!this.isActive(source)) return null;
    return source;
  }

  private dealDamage(
    attacker: Unit,
    target: Unit,
    skill: Skill,
    events: BattleEvent[],
    redirectedFrom?: string,
  ): void {
    const { amount, crit, affinity } = this.computeDamage(attacker, target, skill);
    target.hp -= amount;
    if (target.hp < 0) target.hp = 0;
    events.push({
      type: 'damage',
      source: attacker.uid,
      target: target.uid,
      amount,
      crit,
      affinity,
      ...(redirectedFrom ? { redirectedFrom } : {}),
    });

    if (skill.exorcise && target.def.possessed) {
      const threshold = target.def.stats.maxHp * 0.4;
      if (target.hp <= threshold) {
        target.freed = true;
        if (target.hp < 1) target.hp = 1;
        target.statuses = [];
        events.push({ type: 'freed', unit: target.uid });
        return;
      }
    }

    if (target.hp <= 0) {
      target.hp = 0;
      target.downed = true;
      target.statuses = [];
      events.push({ type: 'downed', unit: target.uid });
    }
  }

  private resolveTargets(attacker: Unit, skill: Skill, targetUid: string | undefined): Unit[] {
    const valid = this.validTargets(attacker, skill);
    if (valid.length === 0) return [];
    switch (skill.target) {
      case 'enemy':
      case 'ally':
      case 'self':
      case 'downed_ally': {
        if (targetUid) {
          const t = valid.find((x) => x.uid === targetUid);
          if (!t) {
            throw new Error(`Alvo inválido: ${targetUid}`);
          }
          return [t];
        }
        return [valid[0]];
      }
      case 'all_enemies':
      case 'all_allies':
        return valid;
      default:
        return [];
    }
  }

  private tickStatuses(u: Unit, events: BattleEvent[]): void {
    for (const st of [...u.statuses]) {
      if (st.id === 'bleed' || st.id === 'burn') {
        const amount = st.potency ?? 0;
        if (amount > 0) {
          u.hp -= amount;
          if (u.hp < 0) u.hp = 0;
          events.push({ type: 'status_tick', target: u.uid, status: st.id, amount });
          if (u.hp <= 0) {
            u.hp = 0;
            u.downed = true;
            u.statuses = [];
            events.push({ type: 'downed', unit: u.uid });
            return;
          }
        }
      }
    }
    for (const st of u.statuses) {
      st.turns -= 1;
    }
    u.statuses = u.statuses.filter((st) => st.turns > 0);
  }

  private advanceTime(u: Unit): void {
    const spd = Math.max(1, u.def.stats.spd);
    u.nextAt += 100 / spd;
  }

  private checkOutcome(events: BattleEvent[]): void {
    const anyEnemyActive = this.units.some((u) => u.side === 'enemy' && this.isActive(u));
    const anyHeroActive = this.units.some((u) => u.side === 'hero' && this.isActive(u));
    if (!anyEnemyActive) {
      events.push({ type: 'end', outcome: 'victory' });
    } else if (!anyHeroActive) {
      events.push({ type: 'end', outcome: 'defeat' });
    }
  }

  private turnStarted: string | null = null;

  /** Início do turno da unidade atual: aplica sangramento/queimadura e expira status.
   *  Se a unidade cair aqui, o turno passa adiante. Chame antes de pedir a ação ao jogador
   *  e repita enquanto retornar `skipped`. */
  beginTurn(): { events: BattleEvent[]; skipped: boolean } {
    const events: BattleEvent[] = [];
    const u = this.current();
    events.push({ type: 'turn', unit: u.uid });
    this.tickStatuses(u, events);
    if (u.downed) {
      this.advanceTime(u);
      this.checkOutcome(events);
      this.turnStarted = null;
      return { events, skipped: true };
    }
    this.turnStarted = u.uid;
    return { events, skipped: false };
  }

  act(skillId: string, targetUid?: string): BattleEvent[] {
    const events: BattleEvent[] = [];
    if (this.turnStarted !== this.current().uid) {
      const b = this.beginTurn();
      events.push(...b.events);
      if (b.skipped) return events;
    }
    const u = this.current();

    const skill = SKILLS[skillId];
    if (!skill) {
      throw new Error(`Skill desconhecida: ${skillId}`);
    }
    if (!this.canUse(u, skill)) {
      throw new Error(`Skill não utilizável: ${skillId}`);
    }

    const targets = this.resolveTargets(u, skill, targetUid);
    if (targets.length === 0) {
      throw new Error(`Sem alvos válidos para: ${skillId}`);
    }

    this.turnStarted = null;
    if (skill.cost > 0) {
      u.energy = Math.max(0, u.energy - skill.cost);
    } else {
      u.energy = Math.min(MAX_ENERGY, u.energy + 1);
    }
    events.push({ type: 'energy', unit: u.uid, value: u.energy });

    events.push({
      type: 'action',
      unit: u.uid,
      skill: skill.id,
      targets: targets.map((t) => t.uid),
    });

    if (skill.kind === 'heal') {
      const mag = u.def.stats.mag;
      for (const t of targets) {
        if (!this.isActive(t)) continue;
        const base = mag * skill.power * (0.95 + this.rng() * 0.1);
        let amount = roundHalfUp(base);
        if (amount < 1) amount = 1;
        t.hp = Math.min(t.def.stats.maxHp, t.hp + amount);
        events.push({ type: 'heal', target: t.uid, amount });
      }
    } else if (skill.kind === 'revive') {
      for (const t of targets) {
        t.downed = false;
        t.freed = false;
        t.hp = Math.max(1, roundHalfUp(t.def.stats.maxHp * skill.power));
        t.statuses = [];
        t.nextAt = u.nextAt + 100 / Math.max(1, t.def.stats.spd);
        events.push({ type: 'revived', unit: t.uid, hp: t.hp });
      }
    } else if (skill.kind === 'buff') {
      for (const t of targets) {
        if (skill.applies) {
          this.applyStatus(
            t,
            skill.applies.id,
            skill.applies.turns,
            skill.applies.potency,
            u.uid,
            events,
          );
        }
      }
      if (skill.selfApplies) {
        this.applyStatus(
          u,
          skill.selfApplies.id,
          skill.selfApplies.turns,
          skill.selfApplies.potency,
          u.uid,
          events,
        );
      }
    } else {
      const hits = Math.max(1, skill.hits ?? 1);
      for (const rawTarget of targets) {
        for (let h = 0; h < hits; h++) {
          const target = rawTarget;
          if (!this.isActive(target)) break;

          const guardian = target.side === 'hero' ? this.findGuardian(target) : null;
          if (guardian) {
            this.dealDamage(u, guardian, skill, events, target.uid);
          } else {
            this.dealDamage(u, target, skill, events);
          }
        }
        if (skill.applies && this.isActive(rawTarget)) {
          this.applyStatus(
            rawTarget,
            skill.applies.id,
            skill.applies.turns,
            skill.applies.potency,
            u.uid,
            events,
          );
        }
      }
      if (skill.selfApplies) {
        this.applyStatus(
          u,
          skill.selfApplies.id,
          skill.selfApplies.turns,
          skill.selfApplies.potency,
          u.uid,
          events,
        );
      }
    }

    this.advanceTime(u);
    this.checkOutcome(events);
    return events;
  }

  private pickEnemyTarget(attacker: Unit, skill: Skill): Unit | undefined {
    const valid = this.validTargets(attacker, skill);
    if (valid.length === 0) return undefined;
    if (skill.target !== 'enemy') {
      return valid[0];
    }
    const taunters = valid.filter((t) => this.hasStatus(t, 'taunt'));
    if (taunters.length > 0) {
      return taunters[0];
    }
    if (attacker.def.ai === 'spectral') {
      let best = valid[0];
      for (const t of valid) {
        if (t.def.stats.res < best.def.stats.res) best = t;
      }
      return best;
    }
    if (attacker.def.ai === 'caster') {
      let best = valid[0];
      for (const t of valid) {
        if (t.def.stats.atk > best.def.stats.atk) best = t;
      }
      return best;
    }
    // brute / default
    let best = valid[0];
    for (const t of valid) {
      if (t.hp < best.hp) best = t;
    }
    return best;
  }

  enemyTurn(): BattleEvent[] {
    const u = this.current();
    if (u.side !== 'enemy') {
      throw new Error('current() não é inimigo');
    }
    const skills = this.getSkills(u);
    const usable = skills.filter((s) => this.canUse(u, s));
    const basic = skills[0];
    const ai = u.def.ai ?? 'brute';

    let chosen: Skill = basic;
    let targetUid: string | undefined;

    if (ai === 'brute') {
      const paid = usable.filter((s) => s.cost > 0);
      if (paid.length > 0 && u.energy >= 1 && this.rng() < 0.5) {
        chosen = paid[Math.floor(this.rng() * paid.length)];
      } else {
        chosen = basic;
      }
      const t = this.pickEnemyTarget(u, chosen);
      if (t) targetUid = t.uid;
    } else if (ai === 'spectral') {
      const wail = usable.find((s) => s.id === 'wail');
      if (wail && this.rng() < 0.4) {
        chosen = wail;
      } else {
        chosen = basic;
      }
      const t = this.pickEnemyTarget(u, chosen);
      if (t) targetUid = t.uid;
    } else if (ai === 'caster') {
      const paid = usable.filter((s) => s.cost > 0);
      if (paid.length > 0) {
        paid.sort((a, b) => b.cost - a.cost);
        chosen = paid[0];
      } else {
        chosen = basic;
      }
      const t = this.pickEnemyTarget(u, chosen);
      if (t) targetUid = t.uid;
    } else {
      const t = this.pickEnemyTarget(u, basic);
      if (t) targetUid = t.uid;
    }

    if (chosen.target === 'self') {
      return this.act(chosen.id);
    }
    if (chosen.target === 'all_enemies' || chosen.target === 'all_allies') {
      return this.act(chosen.id);
    }
    return this.act(chosen.id, targetUid);
  }

  outcome(): 'ongoing' | 'victory' | 'defeat' {
    const anyEnemyActive = this.units.some((u) => u.side === 'enemy' && this.isActive(u));
    const anyHeroActive = this.units.some((u) => u.side === 'hero' && this.isActive(u));
    if (!anyEnemyActive) return 'victory';
    if (!anyHeroActive) return 'defeat';
    return 'ongoing';
  }
}
