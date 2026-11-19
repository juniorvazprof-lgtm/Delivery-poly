// Quadro de tarefas 3D: cartões (um por parte do site) andam entre "A FAZER", "FAZENDO" e "FEITO" conforme as etapas.
import * as T from '../three.module.js';

const COL = [3.3, 5, 6.7], Y0 = 2.5, DY = 0.62, Z = -8.68;
const CORES = ['#FDE9E7', '#FEF6DA', '#E3F5E1'];

function textura(txt, fundo, borda) {
  const c = document.createElement('canvas'); c.width = 280; c.height = 100; const x = c.getContext('2d');
  x.fillStyle = fundo; x.fillRect(0, 0, 280, 100); x.strokeStyle = borda; x.lineWidth = 8; x.strokeRect(4, 4, 272, 92);
  x.fillStyle = '#1E2333'; x.font = '700 25px system-ui, sans-serif'; x.textBaseline = 'middle';
  const palavras = String(txt).split(' '), linhas = []; let l = '';
  for (const p of palavras) { if ((l + ' ' + p).trim().length > 17 && l) { linhas.push(l); l = p; } else l = (l + ' ' + p).trim(); } linhas.push(l);
  linhas.slice(0, 3).forEach((t, k, a) => x.fillText(t, 16, 50 + (k - (a.length - 1) / 2) * 28));
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

export function criarKanban(scene) {
  const g = new T.Group(); scene.add(g);
  ['A FAZER', 'FAZENDO', 'FEITO'].forEach((n, k) => {
    const c = document.createElement('canvas'); c.width = 280; c.height = 56; const x = c.getContext('2d');
    x.fillStyle = '#1E2333'; x.font = '800 30px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 140, 30);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(new T.PlaneGeometry(1.5, 0.3), new T.MeshBasicMaterial({ map: t, transparent: true })); m.position.set(COL[k], 2.95, Z); g.add(m);
  });
  let cartoes = [];
  const limpar = () => { for (const c of cartoes) { g.remove(c.m); c.m.material.map.dispose(); c.m.material.dispose(); } cartoes = []; };
  return {
    /** Um cartão por parte do site (seção). Descobre sozinho em que etapa cada um começa, é aprovado ou é devolvido. */
    montar(cenario) {
      limpar();
      const tarefas = cenario.etapas.find(e => e.saida?.tarefas)?.saida.tarefas || [];
      const secoes = new Map();
      cenario.etapas.forEach((e, idx) => {
        const s = e.saida || {}, cls = (String(s.html || '').match(/class=['"]([\w-]+)/) || [])[1];
        if (cls) { if (!secoes.has(cls)) secoes.set(cls, { fazendo: idx, feito: Infinity, devolvido: -1 }); secoes.get(cls).ultima = idx; }
        if ('aprovado' in s) { const ult = [...secoes.values()].filter(v => v.feito === Infinity).pop(); if (ult) { if (s.aprovado) ult.feito = idx; else ult.devolvido = idx; } }
      });
      [...secoes.entries()].forEach(([cls, info], k) => {
        const rot = tarefas[k] || cls;
        const m = new T.Mesh(new T.PlaneGeometry(1.4, 0.5), new T.MeshBasicMaterial({ map: textura(rot, '#FFFFFF', '#94A3B8'), transparent: true }));
        m.position.set(COL[0], Y0 - k * DY, Z); m.scale.setScalar(0.01); g.add(m);
        cartoes.push({ m, rot, ...info, i: -1 });
      });
      this.estado(-1);
    },
    /** Posiciona os cartões para a etapa i. */
    estado(i) {
      const cont = [0, 0, 0];
      cartoes.forEach(c => {
        const col = i >= c.feito ? 2 : i >= c.fazendo ? 1 : 0;
        c.vis = i >= 1; c.alvoX = COL[col]; c.alvoY = Y0 - cont[col]++ * DY;
        const devolvido = i === c.devolvido, cor = devolvido ? '#EF4444' : col === 2 ? '#16A34A' : col === 1 ? '#3B82F6' : '#94A3B8';
        if (c.cor !== cor) { c.cor = cor; c.m.material.map.dispose(); c.m.material.map = textura(c.rot, devolvido ? '#FEE2E2' : '#FFFFFF', cor); c.m.material.needsUpdate = true; }
      });
    },
    passo(dt) {
      const k = 1 - Math.exp(-Math.min(dt, 0.1) * 6);
      for (const c of cartoes) {
        c.m.position.x += (c.alvoX - c.m.position.x) * k; c.m.position.y += (c.alvoY - c.m.position.y) * k;
        const e = c.vis ? 1 : 0.01; c.m.scale.x += (e - c.m.scale.x) * k; c.m.scale.y = c.m.scale.x;
      }
    },
  };
}
