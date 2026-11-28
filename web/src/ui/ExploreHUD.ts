import type { GameState } from '../game/GameState';
import { VILLAGE } from '../data/village';

/** HUD da exploração: vida do grupo, objetivo, mensagens narrativas. */
export class ExploreHUD {
  private root = document.createElement('div');
  private msg = document.createElement('div');
  private hideTimer = 0;
  constructor(parent: HTMLElement, private state: GameState) {
    this.root.className = 'explore-hud';
    this.msg.className = 'story hidden';
    parent.append(this.root, this.msg);
  }
  refresh(): void {
    const left = VILLAGE.encounters.filter((e) => !this.state.cleared.has(e.id)).length;
    this.root.innerHTML = `<div class="obj"><b>${VILLAGE.name}</b><br>Grupos de inimigos restantes: ${left}
      <br><small>Aldeões libertados: ${this.state.freedVillagers}</small></div>
      <div class="mini-party">${this.state.party.map((u) => `<div><span>${u.def.name}</span>
      <div class="hpbar"><div style="width:${(u.hp / u.def.stats.maxHp) * 100}%"></div></div></div>`).join('')}</div>
      <div class="help">Clique no chão para andar · clique num inimigo para atacá-lo antes que ele te veja · clique no poço para descansar · roda do mouse: zoom</div>`;
  }
  show(visible: boolean): void { this.root.style.display = visible ? '' : 'none'; if (!visible) this.msg.classList.add('hidden'); }
  message(text: string, ms = 4500): void {
    this.msg.textContent = text;
    this.msg.classList.remove('hidden');
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.msg.classList.add('hidden'), ms);
  }
}
