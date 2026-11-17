// Sessão de sobrevivência: os zumbis não param de chegar, as caixas das cabanas dão munição.
// Estados: titulo → jogando → caido.
import { CFG } from './config.js';
import { TEXTOS, sortear } from './textos.js';
import { SOM } from './sons.js';

export function criarMissao({ mundo, heroi, combate, hud }) {
  const AR = CFG.area;
  const m = {
    estado: 'titulo', abates: 0, tempo: 0, surgeT: 0,
    get ativo() { return m.estado === 'jogando'; },
    /** Começa do zero: mapa limpo, herói no centro, vida cheia e um sinalizador na mão. */
    iniciar() {
      combate.limpar();
      for (const c of mundo.caixas) { c.aberta = false; c.g.children[1].position.y = 0.44; c.g.children[1].rotation.x = 0; }
      heroi.g.position.set(0, 0, 0); heroi.vida = CFG.heroi.vida; heroi.caido = false; heroi.invul = 0;
      combate.resetarArmas();
      heroi.bateria = 1; heroi.pilhas = 0; heroi.sinalizadores = 1; heroi.setLanterna(true);
      Object.assign(m, { abates: 0, tempo: 0, surgeT: AR.surgeCada });
      for (let i = 0; i < AR.vagando; i++) combate.surgir(9, 40);
      m.estado = 'jogando'; hud.radio(sortear(TEXTOS.dicas), 5);
    },
    abate() { if (m.ativo) m.abates++; },
    passo(dt) {
      if (!m.ativo) return;
      m.tempo += dt;
      const p = heroi.g.position;
      // caixas na porta das cabanas: abrem ao encostar e dão munição
      for (const c of mundo.caixas) { if (!c.aberta && c.g.position.distanceTo(p) < 1.3) abrir(c); }
      // a área segue povoada: quando a população cai, outros chegam pela mata, longe de você
      if ((m.surgeT -= dt) <= 0 && combate.vivos() < AR.minimo) { combate.surgir(AR.surgeLonge, 34); m.surgeT = AR.surgeCada; }
    },
    caiu() {
      if (!m.ativo) return;
      m.estado = 'caido'; SOM.derrota();
      hud.fim({ abates: m.abates, tempo: m.tempo });
    },
  };
  function abrir(c) {
    c.aberta = true; c.g.children[1].position.y = 0.6; c.g.children[1].rotation.x = -1.1; SOM.caixa();
    for (const k in CFG.saque.caixaMunicao) combate.arma.muni[k].reserva += CFG.saque.caixaMunicao[k];
    hud.ganho(`+${CFG.saque.caixaMunicao.espingarda} cartuchos · +${CFG.saque.caixaMunicao.pistola} balas`);
  }
  return m;
}
