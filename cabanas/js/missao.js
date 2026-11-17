// Missão: o contrato (limpeza), a extração com horda e o pagamento em sats.
// Estados: contrato → limpeza → extracao → (pago | caido).
import { CFG } from './config.js';
import { TEXTOS, sortear } from './textos.js';

const CHAVE = 'cabanas.carteira';
export function lerCarteira() {
  try { const c = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (c && Number.isFinite(c.sats) && c.sats >= 0) return { sats: Math.floor(c.sats), contratos: c.contratos | 0, mortes: c.mortes | 0 }; } catch { /* sem armazenamento */ }
  return { sats: 0, contratos: 0, mortes: 0 };
}
function gravarCarteira(c) { try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch { /* sem armazenamento */ } }

export function criarMissao({ mundo, heroi, combate, hud }) {
  const C = CFG.contrato, X = CFG.extracao;
  const m = {
    estado: 'contrato', surgeT: 0, abates: 0, saque: 0, carteiras: 0, tempo: 0, segurando: 0, ondaT: 0, onda: 0, horda: 0,
    carteira: lerCarteira(),
    iniciar() {
      combate.limpar(); m.abates = 0; m.saque = 0; m.carteiras = 0; m.tempo = 0; m.segurando = 0; m.onda = 0; m.horda = 0; m.ondaT = 0; m.surgeT = C.surgeCada;
      for (const c of mundo.caixas) { c.aberta = false; c.g.children[1].position.y = 0.44; c.g.children[1].rotation.x = 0; }
      mundo.sinal.visible = false;
      heroi.g.position.set(0, 0, 0); heroi.vida = CFG.heroi.vida; heroi.caido = false; heroi.invul = 0; heroi.setLanterna(true);
      Object.assign(combate.arma, { pente: CFG.arma.pente, reserva: CFG.arma.reserva, espera: 0, recarregando: 0 });
      for (let i = 0; i < C.inicio; i++) combate.surgir(10, 30);
      m.estado = 'limpeza'; hud.radio(sortear(TEXTOS.dicas), 5);
    },
    abate() {
      if (m.estado === 'limpeza') { m.abates++; if (m.abates >= C.objetivo) acender(); }
      else if (m.estado === 'extracao') m.horda++;
    },
    ganhoSaque(tipo, sats) { m.saque += sats; if (tipo === 'carteira') m.carteiras++; hud.ganho(tipo, sats); },
    passo(dt) {
      if (m.estado !== 'limpeza' && m.estado !== 'extracao') return;
      m.tempo += dt;
      // caixas de suprimento: abrem quando o jogador encosta
      for (const c of mundo.caixas) if (!c.aberta && c.g.position.distanceTo(heroi.g.position) < 1.3) {
        c.aberta = true; c.g.children[1].position.y = 0.6; c.g.children[1].rotation.x = -1.1;
        combate.arma.reserva += CFG.saque.caixaMunicao; const s = Math.round(CFG.saque.caixaSats[0] + Math.random() * (CFG.saque.caixaSats[1] - CFG.saque.caixaSats[0]));
        m.saque += s; hud.ganho('caixa', s, CFG.saque.caixaMunicao);
      }
      if (m.estado === 'limpeza') {
        // mantém a área povoada até o objetivo, sem passar do que falta matar
        const faltam = C.objetivo - m.abates;
        if ((m.surgeT -= dt) <= 0 && combate.vivos() < Math.min(C.vivosNoMapa, faltam)) {
          // grupo: surgem juntos, um deles já vem caçando
          const n = C.grupo[0] + Math.floor(Math.random() * (C.grupo[1] - C.grupo[0] + 1)), z0 = combate.surgir(C.surgeLonge, 30);
          if (z0) { z0.cacando = true; for (let i = 1; i < n; i++) combate.surgirPerto(z0.g.position); }
          m.surgeT = C.surgeCada;
        }
      } else {
        const dentro = heroi.g.position.distanceTo(mundo.sinal.position) < X.raio && !heroi.caido;
        if (dentro) m.segurando = Math.min(X.segurar, m.segurando + dt);
        hud.segurar(m.segurando / X.segurar, dentro);
        // ondas da horda: começam quando o sinal acende e apertam enquanto se espera
        if ((m.ondaT -= dt) <= 0) {
          m.ondaT = X.ondaCada; const n = X.porOnda[Math.min(m.onda, X.porOnda.length - 1)]; m.onda++;
          for (let i = 0; i < n && combate.vivos() < X.maxHorda; i++) combate.surgir(11, 17, true);
          if (m.onda % 3 === 0 && dentro) hud.radio(sortear(TEXTOS.radio.filter(r => r.quando === 'espera')).t, 3);
        }
        if (m.segurando >= X.segurar) extrair();
      }
    },
    caiu() {
      if (m.estado !== 'limpeza' && m.estado !== 'extracao') return;
      m.estado = 'caido'; m.carteira.mortes++; gravarCarteira(m.carteira);
      hud.fim({ venceu: false, frase: sortear(TEXTOS.morte), perdido: m.saque, abates: m.abates, tempo: m.tempo, carteira: m.carteira.sats });
    },
  };
  function acender() {
    m.estado = 'extracao'; mundo.posicionarSinal(heroi.g.position, X.distancia); m.ondaT = 2;
    combate.soltarMunicao(mundo.sinal.position, 2);   // suprimento no sinal: recompensa quem corre para a extração
    hud.radio(sortear(TEXTOS.radio.filter(r => r.quando === 'objetivo')).t, 4);
  }
  function extrair() {
    m.estado = 'pago';
    const total = C.pagamento + m.saque; m.carteira.sats += total; m.carteira.contratos++; gravarCarteira(m.carteira);
    hud.radio(sortear(TEXTOS.radio.filter(r => r.quando === 'chegada')).t, 3);
    hud.fim({ venceu: true, frase: sortear(TEXTOS.pagamento), contrato: C.pagamento, saque: m.saque, carteiras: m.carteiras, total, abates: m.abates + m.horda, tempo: m.tempo, carteira: m.carteira.sats });
  }
  return m;
}
