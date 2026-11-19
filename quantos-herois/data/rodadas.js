// As 10 rodadas da run. inimigos: [tipo, quantidade, { chegada: [min, max] segundos }]
export const RODADAS = [
  { n: 1,  nome: 'Patrulha goblin',     inimigos: [['goblin', 6]] },
  { n: 2,  nome: 'Gosma no caminho',    inimigos: [['slime', 1]] },
  { n: 3,  nome: 'Bando goblin',        inimigos: [['goblin', 14, { chegada: [0, 5.5] }]] },
  { n: 4,  nome: 'Pântano',             inimigos: [['slime', 2], ['goblin', 6]] },
  { n: 5,  nome: 'Horda goblin',        inimigos: [['goblin', 24, { chegada: [0, 5] }]] },
  { n: 6,  nome: 'Poça de slimes',      inimigos: [['slime', 4]] },
  { n: 7,  nome: 'Emboscada',           inimigos: [['goblin', 18], ['slime', 2]] },
  { n: 8,  nome: 'Exército goblin',     inimigos: [['goblin', 36, { chegada: [0, 6] }]] },
  { n: 9,  nome: 'Mistura nojenta',     inimigos: [['slime', 5], ['goblin', 16]] },
  { n: 10, nome: 'O Rei Slime',         inimigos: [['reiSlime', 1], ['goblin', 18]], chefe: true },
];
// Economia da run (valores iniciais; o simulador de runs ajusta estes números)
export const ECONOMIA = {
  ouroInicial: 40,
  elencoInicial: { guerreiro: 2, guardiao: 1, piromante: 1 },
  vidas: 3,                                   // perder uma rodada custa 1 vida e repete a rodada
  multAbate: 1.0,                             // ouro de cada monstro morto = VILOES[tipo].ouro × multAbate
  bonusVitoria: (rodada) => 10 + 4 * rodada,  // bônus ao vencer, × multiplicador das estrelas
  multEstrelas: { 1: 1.0, 2: 1.3, 3: 1.7 },
  inflacao: 0.10,                             // cada herói recrutado da mesma classe fica 10% mais caro
  rodadasDesmaio: 2,
  // estrelas: 3★ se enviou até o ideal; 2★ até 150% do ideal; 1★ só vencer
  limiteEstrelas: { tres: 1.0, duas: 1.5 },
};
