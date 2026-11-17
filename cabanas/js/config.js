// Cabanas na Floresta · todos os números de equilíbrio ficam aqui.
// Unidades do mundo: 1 ≈ altura do joelho ao ombro do personagem. Tempos em segundos.
export const CFG = {
  sim: { dt: 1 / 60, maxSteps: 5 },
  pixel: { altura: 230, view: 15 },              // altura interna da imagem e altura visível do mundo

  heroi: { vida: 100, velocidade: 3.4, devagar: 0.5, raio: 0.3, invul: 0.35 },
  // passos: correndo faz barulho; com o joystick até a metade você anda devagar e em silêncio
  passos: { cada: 0.55, raio: 5.5 },
  armas: {
    espingarda: { nome: 'Espingarda', pente: 6, reserva: 36, recarga: 1.6, cadencia: 0.55, alcance: 11,
      dano: d => (d < 4 ? 5 : d < 7.5 ? 3.5 : 1.5), largura: 0.6, barulho: 17, coice: 1 },     // perto: 2 tiros por zumbi
    pistola: { nome: 'Pistola', pente: 12, reserva: 60, recarga: 1.15, cadencia: 0.26, alcance: 10,
      dano: d => (d < 8 ? 2 : 1.5), largura: 0.4, barulho: 10, coice: 0.45 },                    // 3 a 4 tiros, mais silenciosa
  },
  // lanterna: ligada, os zumbis te percebem de mais longe; a bateria acaba (uma pilha dura ~2 min ligada)
  lanterna: { visto: 12, escondido: 6.5, duracao: 130, fraca: 0.2, troca: 1.4 },
  sinalizador: { distancia: 6, duracao: 20, luz: 9, chamado: 22 },     // sinalizador de mão: alcance do arremesso, segundos, raio da luz, raio do chiado
  // o que você enxerga: zumbis só aparecem no cone da lanterna, muito perto, no clarão do tiro, perto de janelas ou de sinalizadores
  visao: { alcance: 14, angulo: 0.5, perto: 2.2, olhos: 7, clarao: 9, janela: 3.6, memoria: 0.35 },

  zumbi: { velocidadeHorda: 1.45, vagando: 0.35, ataque: 1.0, alcance: 0.95, esquece: 22 },
  tipos: {
    comum:    { vida: 6, velocidade: 1.15, dano: 14, percepcao: 1, empurrao: 1, pele: '#8c9cb8', roupa: '#2b2f52', olhos: '#e84040', escala: 1, cabeca: 1, braco: 1, bracos: -1.45 },
    // mariposa: magra e pálida, corre para a luz (lanterna ou sinalizador); apagar a lanterna a despista
    mariposa: { vida: 4, velocidade: 2.4, dano: 10, percepcao: 0.6, empurrao: 1.4, pele: '#c5d3e8', roupa: '#3a3f5a', olhos: '#f8e6a0', escala: 0.82, cabeca: 0.9, braco: 1.25, bracos: -2.2,
      atracao: 20, chance: 0.15 },
    // gritador: ao te ver, para e grita, chamando todos num raio grande; mate antes do grito
    gritador: { vida: 7, velocidade: 0.95, dano: 12, percepcao: 1.15, empurrao: 0.7, pele: '#5d6a8a', roupa: '#4a2c2a', olhos: '#c84060', escala: 1.12, cabeca: 1.25, braco: 0.9, bracos: -0.6,
      preparo: 1.3, raioGrito: 24, chance: 0.1, max: 2 },
  },

  // contratos do quadro do Posto 9; a área é a mesma (mesma semente), o objetivo muda
  contratos: {
    limpeza: { id: 'limpeza', area: 'Acampamento Pinheiro', tipo: 'Limpeza', objetivo: 35, risco: 'Médio', pagamento: 5500, descricao: n => `Abater ${n} zumbis e extrair` },
    recuperacao: { id: 'recuperacao', area: 'Acampamento Pinheiro', tipo: 'Recuperação', objetivo: 1, risco: 'Médio', pagamento: 4800, descricao: () => 'Achar o HD em uma das cabanas e extrair', vasculhar: 3, ruido: 4,
      populacao: { vagando: 18, minimo: 10 }, extracao: { segurar: 18, maxHorda: 9 } },   // missão de busca: área menos cheia e extração mais curta
  },
  area: { semente: 1977, mundo: 34, vagando: 26, minimo: 16, surgeLonge: 16, surgeCada: 6 },   // zumbis vagando desde o início; quando caem abaixo do mínimo, outros chegam pela mata

  extracao: {
    segurar: 25, raio: 3.2, distancia: 22,         // segundos no ponto, raio do ponto, distância do jogador ao acender
    ondaCada: 4, porOnda: [2, 3, 3, 4, 4, 5], maxHorda: 16,
  },
  // ganância: depois de cumprir o objetivo, cada etapa que você demora para entrar no sinal multiplica o saque
  ganancia: { etapa: 40, passo: 0.25, maximo: 2.5, reforcoCada: [7, 5.5, 4.5, 3.5, 3] },
  saque: {
    moeda: { chance: 0.38, sats: [40, 130] }, municao: { chance: 0.3, balas: { espingarda: 3, pistola: 6 } }, carteiraFria: { chance: 0.05, sats: [600, 1500] },
    pilha: { chance: 0.06 },
    caixaMunicao: { espingarda: 8, pistola: 14 }, caixaSats: [80, 260], ima: 1.4,
  },
  // loja do Seu Bento, no refúgio; o que você compra fica guardado até usar
  loja: {
    pilha: { nome: 'Pilha', preco: 250 },
    sinalizador: { nome: 'Sinalizador de mão', preco: 400 },
    cartuchos: { nome: '12 cartuchos', preco: 350, arma: 'espingarda', balas: 12 },
    pente: { nome: '24 balas de pistola', preco: 300, arma: 'pistola', balas: 24 },
  },
  kit: { sinalizadores: 1 },                       // todo contrato sai com 1 sinalizador de graça
};
// contrato em andamento (a missão e a interface leem daqui)
CFG.contrato = CFG.contratos.limpeza;
