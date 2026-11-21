// Monstros novos e as 10 rodadas refeitas misturando goblins, slimes e os novos.
// Mesmo formato de data/viloes.js e data/rodadas.js.
export const VILOES_NOVOS = {
  goblinArqueiro: {
    nome: 'Goblin Arqueiro', pv: 18, dano: 6, intervalo: 1.0, alcance: 30, velocidade: 16, raio: 1.5, ouro: 3,
    comportamento: 'flanqueia',
    projetil: { velocidade: 85, tipo: 'flecha' },
  },
  ogro: {
    nome: 'Ogro', pv: 260, dano: 22, intervalo: 1.6, alcance: 6, velocidade: 7, raio: 3.6, ouro: 12,
    reducaoDano: 0.2,
    habilidades: [{ tipo: 'golpeFirme', aCada: 3, mult: 2.0, raioArea: 6 }],
  },
  morcego: {
    nome: 'Morcego', pv: 12, dano: 4, intervalo: 0.5, alcance: 4, velocidade: 26, raio: 1.2, ouro: 1,
    comportamento: 'flanqueia',
  },
  xamaGoblin: {
    nome: 'Xamã Goblin', pv: 40, dano: 3, intervalo: 1.5, alcance: 26, velocidade: 10, raio: 1.8, ouro: 5,
    projetil: { velocidade: 70, tipo: 'luz' },
    habilidades: [{ tipo: 'curar', valor: 14, alcance: 28, recarga: 3.5, siMesmo: false }],
  },
};

export const RODADAS_NOVAS = [
  { n: 1,  nome: 'Patrulha goblin',     inimigos: [['goblin', 6]] },
  { n: 2,  nome: 'Gosma e flechas',     inimigos: [['slime', 1], ['goblinArqueiro', 3]] },
  { n: 3,  nome: 'Bando misto',         inimigos: [['goblin', 10, { chegada: [0, 5] }], ['morcego', 4, { chegada: [1, 4] }]] },
  { n: 4,  nome: 'Pântano vigiado',     inimigos: [['slime', 2], ['goblinArqueiro', 4], ['xamaGoblin', 1]] },
  { n: 5,  nome: 'Horda e ogro',        inimigos: [['goblin', 14, { chegada: [0, 5] }], ['ogro', 1, { chegada: [2, 3] }]] },
  { n: 6,  nome: 'Poça e xamãs',        inimigos: [['slime', 3], ['xamaGoblin', 2], ['morcego', 6, { chegada: [0, 4] }]] },
  { n: 7,  nome: 'Emboscada aérea',     inimigos: [['morcego', 12, { chegada: [0, 4] }], ['goblinArqueiro', 6], ['ogro', 1]] },
  { n: 8,  nome: 'Exército misto',      inimigos: [['goblin', 20, { chegada: [0, 6] }], ['ogro', 2], ['xamaGoblin', 2]] },
  { n: 9,  nome: 'Mistura nojenta',     inimigos: [['slime', 4], ['goblinArqueiro', 10], ['ogro', 2], ['xamaGoblin', 1]] },
  { n: 10, nome: 'O Rei Slime',         chefe: true,
    inimigos: [['reiSlime', 1], ['goblinArqueiro', 8], ['ogro', 2], ['xamaGoblin', 2], ['goblin', 10, { chegada: [0, 5] }]] },
];
