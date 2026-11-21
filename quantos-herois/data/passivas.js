// Passivas: permanentes na run, compradas uma vez cada no acampamento.
// Mais caras que relíquias; efeito de batalha (alvo + mod) ou de run (chave + valor).
export const PASSIVAS = {
  pactoDoPote: {
    nome: 'Pacto do Pote', icone: '💰', preco: 120,
    desc: '+15% em todo ouro ganho (pote) durante a run',
    efeito: { tipo: 'run', chave: 'multPote', valor: 1.15 },
  },
  contadorDeMoedas: {
    nome: 'Contador de Moedas', icone: '🪙', preco: 100,
    desc: 'Ganha 8% do ouro guardado ao fim de cada rodada (teto de 15 moedas)',
    efeito: { tipo: 'run', chave: 'juros', valor: 0.08 },
  },
  recrutadorExperiente: {
    nome: 'Recrutador Experiente', icone: '📜', preco: 140,
    desc: 'Heróis custam 15% menos no recrutamento',
    efeito: { tipo: 'run', chave: 'descontoRecrutar', valor: 0.15 },
  },
  folhaDePagamento: {
    nome: 'Folha de Pagamento', icone: '📋', preco: 90,
    desc: 'Soldo por herói enviado cai 1 moeda (mínimo 0)',
    efeito: { tipo: 'run', chave: 'soldoMenos', valor: 1 },
  },
  enfermariaDeCampanha: {
    nome: 'Enfermaria de Campanha', icone: '⛑️', preco: 80,
    desc: 'Heróis desmaiados voltam 1 rodada antes',
    efeito: { tipo: 'run', chave: 'desmaioMenos', valor: 1 },
  },
  muralhaDaBase: {
    nome: 'Muralha da Base', icone: '🏰', preco: 110,
    desc: 'A base recupera 4 de vida ao vencer cada rodada',
    efeito: { tipo: 'run', chave: 'curaBasePorRodada', valor: 4 },
  },
  treinoPesado: {
    nome: 'Treino Pesado', icone: '💪', preco: 160,
    desc: 'Todos os heróis causam +12% de dano',
    efeito: { tipo: 'batalha', alvo: 'todas', mod: { danoMult: 1.12 } },
  },
  armaduraDePlacas: {
    nome: 'Armadura de Placas', icone: '🛡️', preco: 150,
    desc: 'Todos os heróis recebem 8% menos dano',
    efeito: { tipo: 'batalha', alvo: 'todas', mod: { reducaoDanoMais: 0.08 } },
  },
  cadenciaDeBatalha: {
    nome: 'Cadência de Batalha', icone: '⚡', preco: 180,
    desc: 'Todos os heróis atacam 8% mais rápido',
    efeito: { tipo: 'batalha', alvo: 'todas', mod: { intervaloMult: 0.92 } },
  },
  bencaoDuradoura: {
    nome: 'Bênção Duradoura', icone: '✨', preco: 130,
    desc: 'Todo o time regenera 0,8% da vida por segundo',
    efeito: { tipo: 'batalha', alvo: 'todas', mod: { regenPct: 0.008 } },
  },
};
