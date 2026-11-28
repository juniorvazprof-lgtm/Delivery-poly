// Conteúdo do jogo como dados. Novos inimigos/habilidades entram aqui, sem código novo.
import type { Skill, UnitDef } from '../domain/types';

export const SKILLS: Record<string, Skill> = {
  attack: { id: 'attack', name: 'Atacar', description: 'Ataque básico. Gera 1 de energia.', cost: 0, target: 'enemy', kind: 'physical', power: 1 },
  // Guerreiro
  cleave: { id: 'cleave', name: 'Golpe Giratório', description: 'Atinge todos os inimigos.', cost: 3, target: 'all_enemies', kind: 'physical', power: 0.9 },
  execute: { id: 'execute', name: 'Execução', description: 'Golpe brutal com alta chance de crítico.', cost: 2, target: 'enemy', kind: 'physical', power: 1.8, critBonus: 0.35 },
  // Arqueiro
  rend: { id: 'rend', name: 'Flecha Dilacerante', description: 'Causa sangramento por 3 turnos.', cost: 2, target: 'enemy', kind: 'physical', power: 1.0, applies: { id: 'bleed', turns: 3, potency: 6 } },
  volley: { id: 'volley', name: 'Chuva de Flechas', description: 'Três flechas no mesmo alvo.', cost: 3, target: 'enemy', kind: 'physical', power: 0.65, hits: 3, critBonus: 0.1 },
  // Tank
  taunt: { id: 'taunt', name: 'Provocar', description: 'Inimigos atacam o Tank por 2 turnos.', cost: 1, target: 'self', kind: 'buff', power: 0, selfApplies: { id: 'taunt', turns: 2 } },
  protect: { id: 'protect', name: 'Proteger', description: 'O Tank recebe os golpes no lugar do aliado.', cost: 2, target: 'ally', kind: 'buff', power: 0, applies: { id: 'guarded', turns: 2 } },
  bulwark: { id: 'bulwark', name: 'Muralha', description: 'Reduz o dano sofrido pelo grupo em 40%.', cost: 3, target: 'all_allies', kind: 'buff', power: 0, applies: { id: 'fortify', turns: 2, potency: 0.4 } },
  // Mago
  fireball: { id: 'fireball', name: 'Bola de Fogo', description: 'Dano mágico em todos e queimadura.', cost: 3, target: 'all_enemies', kind: 'magic', power: 0.9, applies: { id: 'burn', turns: 2, potency: 5 } },
  holy: { id: 'holy', name: 'Luz Sagrada', description: 'Dano sagrado. Exorciza possuídos enfraquecidos.', cost: 2, target: 'enemy', kind: 'holy', power: 1.5, exorcise: true },
  heal: { id: 'heal', name: 'Cura', description: 'Restaura vida de um aliado.', cost: 2, target: 'ally', kind: 'heal', power: 1.6 },
  revive: { id: 'revive', name: 'Reerguer', description: 'Revive um aliado caído.', cost: 4, target: 'downed_ally', kind: 'revive', power: 0.4 },
  // Inimigos
  claw: { id: 'claw', name: 'Garras', description: '', cost: 0, target: 'enemy', kind: 'physical', power: 1.0 },
  hellfire: { id: 'hellfire', name: 'Fogo Infernal', description: '', cost: 3, target: 'all_enemies', kind: 'magic', power: 0.7, applies: { id: 'burn', turns: 2, potency: 4 } },
  wail: { id: 'wail', name: 'Lamento', description: '', cost: 2, target: 'all_enemies', kind: 'magic', power: 0.55, applies: { id: 'weaken', turns: 2, potency: 0.25 } },
  chill: { id: 'chill', name: 'Toque Gélido', description: '', cost: 0, target: 'enemy', kind: 'magic', power: 1.0 },
};

export const HEROES: UnitDef[] = [
  { id: 'warrior', name: 'Aldric', model: 'warrior', basicKind: 'physical',
    stats: { maxHp: 120, atk: 22, mag: 5, def: 10, res: 6, spd: 11 }, skills: ['execute', 'cleave'] },
  { id: 'archer', name: 'Lyra', model: 'archer', basicKind: 'physical',
    stats: { maxHp: 90, atk: 19, mag: 6, def: 6, res: 8, spd: 15 }, skills: ['rend', 'volley'] },
  { id: 'tank', name: 'Borin', model: 'tank', basicKind: 'physical',
    stats: { maxHp: 170, atk: 14, mag: 4, def: 18, res: 10, spd: 8 }, skills: ['taunt', 'protect', 'bulwark'] },
  { id: 'mage', name: 'Elowen', model: 'mage', basicKind: 'magic',
    stats: { maxHp: 80, atk: 8, mag: 24, def: 5, res: 14, spd: 12 }, skills: ['holy', 'fireball', 'heal', 'revive'] },
];

export const ENEMIES: Record<string, UnitDef> = {
  possessed: { id: 'possessed', name: 'Aldeão Possuído', model: 'warrior', basicKind: 'physical', possessed: true, ai: 'brute', scale: 0.9,
    stats: { maxHp: 70, atk: 14, mag: 4, def: 5, res: 4, spd: 10 }, skills: [], resist: { holy: 1.5 } },
  ghost: { id: 'ghost', name: 'Espectro', model: 'ghost', basicKind: 'magic', ai: 'spectral', scale: 1.1,
    stats: { maxHp: 65, atk: 6, mag: 16, def: 8, res: 6, spd: 13 }, skills: ['chill', 'wail'], resist: { physical: 0.5, holy: 2 } },
  demon: { id: 'demon', name: 'Demônio Menor', model: 'demon', basicKind: 'physical', ai: 'brute', scale: 1.3,
    stats: { maxHp: 140, atk: 20, mag: 12, def: 10, res: 6, spd: 9 }, skills: ['claw', 'hellfire'], resist: { magic: 0.75, holy: 1.5 } },
  abbot: { id: 'abbot', name: 'Abade Profanado', model: 'demon', basicKind: 'magic', ai: 'caster', scale: 1.7,
    stats: { maxHp: 380, atk: 18, mag: 22, def: 12, res: 12, spd: 11 }, skills: ['hellfire', 'wail', 'claw'], resist: { holy: 1.25 } },
};
