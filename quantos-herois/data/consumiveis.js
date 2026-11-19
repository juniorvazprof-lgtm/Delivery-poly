export const CONSUMIVEIS = {
  pocaoRessurreicao: { nome: 'Poção de Ressurreição', preco: 30, desc: 'Revive na hora um herói desmaiado' },
  pergaminhoMeteoro: { nome: 'Pergaminho de Meteoro', preco: 35, desc: 'Meteoro no começo da batalha: 60 de dano em área grande', efeito: { dano: 60, raio: 16 } },
  bandagem:          { nome: 'Bandagem', preco: 15, desc: 'Um herói desmaiado volta 1 rodada mais cedo' },
  tonicoCura:        { nome: 'Tônico de Cura', preco: 25, desc: 'Cura 40% da vida de todos os heróis no meio da batalha', efeito: { curaPct: 0.4 } },
};
