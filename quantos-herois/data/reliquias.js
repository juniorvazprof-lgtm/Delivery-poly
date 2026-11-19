// Relíquias: modificadores por classe, lidos pelo motor (core/efeitos.js).
export const RELIQUIAS = {
  espadaAfiada:     { raridade: 'comum', nome: 'Espada Afiada', classe: 'guerreiro', preco: 45, desc: '+15% de dano', mod: { danoMult: 1.15 } },
  irmaosDeArmas:    { raridade: 'comum', nome: 'Irmãos de Armas', classe: 'guerreiro', preco: 40, desc: '+2% de dano por Guerreiro vivo', mod: { danoPorAliadoMesmaClasse: 0.02 } },
  golpeGiratorio:   { raridade: 'rara', nome: 'Golpe Giratório', classe: 'guerreiro', preco: 55, desc: 'O Golpe Firme acerta em área', mod: { golpeFirmeRaio: 7 } },
  escudoReforcado:  { raridade: 'rara', nome: 'Escudo Reforçado', classe: 'guardiao', preco: 40, desc: '+20% de vida', mod: { pvMult: 1.2 } },
  provocacaoLonga:  { raridade: 'rara', nome: 'Provocação Longa', classe: 'guardiao', preco: 35, desc: '+3 s de provocação e +8 m de alcance', mod: { provocarDuracaoMais: 3, provocarRaioMais: 8 } },
  muralha:          { raridade: 'rara', nome: 'Muralha', classe: 'guardiao', preco: 55, desc: 'Aliados perto do Guardião recebem 10% menos dano', mod: { auraReducao: 0.10, auraRaio: 12 } },
  brasaViva:        { raridade: 'rara', nome: 'Brasa Viva', classe: 'piromante', preco: 45, desc: 'Queimadura: 4 de dano/s por 3 s', mod: { queimaDps: 4, queimaDur: 3 } },
  focoArcano:       { raridade: 'comum', nome: 'Foco Arcano', classe: 'piromante', preco: 40, desc: '+20% de raio da explosão', mod: { areaMult: 1.2 } },
  chamaConcentrada: { raridade: 'rara', nome: 'Chama Concentrada', classe: 'piromante', preco: 50, desc: 'Chave antes da batalha: sem área, dano dobrado em um alvo', chave: true, mod: { semArea: true, danoMult: 2 } },
};
