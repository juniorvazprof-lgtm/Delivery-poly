export const VILOES = {
  goblin: { nome: 'Goblin', pv: 22, dano: 7, intervalo: 0.8, alcance: 4.5, velocidade: 20, raio: 1.6, ouro: 2, comportamento: 'flanqueia' },
  slime:  { nome: 'Slime', pv: 125, dano: 12, intervalo: 1.4, alcance: 5, velocidade: 8, raio: 3.2, ouro: 6,
            divide: { em: 'slimeMedio', qtd: 2 }, respingo: { em: 'slimeMedio', max: 4 } },
  slimeMedio: { nome: 'Slime médio', pv: 45, dano: 7, intervalo: 1.2, alcance: 4.5, velocidade: 10, raio: 2.4, ouro: 2,
            divide: { em: 'slimePequeno', qtd: 2 }, respingo: { em: 'slimePequeno', max: 3 } },
  slimePequeno: { nome: 'Slime pequeno', pv: 30, dano: 4, intervalo: 1.0, alcance: 4, velocidade: 12, raio: 1.6, ouro: 1 },
  reiSlime: { nome: 'Rei Slime', pv: 1400, dano: 58, intervalo: 1.6, alcance: 7, velocidade: 6, raio: 6, ouro: 40, chefe: true,
            divide: { em: 'slime', qtd: 3 }, invoca: { tipo: 'goblin', qtd: 7, intervalo: 8, primeiro: 5 } }, // o Rei não respinga; chama ondas de goblins
};
