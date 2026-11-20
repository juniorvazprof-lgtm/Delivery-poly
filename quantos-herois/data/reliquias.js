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
  // Arqueiro
  flechasEnvenenadas: { raridade: 'rara', nome: 'Flechas Envenenadas', classe: 'arqueiro', preco: 45, desc: 'Flechas envenenam: 4 de dano/s por 4 s', mod: { queimaDps: 4, queimaDur: 4 } },
  aljavaFarta:        { raridade: 'rara', nome: 'Aljava Farta', classe: 'arqueiro', preco: 45, desc: 'Tiro Certeiro a cada 2 tiros em vez de 4', mod: { certeiroMenos: 2 } },
  olhoDeAguia:        { raridade: 'comum', nome: 'Olho de Águia', classe: 'arqueiro', preco: 35, desc: '+25% de alcance e +15% de dano', mod: { alcanceMult: 1.25, danoMult: 1.15 } },
  // Clérigo
  bencaoEmArea:       { raridade: 'rara', nome: 'Bênção em Área', classe: 'clerigo', preco: 50, desc: 'A cura também atinge aliados perto do alvo (metade)', mod: { curaArea: 10 } },
  preceFervorosa:     { raridade: 'comum', nome: 'Prece Fervorosa', classe: 'clerigo', preco: 35, desc: '+40% de cura', mod: { curaMult: 1.4 } },
  ressurreicaoDivina: { raridade: 'rara', nome: 'Ressurreição Divina', classe: 'clerigo', preco: 55, desc: 'Uma vez por batalha, o primeiro herói a cair volta com 40% da vida', mod: { reviverUmaVez: 0.4 } },
  // Família (vale para todas as classes da família)
  estandarteDeGuerra: { raridade: 'rara', nome: 'Estandarte de Guerra', familia: 'Marcial', classe: 'familia', preco: 60, desc: 'Marciais (Guerreiro, Guardião, Arqueiro): +10% de dano e +10% de vida', mod: { danoMult: 1.1, pvMult: 1.1 } },
  grimorioAntigo:     { raridade: 'rara', nome: 'Grimório Antigo', familia: 'Arcano', classe: 'familia', preco: 55, desc: 'Arcanos (Piromante): atacam 20% mais rápido', mod: { intervaloMult: 0.8 } },
  relicarioSagrado:   { raridade: 'rara', nome: 'Relicário Sagrado', familia: 'Divino', classe: 'familia', preco: 55, desc: 'Todos os heróis regeneram 1% da vida por segundo se houver um Clérigo no time', mod: { regenPct: 0.01 } },
};
