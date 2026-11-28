import type { Battle } from '../domain/battle/Battle';
import type { Skill, Unit } from '../domain/types';
import { MAX_ENERGY } from '../domain/types';

const CLASS_COLOR: Record<string, string> = {
  warrior: '#a8322a', archer: '#4f7a3a', tank: '#8a7b62', mage: '#6a4fb0',
  possessed: '#6b5a7a', ghost: '#9fc7e6', demon: '#7a1a12', abbot: '#c0392b',
};
const CLASS_LABEL: Record<string, string> = { warrior: 'Guerreiro', archer: 'Arqueira', tank: 'Tank', mage: 'Maga' };

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

/** Interface de batalha em DOM sobre o canvas: linha do tempo, grupo, menu de ações, números flutuantes. */
export class BattleUI {
  private root = el('div', 'battle-ui hidden');
  private timeline = el('div', 'timeline');
  private party = el('div', 'party-panel');
  private menu = el('div', 'action-menu hidden');
  private hint = el('div', 'target-hint hidden');
  private logBox = el('div', 'battle-log');
  private bannerBox = el('div', 'banner hidden');
  private enemyBars = el('div', 'enemy-bars');
  private battle: Battle | null = null;
  private active = '';
  onCancel: (() => void) | null = null;
  onConfirmAll: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root.append(this.timeline, this.enemyBars, this.party, this.menu, this.hint, this.logBox, this.bannerBox);
    parent.appendChild(this.root);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.onCancel?.(); });
    this.root.addEventListener('contextmenu', (e) => { e.preventDefault(); this.onCancel?.(); });
  }

  show(b: Battle, _uids: Iterable<string>): void {
    this.battle = b;
    this.logBox.innerHTML = '';
    this.root.classList.remove('hidden');
    this.refresh();
  }
  hide(): void { this.root.classList.add('hidden'); this.menu.classList.add('hidden'); }

  setActive(uid: string): void { this.active = uid; this.refresh(); }

  refresh(): void {
    const b = this.battle;
    if (!b) return;
    // linha do tempo
    this.timeline.innerHTML = '<span class="tl-label">Ordem</span>';
    b.timeline(8).forEach((u, i) => {
      const c = el('div', `tl-chip ${u.side}${i === 0 ? ' now' : ''}`);
      c.style.setProperty('--c', CLASS_COLOR[u.def.id] ?? '#555');
      c.textContent = initials(u.def.name);
      c.title = u.def.name;
      this.timeline.appendChild(c);
    });
    // grupo
    this.party.innerHTML = '';
    for (const u of b.units.filter((x) => x.side === 'hero')) {
      const card = el('div', `hero-card${u.uid === this.active ? ' active' : ''}${u.downed ? ' downed' : ''}`);
      card.style.setProperty('--c', CLASS_COLOR[u.def.id]);
      const pips = Array.from({ length: MAX_ENERGY }, (_, i) => `<i class="${i < u.energy ? 'on' : ''}"></i>`).join('');
      card.innerHTML = `<div class="hc-top"><b>${u.def.name}</b><small>${CLASS_LABEL[u.def.id] ?? ''}</small></div>
        ${bar(u)}<div class="hc-hp">${u.hp} / ${u.def.stats.maxHp}</div><div class="pips">${pips}</div>
        <div class="st">${u.statuses.map((s) => STATUS_ICON[s.id]).join(' ')}</div>`;
      this.party.appendChild(card);
    }
    // inimigos
    this.enemyBars.innerHTML = '';
    for (const u of b.units.filter((x) => x.side === 'enemy' && !x.downed && !x.freed)) {
      const r = el('div', `enemy-row${u.uid === this.active ? ' active' : ''}`);
      r.innerHTML = `<span>${u.def.name}${u.def.possessed ? ' <em>(possuído)</em>' : ''} ${u.statuses.map((s) => STATUS_ICON[s.id]).join('')}</span>${bar(u)}`;
      this.enemyBars.appendChild(r);
    }
  }

  chooseSkill(u: Unit, options: { skill: Skill; usable: boolean }[]): Promise<Skill> {
    this.menu.innerHTML = `<div class="menu-title">${u.def.name} — escolha a ação</div>`;
    const desc = el('div', 'menu-desc', 'Passe o mouse sobre uma ação.');
    return new Promise((res) => {
      options.forEach(({ skill, usable }, i) => {
        const btn = el('button', 'skill-btn', `<span class="k">${i + 1}</span>${skill.name}<span class="cost">${skill.cost ? '◆'.repeat(skill.cost) : '+◆'}</span>`);
        btn.disabled = !usable;
        btn.onmouseenter = () => { desc.textContent = skill.description || skill.name; };
        btn.onclick = () => { this.menu.classList.add('hidden'); window.removeEventListener('keydown', keys); res(skill); };
        this.menu.appendChild(btn);
      });
      this.menu.appendChild(desc);
      const keys = (e: KeyboardEvent) => {
        const n = Number(e.key) - 1;
        const b = this.menu.querySelectorAll<HTMLButtonElement>('.skill-btn')[n];
        if (b && !b.disabled) b.click();
      };
      window.addEventListener('keydown', keys);
      this.menu.classList.remove('hidden');
    });
  }

  targetHint(skill: Skill | null, multi: boolean): void {
    if (!skill) { this.hint.classList.add('hidden'); return; }
    this.hint.innerHTML = `<b>${skill.name}</b> — ${multi ? 'clique em um alvo destacado para confirmar' : 'escolha o alvo'}
      <button class="cancel">Voltar (Esc)</button>${multi ? '<button class="confirm">Confirmar</button>' : ''}`;
    this.hint.querySelector<HTMLButtonElement>('.cancel')!.onclick = () => this.onCancel?.();
    const c = this.hint.querySelector<HTMLButtonElement>('.confirm');
    if (c) c.onclick = () => this.onConfirmAll?.();
    this.hint.classList.remove('hidden');
  }

  hoverTarget(u: Unit | null): void {
    document.body.style.cursor = u ? 'crosshair' : '';
  }

  floatText(p: { x: number; y: number }, text: string, kind: 'dmg' | 'crit' | 'heal' | 'info'): void {
    const f = el('div', `float ${kind}`, text);
    f.style.left = `${p.x + (Math.random() - 0.5) * 30}px`;
    f.style.top = `${p.y}px`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1300);
  }

  log(text: string): void {
    const l = el('div', '', text);
    this.logBox.prepend(l);
    while (this.logBox.children.length > 5) this.logBox.lastChild!.remove();
  }

  banner(text: string): void {
    this.bannerBox.textContent = text;
    this.bannerBox.classList.remove('hidden');
    setTimeout(() => this.bannerBox.classList.add('hidden'), 2200);
  }

  endScreen(outcome: 'victory' | 'defeat', freed: number): Promise<void> {
    const o = el('div', `end-screen ${outcome}`);
    o.innerHTML = outcome === 'victory'
      ? `<h1>Vitória</h1>${freed ? `<p>${freed} aldeão(s) libertado(s) da possessão.</p>` : '<p>O mal recua... por enquanto.</p>'}<button>Continuar</button>`
      : `<h1>Derrota</h1><p>A escuridão vence esta batalha. O grupo recua para se recompor.</p><button>Recuar</button>`;
    document.body.appendChild(o);
    return new Promise((res) => { o.querySelector('button')!.onclick = () => { o.remove(); res(); }; });
  }
}

function bar(u: Unit): string {
  const pct = Math.max(0, (u.hp / u.def.stats.maxHp) * 100);
  return `<div class="hpbar"><div style="width:${pct}%"></div></div>`;
}
function initials(n: string): string { return n.split(' ').map((w) => w[0]).join('').slice(0, 2); }
const STATUS_ICON: Record<string, string> = { bleed: '🩸', burn: '🔥', guarded: '🛡', taunt: '❗', weaken: '⤵', fortify: '🧱' };
