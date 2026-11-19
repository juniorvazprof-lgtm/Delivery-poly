// Telão: mostra o site sendo construído, etapa por etapa, colado na tela 3D da parede do fundo.
// Clicar no telão abre a tela cheia (só o site) com pausar, voltar e avançar.
// O site roda num <iframe sandbox> sem scripts: o HTML do cenário nunca executa código.
import * as T from '../three.module.js';

const BASE_W = 960, BASE_H = 500;
const MARCAS = `
[data-st]{position:relative;transition:outline-color .3s}
[data-st=novo]{outline:5px dashed #3B82F6;outline-offset:-5px;animation:surge .6s ease-out}
[data-st=revisando]{outline:5px dashed #F97316;outline-offset:-5px}
[data-st=corrigir]{outline:5px solid #EF4444;outline-offset:-5px}
[data-st]::after{position:absolute;right:10px;top:10px;padding:4px 10px;border-radius:999px;font:700 13px system-ui,sans-serif;color:#fff}
[data-st=novo]::after{content:"⌨️ acabou de ser escrito";background:#3B82F6}
[data-st=revisando]::after{content:"🔍 em revisão";background:#F97316}
[data-st=corrigir]::after{content:"↩️ precisa de correção";background:#EF4444}
[data-st=aprovado]::after{content:"✅ aprovado";background:#16A34A}
@keyframes surge{from{opacity:0;transform:translateY(12px)}}
.vazio{min-height:100vh;display:grid;place-content:center;gap:14px;text-align:center;font-family:system-ui,sans-serif;background:#F1F5F9;color:#334155;padding:30px}
.vazio h1{margin:0;font-size:34px}.vazio p{margin:0;font-size:19px}
.vazio ol{text-align:left;font-size:19px;margin:0 auto}
.cores{display:flex;gap:12px;justify-content:center}.cores i{width:70px;height:70px;border-radius:14px;box-shadow:0 2px 8px #0003}
.entregue{background:#16A34A;color:#fff;text-align:center;font:700 20px system-ui,sans-serif;padding:12px}`;

