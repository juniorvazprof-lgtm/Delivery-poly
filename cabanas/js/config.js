// Cabanas na Floresta · todos os números de equilíbrio ficam aqui.
// Unidades do mundo: 1 ≈ altura do joelho ao ombro do personagem. Tempos em segundos.
export const CFG = {
  sim: { dt: 1 / 60, maxSteps: 5 },
  pixel: { altura: 230, view: 15 },              // altura interna da imagem e altura visível do mundo

  heroi: { vida: 100, velocidade: 3.4, raio: 0.3, invul: 0.35 },
  arma: {                                          // espingarda de caça (a da cena original)
    nome: 'Espingarda', pente: 6, reserva: 30, recarga: 1.6, cadencia: 0.42, alcance: 12,
    dano: d => (d < 4.5 ? 3 : d < 8 ? 2 : 1),       // perto derruba com 1 tiro, longe precisa de 3
    largura: 0.55,                                  // tolerância lateral do tiro
    barulho: 16,                                    // raio em que zumbis escutam o tiro
  },
  lanterna: { visto: 12, escondido: 6.5 },        // a que distância os zumbis te percebem (lanterna ligada / desligada)

  zumbi: { vida: 3, velocidade: 1.15, velocidadeHorda: 1.45, vagando: 0.35, dano: 14, ataque: 1.0, alcance: 0.95, esquece: 22 },

  contrato: {
    id: 'pinheiro', area: 'Acampamento Pinheiro', tipo: 'Limpeza', objetivo: 25, risco: 'Médio', pagamento: 4200,
    semente: 1977, mundo: 34,                      // metade do lado do mapa
    vivosNoMapa: 8, inicio: 6,                     // zumbis ao mesmo tempo antes da extração
    surgeLonge: 18, surgeCada: 28, grupo: [2, 3],   // a cada 28 s um grupo de 2 a 3 zumbis surge longe do jogador (é preciso explorar)
  },
  extracao: {
    segurar: 25, raio: 3.2, distancia: 22,         // segundos no ponto, raio do ponto, distância do jogador ao acender
    ondaCada: 4, porOnda: [2, 3, 3, 4, 4, 5], maxHorda: 16,
  },
  saque: {
    moeda: { chance: 0.38, sats: [40, 130] }, municao: { chance: 0.22, balas: 3 }, carteiraFria: { chance: 0.05, sats: [600, 1500] },
    caixas: 5, caixaMunicao: 8, caixaSats: [80, 260], ima: 1.4,
  },
  cotacao: { base: 100_000_000, variacao: 0.04 },  // sats por bitcoin (fixo) e oscilação fictícia do "valor de troca" no refúgio
};
