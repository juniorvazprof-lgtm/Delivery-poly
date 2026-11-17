// Missão: o contrato (limpeza ou recuperação), a ganância depois do objetivo, a extração com horda e o pagamento.
// Estados: contrato → objetivo → ganancia → extracao → (pago | caido).
import { CFG } from './config.js';
import { TEXTOS, sortear } from './textos.js';
import { SOM } from './sons.js';
import { gravarInventario, gravarCarteira } from './base.js';

export function criarMissao({ mundo, heroi, combate, hud }) {
  const G = CFG.ganancia; let X = CFG.extracao, AR = CFG.area;
  const m = {
    estado: 'contrato', C: CFG.contrato, abates: 0, saque: 0, carteiras: 0, tempo: 0, segurando: 0, ondaT: 0, onda: 0, horda: 0, surgeT: 0,
    ganT: 0, mult: 1, reforcoT: 0, vasculhadas: new Set(), hdEm: -1, achouHd: false, vasc: null, vascT: 0, inv: null, carteira: null,
    get ativo() { return m.estado === 'objetivo' || m.estado === 'ganancia' || m.estado === 'extracao'; },
    /** Começa o contrato escolhido com o inventário do refúgio. */
    iniciar(contrato, inv, carteira) {
      m.C = CFG.contrato = contrato; m.inv = inv; m.carteira = carteira;
      AR = { ...CFG.area, ...(contrato.populacao || {}) }; X = { ...CFG.extracao, ...(contrato.extracao || {}) };
      combate.limpar(); Object.assign(m, { abates: 0, saque: 0, carteiras: 0, tempo: 0, segurando: 0, onda: 0, horda: 0, ondaT: 0, ultimoBip: 0, surgeT: AR.surgeCada,
        ganT: 0, mult: 1, reforcoT: 0, achouHd: false, vasc: null, vascT: 0 });
      m.vasculhadas = new Set(); m.progresso = {};
      // o HD fica numa das 3 cabanas mais longe do início (é preciso explorar)
      const longe = mundo.caixas.map((c, i) => [i, c.g.position.length()]).sort((a, b) => b[1] - a[1]).slice(0, 3); m.hdEm = longe[Math.floor(Math.random() * longe.length)][0];
      for (const c of mundo.caixas) { c.aberta = false; c.g.children[1].position.y = 0.44; c.g.children[1].rotation.x = 0; }
      mundo.sinal.visible = false;
      heroi.g.position.set(0, 0, 0); heroi.vida = CFG.heroi.vida; heroi.caido = false; heroi.invul = 0;
      combate.resetarArmas();
      // equipamento: pilhas e sinalizadores levados; munição comprada entra na reserva
      heroi.bateria = 1; heroi.pilhas = inv.pilhas; heroi.sinalizadores = inv.sinalizadores + CFG.kit.sinalizadores; heroi.setLanterna(true);
      combate.arma.muni.espingarda.reserva += inv.cartuchos * CFG.loja.cartuchos.balas; combate.arma.muni.pistola.reserva += inv.pentes * CFG.loja.pente.balas;
      inv.cartuchos = 0; inv.pentes = 0; gravarInventario(inv);
      for (let i = 0; i < AR.vagando; i++) combate.surgir(9, 40);
      m.estado = 'objetivo'; hud.radio(sortear(TEXTOS.dicas), 5);
    },
    abate() {
      if (m.estado === 'objetivo' && m.C.id === 'limpeza') { m.abates++; if (m.abates >= m.C.objetivo) cumprido(); }
      else if (m.estado === 'objetivo') m.abates++;
      else m.horda++;
    },
    ganhoSaque(tipo, sats) { m.saque += sats; if (tipo === 'carteira') m.carteiras++; hud.ganho(tipo, sats); },
    passo(dt) {
      if (!m.ativo) return;
      m.tempo += dt;
      const p = heroi.g.position;
      // caixas na porta das cabanas: na limpeza abrem ao encostar; na recuperação é preciso vasculhar (o HD está numa delas)
      mundo.caixas.forEach((c, i) => {
        if (c.aberta) return; const d = c.g.position.distanceTo(p);
        if (m.C.id === 'recuperacao' && !m.achouHd) {
          if (d < 1.6 && !heroi.caido) {
            if (m.vasc !== i) { m.vasc = i; SOM.vasculhar(); combate.ruido(c.g.position, m.C.ruido, '#8c9cb8'); }
            m.progresso[i] = (m.progresso[i] || 0) + dt; hud.progresso(m.progresso[i] / m.C.vasculhar, 'Vasculhando a cabana…');
            if (m.progresso[i] >= m.C.vasculhar) { abrir(c); m.vasculhadas.add(i); m.vasc = null; hud.progresso(-1);
              if (i === m.hdEm) { m.achouHd = true; SOM.carteira(); hud.radio(sortear(TEXTOS.hd.achou), 3.5, 'Você'); cumprido(); }
              else hud.radio(sortear(TEXTOS.hd.vazio), 2.5, 'Você'); }
          } else if (m.vasc === i) { m.vasc = null; hud.progresso(-1); }
        } else if (d < 1.3) abrir(c);
      });
      // a área segue povoada: quando a população cai, outros chegam pela mata, longe de você
      if (m.estado !== 'extracao' && (m.surgeT -= dt) <= 0 && combate.vivos() < AR.minimo) { combate.surgir(AR.surgeLonge, 34); m.surgeT = AR.surgeCada; }
      if (m.estado === 'ganancia') {
        // ganância: o saque vale mais a cada etapa; reforços chegam cada vez mais rápido
        m.ganT += dt; const etapa = Math.floor(m.ganT / G.etapa), mult = Math.min(G.maximo, 1 + etapa * G.passo);
        if (mult > m.mult) { m.mult = mult; SOM.bip(); hud.radio(sortear(TEXTOS.ganancia), 4); }
        if ((m.reforcoT -= dt) <= 0) { m.reforcoT = G.reforcoCada[Math.min(etapa, G.reforcoCada.length - 1)]; const z = combate.surgir(14, 22); if (z) z.investiga = { x: p.x, z: p.z }; }
      }
      if (m.estado === 'ganancia' || m.estado === 'extracao') {
        const dentro = p.distanceTo(mundo.sinal.position) < X.raio && !heroi.caido;
        if (dentro && m.estado === 'ganancia') { m.estado = 'extracao'; m.ondaT = 1.5; m.segurarTotal = X.segurar; hud.radio(sortear(TEXTOS.radio.filter(r => r.quando === 'espera')).t, 3); }
        if (m.estado === 'extracao') {
          if (dentro) m.segurando = Math.min(X.segurar, m.segurando + dt);
          hud.segurar(m.segurando / X.segurar, dentro, X.segurar);
          if ((m.ondaT -= dt) <= 0) {
            m.ondaT = X.ondaCada; const n = X.porOnda[Math.min(m.onda, X.porOnda.length - 1)]; m.onda++;
            // conta quem já está vindo (horda e quem caça perto do sinal): mapa cheio = menos ondas extras
            const horda = combate.zumbis.filter(z => !z.morto && (z.horda || (z.cacando && z.g.position.distanceTo(mundo.sinal.position) < 20))).length;
            for (let i = 0; i < n && horda + i < X.maxHorda; i++) combate.surgir(11, 17, true);
            if (m.onda % 3 === 0 && dentro) hud.radio(sortear(TEXTOS.radio.filter(r => r.quando === 'espera')).t, 3);
          }
          const resta = Math.ceil(X.segurar - m.segurando); if (dentro && resta <= 5 && resta !== m.ultimoBip) { m.ultimoBip = resta; SOM.bip(); }
          if (m.segurando >= X.segurar) extrair();
        }
      }
    },
    caiu() {
      if (!m.ativo) return;
      m.estado = 'caido'; SOM.derrota(); SOM.pararSinal(); m.carteira.mortes++; gravarCarteira(m.carteira); devolver();
      hud.fim({ venceu: false, frase: sortear(TEXTOS.morte), perdido: m.saque, abates: m.abates + m.horda, tempo: m.tempo, carteira: m.carteira.sats });
    },
  };
  function abrir(c) {
    c.aberta = true; c.g.children[1].position.y = 0.6; c.g.children[1].rotation.x = -1.1; SOM.caixa();
    for (const k in CFG.saque.caixaMunicao) combate.arma.muni[k].reserva += CFG.saque.caixaMunicao[k];
    const s = Math.round(CFG.saque.caixaSats[0] + Math.random() * (CFG.saque.caixaSats[1] - CFG.saque.caixaSats[0]));
    m.saque += s; hud.ganho('caixa', s, 'balas de espingarda e pistola');
  }
  /** Objetivo cumprido: o sinal acende e começa a ganância (ficar mais tempo paga mais). */
  function cumprido() {
    m.estado = 'ganancia'; m.ganT = 0; m.mult = 1; m.reforcoT = G.reforcoCada[0];
    mundo.posicionarSinal(heroi.g.position, X.distancia);
    combate.soltarMunicao(mundo.sinal.position, 2); SOM.sinal();
    hud.radio(sortear(TEXTOS.radio.filter(r => r.quando === 'objetivo')).t + ' Quanto mais você demorar, mais o saque vale.', 5);
  }
  /** O que sobrou de pilhas e sinalizadores volta para o refúgio (o de graça não conta). */
  function devolver() {
    m.inv.pilhas = heroi.pilhas; m.inv.sinalizadores = Math.max(0, heroi.sinalizadores - CFG.kit.sinalizadores); gravarInventario(m.inv);
  }
  function extrair() {
    m.estado = 'pago'; SOM.pararSinal(); SOM.helicoptero(); setTimeout(() => SOM.vitoria(), 1500);
    const saque = Math.round(m.saque * m.mult), total = m.C.pagamento + saque;
    m.carteira.sats += total; m.carteira.contratos++; gravarCarteira(m.carteira); devolver();
    hud.radio(sortear(TEXTOS.radio.filter(r => r.quando === 'chegada')).t, 3);
    hud.fim({ venceu: true, frase: sortear(TEXTOS.pagamento), contrato: m.C.pagamento, saque, mult: m.mult, carteiras: m.carteiras, total, abates: m.abates + m.horda, tempo: m.tempo, carteira: m.carteira.sats });
  }
  return m;
}