const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const classeDe = html => (html.match(/class=['"]([\w-]+)/) || [])[1] || 'secao';

/** HTML do site como ele está depois da etapa `i` (inclusive). */
export function siteNaEtapa(cenario, i) {
  const estilo = (cenario.htmlFinal.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  const secoes = new Map(); let ultima = null, titulo = null, cores = null, tarefas = null;
  for (let k = 0; k <= i; k++) {
    const e = cenario.etapas[k], s = e.saida || {};
    if (s.tarefas) tarefas = s.tarefas;
    if (s.cores) { cores = s.cores; titulo = s.titulo; }
    if (s.html) { ultima = classeDe(s.html); secoes.set(ultima, { html: s.html, st: k === i ? 'novo' : 'escrito' }); }
    if ('aprovado' in s && ultima && secoes.has(ultima)) secoes.get(ultima).st = s.aprovado ? 'aprovado' : 'corrigir';
  }
  const atual = cenario.etapas[i];
  if (atual?.agente === 'revisor' && ultima && !('aprovado' in (atual.saida || {}))) secoes.get(ultima).st = 'revisando';
  const pronto = atual?.id.includes('entrega');
  let corpo;
  if (secoes.size) {
    corpo = [...secoes.values()].map(({ html, st }) => pronto ? html : html.replace(/<section/, `<section data-st="${st === 'escrito' ? '' : st}"`)).join('\n');
    if (pronto) corpo = `<div class="entregue">✅ Site entregue ao cliente!</div>` + corpo;
  } else if (cores) {
    corpo = `<div class="vazio"><p>🎨 O Designer escolheu:</p><h1>${esc(titulo || '')}</h1><div class="cores">${cores.map(c => `<i style="background:${esc(c)}"></i>`).join('')}</div><p>Agora o Programador vai escrever o código…</p></div>`;
  } else if (tarefas) {
    corpo = `<div class="vazio"><h1>📋 Plano do Gerente</h1><ol>${tarefas.map(t => `<li>${esc(t)}</li>`).join('')}</ol><p>Site ainda vazio: ninguém escreveu código.</p></div>`;
  } else {
    corpo = `<div class="vazio"><h1>🚧 Site em construção</h1><p>${i < 0 ? 'Esperando o cliente chegar…' : 'O cliente acabou de fazer o pedido.'}</p></div>`;
  }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${estilo}${MARCAS}</style></head><body>${corpo}</body></html>`;
}

export function criarTelao({ camada, telao, relogio, acoes }) {
  const { cx, cy, z, w, h } = telao.userData.tela;
  const cantos = [new T.Vector3(cx - w / 2, cy + h / 2, z), new T.Vector3(cx + w / 2, cy + h / 2, z), new T.Vector3(cx - w / 2, cy - h / 2, z)];
  const v = new T.Vector3();
  const novoIframe = () => { const f = document.createElement('iframe'); f.setAttribute('sandbox', ''); f.setAttribute('title', 'Site sendo construído'); f.tabIndex = -1; return f; };

  // camada colada no telão 3D
  const mini = document.createElement('div'); mini.className = 'telao-site'; mini.style.width = BASE_W + 'px'; mini.style.height = BASE_H + 'px';
  const fMini = novoIframe(); const capa = document.createElement('button'); capa.className = 'telao-capa'; capa.type = 'button';
  capa.setAttribute('aria-label', 'Abrir o telão em tela cheia'); capa.innerHTML = '<span>⛶ Toque para ver em tela cheia</span>';
  mini.append(fMini, capa); camada.append(mini);

  // tela cheia
  const cheia = document.createElement('div'); cheia.id = 'telaCheia'; cheia.hidden = true;
  cheia.innerHTML = `<header><b class="tc-etapa"></b><span class="tc-nome"></span><button type="button" class="tc-fechar" aria-label="Fechar tela cheia">✕</button></header>
    <div class="tc-quadro"></div><p class="tc-fala"></p>
    <nav><button type="button" data-a="anterior">⏮ Voltar</button><button type="button" data-a="pausar" class="tc-play">⏸ Pausar</button><button type="button" data-a="proxima">Avançar ⏭</button></nav>`;
  const fCheia = novoIframe(); cheia.querySelector('.tc-quadro').append(fCheia); document.body.append(cheia);
  const $c = s => cheia.querySelector(s);

  let html = '';
  function syncPlay() { $c('.tc-play').textContent = relogio.pausado ? '▶ Continuar' : '⏸ Pausar'; }
  relogio.aoMudar?.(syncPlay);
  function abrir() { cheia.hidden = false; fCheia.srcdoc = html; syncPlay(); try { cheia.requestFullscreen?.().catch(() => {}); } catch {} }
  function fechar() { cheia.hidden = true; if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); }
  capa.addEventListener('click', abrir);
  $c('.tc-fechar').addEventListener('click', fechar);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !cheia.hidden) cheia.hidden = true; });
  cheia.querySelector('nav').addEventListener('click', e => {
    const a = e.target.closest('button')?.dataset.a; if (!a) return;
    if (a === 'pausar') { relogio.alternar(); syncPlay(); } else acoes[a]?.();
  });
  addEventListener('keydown', e => {
    if (cheia.hidden) return;
    if (e.key === 'Escape') fechar();
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === ' ' ) { e.stopImmediatePropagation(); e.preventDefault(); if (e.key === ' ') { relogio.alternar(); syncPlay(); } else acoes[e.key === 'ArrowRight' ? 'proxima' : 'anterior']?.(); }
  }, true);

  return {
    get aberto() { return !cheia.hidden; },
    /** Abre a tela cheia com o site já pronto (sem selos de revisão). */
    abrirSitePronto(cenario) {
      html = cenario.htmlFinal; $c('.tc-etapa').textContent = 'RESULTADO'; $c('.tc-nome').textContent = `SITE PRONTO · ${cenario.nome}`; $c('.tc-fala').textContent = 'Este é o site que os agentes construíram.'; abrir();
    },
    /** Mostra o site como está na etapa i. */
    mostrar(cenario, i, etapa, ag) {
      html = siteNaEtapa(cenario, i); fMini.srcdoc = html; if (!cheia.hidden) fCheia.srcdoc = html;
      $c('.tc-etapa').textContent = `ETAPA ${i + 1} de ${cenario.etapas.length}`;
      $c('.tc-nome').textContent = etapa.id.replace(/^\d+-/, '').replace(/-/g, ' ').replace('codar', 'programar').replace('cardapio', 'cardápio').replace(/ \d$/, '').toUpperCase();
      $c('.tc-fala').textContent = ag ? `${ag.nome}: ${etapa.explicacao || etapa.pensamento || ''}` : '';
    },
    /** Cola a camada HTML nos cantos projetados do telão (câmera ortográfica = transformação afim). */
    posicionar(camera, larg, alt) {
      const p = cantos.map(c => { v.copy(c).project(camera); return [(v.x + 1) / 2 * larg, (1 - v.y) / 2 * alt]; });
      const a = (p[1][0] - p[0][0]) / BASE_W, b = (p[1][1] - p[0][1]) / BASE_W, c = (p[2][0] - p[0][0]) / BASE_H, d = (p[2][1] - p[0][1]) / BASE_H;
      mini.style.transform = `matrix(${a},${b},${c},${d},${p[0][0]},${p[0][1]})`;
    },
  };
}
