// As 10 rodadas da run. inimigos: [tipo, quantidade]
export const RODADAS = [
  { n: 1,  nome: 'Patrulha goblin',     inimigos: [['goblin', 6]] },
  { n: 2,  nome: 'Gosma no caminho',    inimigos: [['slime', 1]] },
  { n: 3,  nome: 'Bando goblin',        inimigos: [['goblin', 14]] },
  { n: 4,  nome: 'Pântano',             inimigos: [['slime', 2], ['goblin', 6]] },
  { n: 5,  nome: 'Horda goblin',        inimigos: [['goblin', 24]] },
  { n: 6,  nome: 'Poça de slimes',      inimigos: [['slime', 4]] },
  { n: 7,  nome: 'Emboscada',           inimigos: [['goblin', 18], ['slime', 2]] },
  { n: 8,  nome: 'Exército goblin',     inimigos: [['goblin', 36]] },
  { n: 9,  nome: 'Mistura nojenta',     inimigos: [['slime', 5], ['goblin', 16]] },
  { n: 10, nome: 'O Rei Slime',         inimigos: [['reiSlime', 1], ['goblin', 30]], chefe: true },
];
// Economia
export const ECONOMIA = {
  ouroInicial: 60,
  elencoInicial: { guerreiro: 3, guardiao: 1, piromante: 1 },
  ouroBase: (rodada) => 25 + 6 * rodada,          // por vitória
  multEstrelas: { 1: 1.0, 2: 1.3, 3: 1.7 },
  rodadasDesmaio: 2,
};
