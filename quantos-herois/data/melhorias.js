// Melhorias do baú (escolhe 1 de 3 após vitória). Efeitos de batalha acumulam se escolhidos de novo.
// 12 comuns (peso 10), 8 raras (peso 4), 4 épicas (peso 1).
export const MELHORIAS = {
  // ===== Comuns (peso 10) =====
  laminaAfiada: {
    nome: 'Lâmina Afiada', icone: '🗡️', raridade: 'comum', peso: 10,
    desc: 'Guerreiro: +8% de dano',
    efeito: { tipo: 'batalha', alvo: 'guerreiro', mod: { danoMult: 1.08 } },
  },
  couroCurtido: {
    nome: 'Couro Curtido', icone: '🥋', raridade: 'comum', peso: 10,
    desc: 'Guerreiro: +10% de vida',
    efeito: { tipo: 'batalha', alvo: 'guerreiro', mod: { pvMult: 1.10 } },
  },
  escudoDeTreino: {
    nome: 'Escudo de Treino', icone: '🛡️', raridade: 'comum', peso: 10,
    desc: 'Guardião: +6% de redução de dano',
    efeito: { tipo: 'batalha', alvo: 'guardiao', mod: { reducaoDanoMais: 0.06 } },
  },
  brasaMenor: {
    nome: 'Brasa Menor', icone: '🔥', raridade: 'comum', peso: 10,
    desc: 'Piromante: acertos queimam 2 de dano/s por 2 s',
    efeito: { tipo: 'batalha', alvo: 'piromante', mod: { queimaDps: 2, queimaDur: 2 } },
  },
  flechaCerteira: {
    nome: 'Flecha Certeira', icone: '🏹', raridade: 'comum', peso: 10,
    desc: 'Arqueiro: +10% de dano',
    efeito: { tipo: 'batalha', alvo: 'arqueiro', mod: { danoMult: 1.10 } },
  },
  preceCurta: {
    nome: 'Prece Curta', icone: '🙏', raridade: 'comum', peso: 10,
    desc: 'Clérigo: +12% de cura',
    efeito: { tipo: 'batalha', alvo: 'clerigo', mod: { curaMult: 1.12 } },
  },
  bolsaDeOuro: {
    nome: 'Bolsa de Ouro', icone: '💰', raridade: 'comum', peso: 10,
    desc: 'Ganha 25 de ouro agora',
    efeito: { tipo: 'ouro', valor: 25 },
  },
  reforcoDeFileira: {
    nome: 'Reforço de Fileira', icone: '⚔️', raridade: 'comum', peso: 10,
    desc: 'Recruta 1 Guerreiro grátis',
    efeito: { tipo: 'heroi', classe: 'guerreiro', qtd: 1 },
  },
  balsamoRapido: {
    nome: 'Bálsamo Rápido', icone: '🩹', raridade: 'comum', peso: 10,
    desc: 'Ganha 2 Bandagens',
    efeito: { tipo: 'consumivel', id: 'bandagem', qtd: 2 },
  },
  tonicoRevigorante: {
    nome: 'Tônico Revigorante', icone: '🧪', raridade: 'comum', peso: 10,
    desc: 'Ganha 1 Tônico de Cura',
    efeito: { tipo: 'consumivel', id: 'tonicoCura', qtd: 1 },
  },
  reparosNaBase: {
    nome: 'Reparos na Base', icone: '🔧', raridade: 'comum', peso: 10,
    desc: 'A base recupera 6 de vida',
    efeito: { tipo: 'curarBase', valor: 6 },
  },
  passoLeve: {
    nome: 'Passo Leve', icone: '👣', raridade: 'comum', peso: 10,
    desc: 'Todos os heróis atacam 6% mais rápido',
    efeito: { tipo: 'batalha', alvo: 'todas', mod: { intervaloMult: 0.94 } },
  },

  // ===== Raras (peso 4) =====
  golpeAmplo: {
    nome: 'Golpe Amplo', icone: '🌀', raridade: 'rara', peso: 4,
    desc: 'Guerreiro: o Golpe Firme acerta em área (raio 5)',
    efeito: { tipo: 'batalha', alvo: 'guerreiro', mod: { golpeFirmeRaio: 5 } },
  },
  muralhaViva: {
    nome: 'Muralha Viva', icone: '🧱', raridade: 'rara', peso: 4,
    desc: 'Guardião: aliados a até 10 m recebem 8% menos dano',
    efeito: { tipo: 'batalha', alvo: 'guardiao', mod: { auraReducao: 0.08, auraRaio: 10 } },
  },
  tornadoMenor: {
    nome: 'Tornado Menor', icone: '🌪️', raridade: 'rara', peso: 4,
    desc: 'Piromante: +25% de raio da explosão',
    efeito: { tipo: 'batalha', alvo: 'piromante', mod: { areaMult: 1.25 } },
  },
  chuvaDeFlechas: {
    nome: 'Chuva de Flechas', icone: '🌧️', raridade: 'rara', peso: 4,
    desc: 'Arqueiro: Tiro Certeiro a cada 3 tiros em vez de 4',
    efeito: { tipo: 'batalha', alvo: 'arqueiro', mod: { certeiroMenos: 1 } },
  },
  bencaoAmpla: {
    nome: 'Bênção Ampla', icone: '💫', raridade: 'rara', peso: 4,
    desc: 'Clérigo: a cura também atinge aliados a até 8 m do alvo',
    efeito: { tipo: 'batalha', alvo: 'clerigo', mod: { curaArea: 8 } },
  },
  estandarteMarcial: {
    nome: 'Estandarte Marcial', icone: '🚩', raridade: 'rara', peso: 4,
    desc: 'Marciais: +10% de dano e +10% de vida',
    efeito: { tipo: 'batalha', alvo: 'Marcial', mod: { danoMult: 1.10, pvMult: 1.10 } },
  },
  grimorioRapido: {
    nome: 'Grimório Rápido', icone: '📖', raridade: 'rara', peso: 4,
    desc: 'Arcanos: atacam 15% mais rápido',
    efeito: { tipo: 'batalha', alvo: 'Arcano', mod: { intervaloMult: 0.85 } },
  },
  relicarioMenor: {
    nome: 'Relicário Menor', icone: '🔮', raridade: 'rara', peso: 4,
    desc: 'Divinos: regeneram 0,8% da vida por segundo',
    efeito: { tipo: 'batalha', alvo: 'Divino', mod: { regenPct: 0.008 } },
  },

  // ===== Épicas (peso 1) =====
  furiaDoCampeao: {
    nome: 'Fúria do Campeão', icone: '👑', raridade: 'epica', peso: 1,
    desc: 'Guerreiro: +25% de dano e Golpe Firme acerta em área (raio 6)',
    efeito: { tipo: 'batalha', alvo: 'guerreiro', mod: { danoMult: 1.25, golpeFirmeRaio: 6 } },
  },
  tempestadeArcana: {
    nome: 'Tempestade Arcana', icone: '🌋', raridade: 'epica', peso: 1,
    desc: 'Piromante: +50% de raio e queimadura de 6 de dano/s por 4 s',
    efeito: { tipo: 'batalha', alvo: 'piromante', mod: { areaMult: 1.5, queimaDps: 6, queimaDur: 4 } },
  },
  ressurreicaoMenor: {
    nome: 'Ressurreição Menor', icone: '⚱️', raridade: 'epica', peso: 1,
    desc: 'Clérigo: uma vez por batalha, o primeiro herói a cair volta com 35% da vida',
    efeito: { tipo: 'batalha', alvo: 'clerigo', mod: { reviverUmaVez: 0.35 } },
  },
  cofreDoRei: {
    nome: 'Cofre do Rei', icone: '🏆', raridade: 'epica', peso: 1,
    desc: 'Ganha 90 de ouro agora',
    efeito: { tipo: 'ouro', valor: 90 },
  },
};
