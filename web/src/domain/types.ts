// Tipos puros do domínio. Nada aqui conhece Three.js ou DOM.

export type Side = 'hero' | 'enemy';
export type DamageKind = 'physical' | 'magic' | 'holy';

export interface Stats {
  maxHp: number;
  atk: number; // dano físico
  mag: number; // dano mágico/sagrado e cura
  def: number; // reduz dano físico
  res: number; // reduz dano mágico/sagrado
  spd: number; // velocidade na linha do tempo
}

export type TargetRule =
  | 'enemy' // um inimigo vivo
  | 'all_enemies'
  | 'ally' // um aliado vivo (inclui a si mesmo)
  | 'all_allies'
  | 'self'
  | 'downed_ally'; // aliado caído (reviver)

export type StatusId = 'bleed' | 'burn' | 'guarded' | 'taunt' | 'weaken' | 'fortify';

export interface StatusDef {
  id: StatusId;
  turns: number;
  potency?: number; // dano por turno (bleed/burn) ou % (weaken/fortify)
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  cost: number; // energia
  target: TargetRule;
  kind: DamageKind | 'heal' | 'revive' | 'buff';
  power: number; // multiplicador sobre atk (physical) ou mag (resto)
  hits?: number; // golpes múltiplos
  critBonus?: number; // chance extra de crítico (0..1)
  applies?: StatusDef; // status aplicado no alvo
  selfApplies?: StatusDef; // status aplicado em quem usa
  exorcise?: boolean; // contra possuídos com pouca vida: liberta em vez de matar
}

export interface UnitDef {
  id: string;
  name: string;
  model: string; // nome do .glb
  stats: Stats;
  skills: string[]; // ids de Skill (além do ataque básico)
  basicKind: DamageKind;
  resist?: Partial<Record<DamageKind, number>>; // multiplicador: 0.5 resiste, 2 fraqueza
  possessed?: boolean;
  ai?: 'brute' | 'caster' | 'spectral';
  scale?: number;
}

export interface StatusInstance extends StatusDef {
  sourceId: string;
}

export interface Unit {
  uid: string;
  def: UnitDef;
  side: Side;
  hp: number;
  energy: number;
  statuses: StatusInstance[];
  downed: boolean;
  freed: boolean; // possuído exorcizado (sai da batalha vivo)
  nextAt: number; // tempo da próxima ação na linha do tempo
}

export type BattleEvent =
  | { type: 'turn'; unit: string }
  | { type: 'action'; unit: string; skill: string; targets: string[] }
  | { type: 'damage'; source: string; target: string; amount: number; crit: boolean; affinity: 'weak' | 'resist' | null; redirectedFrom?: string }
  | { type: 'heal'; target: string; amount: number }
  | { type: 'energy'; unit: string; value: number }
  | { type: 'status'; target: string; status: StatusId; turns: number }
  | { type: 'status_tick'; target: string; status: StatusId; amount: number }
  | { type: 'downed'; unit: string }
  | { type: 'revived'; unit: string; hp: number }
  | { type: 'freed'; unit: string }
  | { type: 'end'; outcome: 'victory' | 'defeat' };

export const MAX_ENERGY = 6;
