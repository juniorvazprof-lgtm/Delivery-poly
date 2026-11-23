// As 10 rodadas da run. inimigos: [tipo, quantidade, { chegada: [min, max] segundos }]
import { RODADAS_NOVAS } from './viloes-novos.js';
// Rodadas antigas (só goblins e slimes), mantidas para referência
export const RODADAS_ANTIGAS = [
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
// Rodadas em uso: as novas, com goblins arqueiros, ogros, morcegos e xamãs
export const RODADAS = RODADAS_NOVAS;

// Economia da run — configuração "Q" do relatório design/balance/relatorio-economia.md
export const ECONOMIA = {
  ouroInicial: 40,
  elencoInicial: { guerreiro: 2, guardiao: 1, piromante: 1 },
  vidaBase: 30,                               // perder tira vida da base conforme os monstros que sobraram
  danoBase: { goblin: 1, slimePequeno: 1, slimeMedio: 2, slime: 3, reiSlime: 10 }, // dano à base por monstro restante
  danoBaseMinimo: 3,
  danoBaseMaximo: 12,                         // uma derrota nunca tira mais que isso (são ~3 derrotas para perder a jornada)
  multAbate: 0.2,                             // moedas dos monstros enchem o POTE: VILOES[tipo].ouro × multAbate
  bonusVitoria: (rodada) => 16 + 6 * rodada,  // somado ao pote ao vencer
  multEstrelas: { 1: 0.4, 2: 1.2, 3: 3.0 },   // o pote inteiro é multiplicado pelas estrelas
  soldo: 2,                                   // ouro por herói enviado, pago antes da luta
  inflacao: 0.25,                             // cada herói recrutado da mesma classe fica 25% mais caro
  rodadasDesmaio: 2,
  limiteEstrelas: { tres: 1.0, duas: 1.5 },   // 3★ até o ideal; 2★ até 150% do ideal; 1★ só vencer
  // duas lutas por rodada: a "perigosa" tem mais monstros e paga mais
  perigosa: { multInimigos: 1.5, multPremio: 1.8, multIdeal: 1.4 },
  // baú de relíquias (escolha 1 de 3, grátis): sempre depois de R3, R6 e R9; 30% de chance ao vencer com 3★
  bau: { rodadas: [3, 6, 9], chance3Estrelas: 0.3 },
  reliquiaNaLoja: 1,                          // relíquias à venda no acampamento
};

// ---------- Depois do Rei Slime: 4 rodadas extras e o modo infinito ----------
export const RODADAS_EXTRAS = [
  { n: 11, nome: 'Fortaleza goblin', inimigos: [['ogro', 3], ['goblinArqueiro', 8], ['xamaGoblin', 2], ['goblin', 10, { chegada: [0, 5] }]] },
  { n: 12, nome: 'Céu de morcegos', inimigos: [['slime', 4], ['morcego', 14, { chegada: [0, 4] }], ['goblinArqueiro', 6], ['ogro', 2]] },
  { n: 13, nome: 'Marcha dos ogros', inimigos: [['ogro', 5], ['xamaGoblin', 3], ['morcego', 10], ['goblin', 12, { chegada: [0, 6] }]] },
  { n: 14, nome: 'Os Reis Gêmeos', chefe: true, titulo: 'Os Reis Gêmeos', descricao: 'Dois reis slime e a guarda de elite.',
    inimigos: [['reiSlime', 2], ['ogro', 2], ['xamaGoblin', 2], ['goblinArqueiro', 8]] },
];
// Modo infinito (rodada 15+): ciclo das rodadas extras, cada vez mais fortes e numerosas; chefe a cada 5 rodadas.
export function rodadaInfinita(r) {
  const k = r - 14; // 1, 2, 3...
  const base = RODADAS_EXTRAS[(k - 1) % 4];
  const forca = +(1.15 + 0.16 * k).toFixed(2), mais = 1 + 0.08 * k;
  const chefe = k % 5 === 0; // 19, 24, 29...
  const lista = chefe ? RODADAS_EXTRAS[3].inimigos : base.inimigos;
  return { n: r, nome: chefe ? `Chefe infinito ${r}` : `Onda infinita ${r}`, chefe, infinito: true,
    titulo: chefe ? `Chefe da onda ${r}` : undefined, descricao: chefe ? 'Os reis voltam mais fortes.' : undefined,
    inimigos: lista.map(([t, q, o = {}]) => [t, t === 'reiSlime' ? q : Math.round(q * mais), { ...o, forca }]) };
}
// rodadas extras 11–13 vêm reforçadas (vida e dano); a 14 é o chefe e fica como está
function reforcar(def, forca) { return { ...def, inimigos: def.inimigos.map(([t, q, o = {}]) => [t, q, { ...o, forca }]) }; }
export function definicaoRodada(r) {
  if (r <= 10) return RODADAS[r - 1];
  if (r <= 13) return reforcar(RODADAS_EXTRAS[r - 11], +(1.2 + 0.12 * (r - 11)).toFixed(2));
  if (r === 14) return RODADAS_EXTRAS[3];
  return rodadaInfinita(r);
}
