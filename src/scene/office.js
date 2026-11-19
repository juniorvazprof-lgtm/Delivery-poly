// Escritório low poly: chão, paredes, 6 mesas com monitor, sala de reunião, copa, recepção, telão e kanban.
// Tudo com primitivas (caixas, cilindros, cones). Coordenadas: x para a direita, z para a frente (para o público).
import * as T from '../three.module.js';

const mat = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, flatShading: true, ...o });
const caixa = (w, h, d, m, x, y, z) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; return b; };

// lugares do escritório (o diretor usa estes pontos para mover os bonecos)
export const MESAS = {
  gerente: [-6, -3], designer: [0, -3], programador: [6, -3],
  revisor: [-6, 2], analista: [0, 2], suporte: [6, 2],
};
export const PONTOS = {
  cafe: [0.5, 6.4], reuniao: [-7.6, 6.2], recepcao: [8.2, 5.6], entrada: [11.2, 6.6], telao: [-5, -6.2], kanban: [5, -6.2],
};

export function criarEscritorio(scene) {
  const M = {
    chao: mat('#E9DCC4'), parede: mat('#F7F3EC'), rodape: mat('#C9B89A'), madeira: mat('#D9B98C'), madeiraEsc: mat('#A8845A'),
    metal: mat('#8A93A6'), tela: mat('#1E2333'), telaLigada: new T.MeshBasicMaterial({ color: '#7FB2FF' }), vidro: mat('#BFE3F5', { transparent: true, opacity: 0.35 }),
    sofa: mat('#6C8EBF'), planta: mat('#5FA463'), vaso: mat('#C77D4E'), cafe: mat('#7A5236'), branco: mat('#FFFFFF'),
  };
  const g = new T.Group(); scene.add(g);
  // chão com tapetes por área
  const chao = new T.Mesh(new T.BoxGeometry(26, 0.2, 18), M.chao); chao.position.y = -0.1; chao.receiveShadow = true; g.add(chao);
  const tapete = (w, d, x, z, c) => { const t = new T.Mesh(new T.BoxGeometry(w, 0.04, d), mat(c)); t.position.set(x, 0.02, z); t.receiveShadow = true; g.add(t); };
  tapete(6, 3.6, -7.6, 6.4, '#D7E3F1'); tapete(4.6, 3.2, 0.5, 6.4, '#F1E0C9'); tapete(4.2, 3.2, 8.4, 6.2, '#E3F1DA');
  // paredes do fundo e da esquerda, baixas para a câmera ver dentro
  g.add(caixa(26, 3.2, 0.3, M.parede, 0, 1.6, -9), caixa(0.3, 3.2, 18, M.parede, -13, 1.6, 0), caixa(26, 0.25, 0.32, M.rodape, 0, 0.12, -8.84));
  // divisória de vidro da sala de reunião
  g.add(caixa(0.12, 2.4, 3.8, M.vidro, -4.4, 1.2, 6.4), caixa(5.2, 2.4, 0.12, M.vidro, -7.6, 1.2, 4.5));

  // mesa de trabalho com monitor, teclado e cadeira (devolve o material da tela para acender quando o agente trabalha)
  const telas = {};
  for (const [quem, [x, z]] of Object.entries(MESAS)) {
    const m = new T.Group(); m.position.set(x, 0, z);
    m.add(caixa(2.6, 0.12, 1.3, M.madeira, 0, 0.86, 0));
    for (const [px, pz] of [[-1.18, -0.55], [1.18, -0.55], [-1.18, 0.55], [1.18, 0.55]]) m.add(caixa(0.1, 0.86, 0.1, M.madeiraEsc, px, 0.43, pz));
    const telaMat = M.tela.clone(); telas[quem] = telaMat;
    m.add(caixa(1.0, 0.62, 0.06, M.metal, 0, 1.3, -0.45), caixa(0.9, 0.5, 0.02, telaMat, 0, 1.31, -0.41), caixa(0.12, 0.36, 0.12, M.metal, 0, 1.03, -0.48));
    m.add(caixa(0.8, 0.04, 0.26, M.metal, 0, 0.94, 0.1));
    // cadeira na frente da mesa
    m.add(caixa(0.7, 0.1, 0.7, M.sofa, 0, 0.55, 1.05), caixa(0.7, 0.7, 0.1, M.sofa, 0, 0.95, 1.4), caixa(0.08, 0.5, 0.08, M.metal, 0, 0.27, 1.05));
    g.add(m);
  }
  // sala de reunião: mesa redonda e cadeiras
  const mesaR = new T.Mesh(new T.CylinderGeometry(1.2, 1.2, 0.1, 10), M.madeira); mesaR.position.set(-8, 0.8, 6.6); mesaR.castShadow = true; g.add(mesaR);
  g.add(caixa(0.16, 0.8, 0.16, M.madeiraEsc, -8, 0.4, 6.6));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; g.add(caixa(0.6, 0.5, 0.6, M.sofa, -8 + Math.cos(a) * 1.7, 0.25, 6.6 + Math.sin(a) * 1.7)); }
  // copa: balcão, máquina de café, garrafa d'água
  g.add(caixa(3.2, 1.0, 0.9, M.madeiraEsc, 0.5, 0.5, 7.8), caixa(0.6, 0.7, 0.5, M.metal, -0.4, 1.35, 7.8), caixa(0.2, 0.15, 0.2, M.cafe, -0.4, 1.1, 7.45));
  const galao = new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 0.6, 8), M.vidro); galao.position.set(1.4, 1.3, 7.8); g.add(galao);
  // recepção: balcão curvo e plaquinha
  g.add(caixa(2.8, 1.1, 0.8, M.madeira, 8.6, 0.55, 4.6), caixa(0.8, 0.5, 0.06, M.branco, 8.6, 1.4, 4.24));
  // plantas nos cantos
  for (const [x, z] of [[-12, -8], [12, -8], [-12, 8], [4, 8]]) {
    g.add(caixa(0.6, 0.6, 0.6, M.vaso, x, 0.3, z));
    const f = new T.Mesh(new T.IcosahedronGeometry(0.6, 0), M.planta); f.position.set(x, 1.0, z); f.castShadow = true; g.add(f);
  }
  // telão na parede do fundo (o site aparece numa camada HTML posicionada sobre ele) e kanban
  const telao = caixa(6.2, 3.4, 0.12, M.tela, -5, 2.0, -8.8); g.add(telao);
  const kanban = caixa(5.4, 2.6, 0.08, M.branco, 5, 1.9, -8.8); g.add(kanban);
  const coluna = (x, c) => g.add(caixa(1.6, 2.3, 0.02, mat(c), x, 1.9, -8.74));
  coluna(3.3, '#FDE9E7'); coluna(5, '#FEF6DA'); coluna(6.7, '#E3F5E1');
  // porta de entrada à direita
  g.add(caixa(0.2, 2.4, 1.6, mat('#B48A5E'), 12.9, 1.2, 6.6));

  return { grupo: g, telas, telao, kanban, telaLigada: M.telaLigada };
}
