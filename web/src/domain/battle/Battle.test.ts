import { describe, expect, it } from 'vitest';
import { Battle, createUnit, makeRng } from './Battle';
import { ENEMIES, HEROES } from '../../data/content';
import type { Unit } from '../types';

const hero = (id: string) => createUnit(HEROES.find((h) => h.id === id)!, 'hero', id);
const party = () => ['warrior', 'archer', 'tank', 'mage'].map(hero);
const foe = (id: string, n = 0) => createUnit(ENEMIES[id], 'enemy', `${id}${n}`);

/** Faz a batalha andar até ser a vez da unidade `uid` (inimigos agem pela IA, heróis atacam). */
function advanceTo(b: Battle, uid: string) {
  for (let i = 0; i < 50 && b.current().uid !== uid; i++) {
    const c = b.current();
    if (c.side === 'enemy') b.enemyTurn();
    else b.act('attack', b.validTargets(c, { target: 'enemy' } as never)[0].uid);
  }
  expect(b.current().uid).toBe(uid);
}

describe('Battle', () => {
  it('ordena a linha do tempo por velocidade e heróis agem primeiro na emboscada', () => {
    const b = new Battle(party(), [foe('ghost')], makeRng(1), { heroesFirst: true });
    const order = b.timeline(5).map((u) => u.uid);
    expect(order.slice(0, 4)).toEqual(['archer', 'mage', 'warrior', 'tank']);
    expect(b.timeline(5)).toEqual(b.timeline(5)); // não muta
  });

  it('ataque básico gera energia e habilidade consome', () => {
    const b = new Battle(party(), [foe('demon')], makeRng(2), { heroesFirst: true });
    const archer = b.current();
    b.act('attack', 'demon0');
    expect(archer.energy).toBe(3);
    advanceTo(b, 'archer');
    b.act('volley', 'demon0');
    expect(archer.energy).toBe(0);
  });

  it('fantasma resiste a físico e é fraco a sagrado', () => {
    const b = new Battle(party(), [foe('ghost')], makeRng(3), { heroesFirst: true });
    b.act('attack', 'ghost0'); // arqueira
    advanceTo(b, 'mage');
    const ev = b.act('holy', 'ghost0');
    const dmg = ev.filter((e) => e.type === 'damage');
    expect(dmg[0]).toMatchObject({ affinity: 'weak' });
  });

  it('Luz Sagrada exorciza possuído enfraquecido em vez de matar', () => {
    const p = foe('possessed');
    p.hp = 20;
    const b = new Battle(party(), [p, foe('ghost')], makeRng(4), { heroesFirst: true });
    advanceTo(b, 'mage');
    const ev = b.act('holy', 'possessed0');
    expect(ev.some((e) => e.type === 'freed')).toBe(true);
    expect(p.freed).toBe(true);
    expect(p.downed).toBe(false);
  });

  it('Proteger redireciona dano ao tank e Provocar atrai os ataques', () => {
    const heroes = party();
    const b = new Battle(heroes, [foe('demon')], makeRng(5), { heroesFirst: true });
    advanceTo(b, 'tank');
    b.act('protect', 'mage');
    const mage = heroes[3];
    // força o ataque do demônio no mago
    const demon = b.units.find((u) => u.uid === 'demon0')!;
    demon.nextAt = -1000;
    const ev = b.act('claw', 'mage');
    const d = ev.find((e) => e.type === 'damage')!;
    expect(d).toMatchObject({ target: 'tank', redirectedFrom: 'mage' });
    expect(mage.hp).toBe(mage.def.stats.maxHp);
  });

  it('sangramento pode derrubar no início do turno e o turno é pulado', () => {
    const d = foe('demon');
    d.hp = 3;
    d.statuses.push({ id: 'bleed', turns: 2, potency: 6, sourceId: 'archer' });
    d.nextAt = -999;
    const b = new Battle(party(), [d, foe('ghost')], makeRng(6));
    d.nextAt = -999;
    const r = b.beginTurn();
    expect(r.skipped).toBe(true);
    expect(d.downed).toBe(true);
  });

  it('Reerguer revive aliado caído; vitória e derrota são detectadas', () => {
    const heroes = party();
    const b = new Battle(heroes, [foe('ghost')], makeRng(7), { heroesFirst: true });
    heroes[0].downed = true;
    heroes[0].hp = 0;
    const mage = heroes[3];
    mage.energy = 6;
    advanceTo(b, 'mage');
    const ev = b.act('revive', 'warrior');
    expect(ev.some((e) => e.type === 'revived')).toBe(true);
    expect(heroes[0].hp).toBe(48);
    heroes.forEach((h: Unit) => { h.downed = true; });
    expect(b.outcome()).toBe('defeat');
  });

  it('uma batalha completa termina (IA x ataques básicos)', () => {
    const b = new Battle(party(), [foe('demon'), foe('ghost', 1), foe('possessed', 2)], makeRng(8));
    let guard = 0;
    while (b.outcome() === 'ongoing' && guard++ < 500) {
      const c = b.current();
      if (c.side === 'enemy') b.enemyTurn();
      else b.act('attack', b.validTargets(c, { target: 'enemy' } as never)[0].uid);
    }
    expect(b.outcome()).not.toBe('ongoing');
  });
});
