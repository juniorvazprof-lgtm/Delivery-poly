import './style.css';
import { SceneManager } from './core/SceneManager';
import { loadModels } from './core/Assets';
import { GameState } from './game/GameState';
import { ExploreScene } from './scenes/ExploreScene';
import { BattleScene } from './scenes/BattleScene';
import { BattleUI } from './ui/BattleUI';
import { ExploreHUD } from './ui/ExploreHUD';
import { VILLAGE } from './data/village';

async function boot(): Promise<void> {
  const app = document.getElementById('app')!;
  await loadModels(['warrior', 'archer', 'tank', 'mage', 'ghost', 'demon']);
  const sm = new SceneManager(app);
  const state = new GameState();
  const hud = new ExploreHUD(document.body, state);
  const ui = new BattleUI(document.body);
  const battle = new BattleScene(state, sm.renderer.domElement, ui);

  const explore: ExploreScene = new ExploreScene(state, sm.renderer.domElement, {
    onMessage: (t) => hud.message(t),
    onRest: () => { state.restAll(); hud.refresh(); hud.message('O grupo descansa junto ao poço. Vida restaurada.'); },
    onEncounter: async (enc, ambush) => {
      hud.show(false);
      await fadeTo(true);
      sm.switchTo(battle);
      await fadeTo(false);
      const res = await battle.start(enc, ambush);
      await fadeTo(true);
      state.afterBattle();
      if (res.outcome === 'victory') {
        state.cleared.add(enc.id);
        state.freedVillagers += res.freed;
      } else {
        state.restAll();
        explore.pushBack(explore.packPosition(enc.id));
      }
      sm.switchTo(explore);
      hud.show(true);
      hud.refresh();
      await fadeTo(false);
      if (enc.boss && res.outcome === 'victory') victory();
      else if (res.outcome === 'victory') hud.message('A área está limpa.');
    },
  });

  function victory(): void {
    const o = document.createElement('div');
    o.className = 'end-screen victory';
    o.innerHTML = `<h1>${VILLAGE.name} foi libertada</h1><p>O Abade Profanado caiu. ${state.freedVillagers} aldeões foram salvos.<br>
      Mas o Abade falou de um mestre... o Necromante aguarda além das colinas.</p><p><small>Fim da fatia jogável.</small></p>`;
    document.body.appendChild(o);
  }

  sm.switchTo(explore);
  hud.refresh();
  if (import.meta.env.DEV) Object.assign(window, { __debug: { explore, state, battleCb: (id: string, amb: boolean) => (explore as unknown as { cb: { onEncounter: (e: unknown, a: boolean) => void } }).cb.onEncounter(VILLAGE.encounters.find((e) => e.id === id), amb) } });
  document.getElementById('loading')?.remove();
  hud.message('O mal tomou Vau-Cinzento. Os quatro chegam pela estrada do oeste, guiados pelo cheiro de cinzas.', 6000);
}

const fader = () => document.getElementById('fade')!;
function fadeTo(dark: boolean): Promise<void> {
  fader().classList.toggle('on', dark);
  return new Promise((r) => setTimeout(r, 450));
}

boot().catch((e) => { document.getElementById('loading')!.textContent = `Erro: ${e}`; console.error(e); });
