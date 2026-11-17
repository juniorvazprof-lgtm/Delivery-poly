// Sessão de Pine Hollow: dia e noite, abrigos com salvamento, inventário e criaturas que só saem à noite.
// Estados: titulo → jogando → caido.
import { CFG } from './config.js';
import { SOM } from './sons.js';
import { aleatorio } from './mundo.js';
import { criarInventario, adicionar } from './inventario.js';
import { salvar, carregar } from './salvo.js';
import { ABRIGOS } from './abrigos.js';

export function criarMissao({ mundo, heroi, combate, hud, ciclo, abrigos }) {
  const N = CFG.noite;
  const m = {
    estado: 'titulo', abates: 0, tempo: 0, surgeT: 0, bau: criarInventario(24), abrigo: ABRIGOS[0].id, flags: {},
    get ativo() { return m.estado === 'jogando'; },
    /** Novo jogo: dia 1, 07:00, inventário inicial, itens espalhados pelo mapa. */
    novo() {
      preparar();
      heroi.inv = criarInventario(8); m.bau = criarInventario(24); m.flags = {};
      for (const [id, qtd] of CFG.inicio.inventario) adicionar(heroi.inv, id, qtd);
      for (const [id, qtd] of CFG.inicio.bau) adicionar(m.bau, id, qtd);
      heroi.g.position.set(0, 0, 0); heroi.vida = CFG.heroi.vida; heroi.bateria = 1;
      ciclo.dia = 1; ciclo.pular(CFG.inicio.hora); m.abrigo = ABRIGOS[0].id;
      espalharItens(); combate.resetarArmas(); comecar();
      hud.radio(hud.fala('fala.dicas'), 6);
    },
    /** Continuar: volta ao último abrigo onde a vela foi acesa. */
    continuar() {
      const s = carregar(ABRIGOS.map(a => a.id)); if (!s) return m.novo();
      preparar();
      heroi.inv = s.inventario; m.bau = s.bau; m.flags = s.flags; m.abrigo = s.abrigo;
      const a = abrigos.porId(s.abrigo); heroi.g.position.set(a.g.position.x, 0, a.g.position.z + 1.2);
      heroi.vida = s.vida; heroi.bateria = s.bateria; ciclo.dia = s.dia; ciclo.pular(s.hora); abrigos.acender(s.abrigo);
      espalharItens(); combate.resetarArmas(); comecar();
      if (ciclo.noite) povoar(N.criaturas);
    },
    abate() { if (m.ativo) m.abates++; },
    passo(dt) {
      if (!m.ativo) return;
      m.tempo += dt;
      const p = heroi.g.position;
      for (const c of mundo.caixas) if (!c.aberta && c.g.position.distanceTo(p) < 1.3) abrir(c);
      // à noite a mata segue povoada; de dia não surge nada
      if (ciclo.noite && (m.surgeT -= dt) <= 0 && combate.vivos() < N.minimo) { combate.surgir(N.surgeLonge, 34); m.surgeT = N.surgeCada; }
    },
    anoitecer() { if (!m.ativo) return; SOM.sino(); hud.aviso(hud.t('ui.sino'), 4); povoar(N.criaturas); },
    amanhecer() { if (!m.ativo) return; combate.recolher(); hud.aviso(hud.t('ui.amanhece'), 4); },
    /** Ações do abrigo. */
    salvarAqui(id) {
      m.abrigo = id; abrigos.acender(id); SOM.lanterna();
      salvar({ hora: ciclo.hora, dia: ciclo.dia, pos: [heroi.g.position.x, heroi.g.position.z], vida: heroi.vida, bateria: heroi.bateria,
        abrigo: id, inventario: heroi.inv, bau: m.bau, flags: m.flags });
    },
    dormir() { const eraNoite = ciclo.noite; ciclo.dormir(); if (eraNoite) combate.recolher(); heroi.vida = Math.min(CFG.heroi.vida, heroi.vida + CFG.abrigo.curaDormir); },
    caiu() {
      if (!m.ativo) return;
      m.estado = 'caido'; SOM.derrota();
      hud.fim({ abates: m.abates, tempo: m.tempo });
    },
  };
  function preparar() {
    combate.limpar(); m.abates = 0; m.tempo = 0; m.surgeT = N.surgeCada;
    for (const c of mundo.caixas) { c.aberta = false; c.g.children[1].position.y = 0.44; c.g.children[1].rotation.x = 0; }
    heroi.caido = false; heroi.invul = 0; heroi.corpo.rotation.x = 0; heroi.g.visible = true;
  }
  function comecar() { heroi.setLanterna(ciclo.noite); m.estado = 'jogando'; }
  function povoar(n) { for (let i = 0; i < n; i++) combate.surgir(N.surgeLonge * 0.7, 36); }
  /** Itens espalhados em pontos fixos do mapa (mesma semente = mesmos lugares). */
  function espalharItens() {
    const r = aleatorio(CFG.area.semente + 7);
    for (const [id, qtd, n] of CFG.mapa.itens) for (let k = 0; k < n; k++) {
      for (let t = 0; t < 40; t++) { const x = (r() - 0.5) * 50, z = (r() - 0.5) * 50; if (Math.hypot(x, z) > 4 && mundo.livre(x, z, 0.8)) { combate.soltar({ x, z }, id, qtd); break; } }
    }
  }
  /** Caixa na porta de uma cabana: um suprimento sorteado da tabela. */
  function abrir(c) {
    c.aberta = true; c.g.children[1].position.y = 0.6; c.g.children[1].rotation.x = -1.1; SOM.caixa();
    const tab = CFG.mapa.caixas, [id, qtd] = tab[Math.floor(Math.random() * tab.length)];
    combate.soltar({ x: c.g.position.x, z: c.g.position.z + 0.7 }, id, qtd);
  }
  return m;
}
