export const CONTRACT_KINDS = {
  cacada:    { glyph: '☠', color: '#ff4f6a', label: 'CAÇADA' },
  contencao: { glyph: '⛨', color: '#5ff2ff', label: 'CONTENÇÃO' },
  extracao:  { glyph: '◆', color: '#c58bff', label: 'EXTRAÇÃO' },
  sobrevivencia: { glyph: '⌛', color: '#ffd34d', label: 'SOBREVIVÊNCIA' },
};

export const CONTRACTS = [
  // CAÇADA — abater elites ou campeões
  { id: 'cacada-vidro-oco', kind: 'cacada', client: 'Guilda Vidro Oco', name: 'Ninhada Rachada', desc: 'Abater {n} elites que se alimentam do vidro da Fenda.', goal: 3, pay: 120 },
  { id: 'cacada-ferro-mudo', kind: 'cacada', client: 'Corporação Ferro Mudo', name: 'Contrato de Silêncio', desc: 'Abater {n} elites antes que elas aprendam a falar.', goal: 4, pay: 158 },
  { id: 'cacada-sal-frio', kind: 'cacada', client: 'Cartel Sal Frio', name: 'Dívida de Carne', desc: 'Abater {n} elites ou campeões marcados pelo cartel.', goal: 5, pay: 192 },
  { id: 'cacada-veu-partido', kind: 'cacada', client: 'Ordem do Véu Partido', name: 'Sentença Curta', desc: 'Abater {n} elites ou campeões consagrados ao Véu.', goal: 8, pay: 260 },

  // CONTENÇÃO — abater Ressonas em massa
  { id: 'contencao-pedra-surda', kind: 'contencao', client: 'Consórcio Pedra Surda', name: 'Vazão Contida', desc: 'Abater {n} Ressonas e fechar a vazão.', goal: 400, pay: 100 },
  { id: 'contencao-cinza-nova', kind: 'contencao', client: 'Guilda Cinza Nova', name: 'Turno de Cemitério', desc: 'Abater {n} Ressonas durante o turno da noite.', goal: 700, pay: 148 },
  { id: 'contencao-osso-legal', kind: 'contencao', client: 'Banco Osso Legal', name: 'Liquidação de Enxame', desc: 'Abater {n} Ressonas e manter o livro limpo.', goal: 1100, pay: 196 },
  { id: 'contencao-breu-alto', kind: 'contencao', client: 'Corporação Breu Alto', name: 'Cota de Sangue', desc: 'Abater {n} Ressonas até o breu baixar.', goal: 1500, pay: 240 },

  // EXTRAÇÃO — coletar cristais
  { id: 'extracao-veia-fria', kind: 'extracao', client: 'Sindicato Veia Fria', name: 'Colheita Magra', desc: 'Coletar {n} cristais sem quebrar a rota.', goal: 150, pay: 110 },
  { id: 'extracao-luz-torta', kind: 'extracao', client: 'Guilda Luz Torta', name: 'Carga Vadia', desc: 'Coletar {n} cristais e sumir antes da auditoria.', goal: 300, pay: 158 },
  { id: 'extracao-peso-morto', kind: 'extracao', client: 'Companhia Peso Morto', name: 'Frete Sem Nome', desc: 'Coletar {n} cristais para um cliente sem nome.', goal: 450, pay: 204 },
  { id: 'extracao-selo-roxo', kind: 'extracao', client: 'Casa Selo Roxo', name: 'Contrato Fechado', desc: 'Coletar {n} cristais e fechar o selo roxo.', goal: 600, pay: 250 },

  // SOBREVIVÊNCIA — resistir em segundos
  { id: 'sobrevivencia-pulso-neutro', kind: 'sobrevivencia', client: 'Instituto Pulso Neutro', name: 'Teste de Carcaça', desc: 'Resistir {n} segundos dentro do pulso neutro.', goal: 180, pay: 90 },
  { id: 'sobrevivencia-cova-curta', kind: 'sobrevivencia', client: 'Guilda Cova Curta', name: 'Prazo de Guarda', desc: 'Resistir {n} segundos até a guarda render.', goal: 240, pay: 130 },
  { id: 'sobrevivencia-noite-branca', kind: 'sobrevivencia', client: 'Corporação Noite Branca', name: 'Turno Extra', desc: 'Resistir {n} segundos sem chamar reforço.', goal: 330, pay: 176 },
  { id: 'sobrevivencia-fundo-seco', kind: 'sobrevivencia', client: 'Fundo Seco S.A.', name: 'Aposta Final', desc: 'Resistir {n} segundos e sair andando.', goal: 420, pay: 220 },
];

export const CLAUSES = [
  { id: 'sangue-fino', name: 'SANGUE FINO', desc: 'As Ressonas entram com 20% a mais de vida.', bonus: 0.15, mod: { hp: 1.2 } },
  { id: 'ar-rasgado', name: 'AR RASGADO', desc: 'As Ressonas andam mais rápido e surgem em maior número.', bonus: 0.18, mod: { speed: 1.1, spawn: 1.2 } },
  { id: 'mare-cheia', name: 'MARÉ CHEIA', desc: 'Mais Ressonas surgem e o ímã do Mago encolhe.', bonus: 0.2, mod: { spawn: 1.3, magnet: 0.7 } },
  { id: 'pele-queimada', name: 'PELE QUEIMADA', desc: 'Cada golpe recebido abre mais carne.', bonus: 0.25, mod: { dmg: 1.25 } },
  { id: 'sem-abrigo', name: 'SEM ABRIGO', desc: 'Nenhum santuário responde nesta Fenda.', bonus: 0.25, mod: { noShrines: true } },
  { id: 'coracao-seco', name: 'CORAÇÃO SECO', desc: 'Nenhum coração cai dos corpos abatidos.', bonus: 0.3, mod: { noHearts: true } },
  { id: 'ferro-encardido', name: 'FERRO ENCARDIDO', desc: 'Criaturas mais duras, mais rápidas e mais famintas.', bonus: 0.45, mod: { hp: 1.45, speed: 1.25 } },
  { id: 'fenda-aberta', name: 'FENDA ABERTA', desc: 'A Fenda despeja tudo: muito mais vida e muito mais Ressonas.', bonus: 0.6, mod: { hp: 1.6, spawn: 1.5 } },
];
