// Cabanas na Floresta · todos os números de equilíbrio ficam aqui.
// Unidades do mundo: 1 ≈ altura do joelho ao ombro do personagem. Tempos em segundos.
export const CFG = {
  sim: { dt: 1 / 60, maxSteps: 5 },
  pixel: { altura: 230, view: 15 },              // altura interna da imagem e altura visível do mundo

  heroi: { vida: 100, velocidade: 3.4, raio: 0.3, invul: 0.35 },
  armas: {
    espingarda: { nome: 'Espingarda', pente: 6, reserva: 36, recarga: 1.6, cadencia: 0.55, alcance: 11,
      dano: d => (d < 4 ? 5 : d < 7.5 ? 3.5 : 1.5), largura: 0.6, barulho: 17, coice: 1 },     // perto: 2 tiros por zumbi
    pistola: { nome: 'Pistola', pente: 12, reserva: 60, recarga: 1.15, cadencia: 0.26, alcance: 10,
      dano: d => (d < 8 ? 2 : 1.5), largura: 0.4, barulho: 10, coice: 0.45 },                    // 4 tiros, mais silenciosa
  },
  lanterna: { visto: 12, escondido: 6.5 },        // a que distância os zumbis te percebem (lanterna ligada / desligada)
  // o que você enxerga: zumbis só aparecem no cone da lanterna, muito perto, no clarão do tiro ou perto de uma janela acesa
  visao: { alcance: 14, angulo: 0.5, perto: 2.2, olhos: 7, clarao: 9, janela: 3.6, memoria: 0.35 },

  zumbi: { vida: 6, velocidade: 1.15, velocidadeHorda: 1.45, vagando: 0.35, dano: 14, ataque: 1.0, alcance: 0.95, esquece: 22 },

  contrato: {
    id: 'pinheiro', area: 'Acampamento Pinheiro', tipo: 'Limpeza', objetivo: 35, risco: 'Médio', pagamento: 5500,
    semente: 1977, mundo: 34,                      // metade do lado do mapa
    vagando: 26, minimo: 16, surgeLonge: 16, surgeCada: 6,   // zumbis vagando pelo mapa desde o início; quando caem abaixo do mínimo, outros chegam pela mata
  },
  extracao: {
    segurar: 25, raio: 3.2, distancia: 22,         // segundos no ponto, raio do ponto, distância do jogador ao acender
    ondaCada: 4, porOnda: [2, 3, 3, 4, 4, 5], maxHorda: 16,
  },
  saque: {
    moeda: { chance: 0.38, sats: [40, 130] }, municao: { chance: 0.35, balas: { espingarda: 3, pistola: 6 } }, carteiraFria: { chance: 0.05, sats: [600, 1500] },
    caixas: 5, caixaMunicao: { espingarda: 8, pistola: 14 }, caixaSats: [80, 260], ima: 1.4,
  },
  cotacao: { base: 100_000_000, variacao: 0.04 },  // sats por bitcoin (fixo) e oscilação fictícia do "valor de troca" no refúgio
};
