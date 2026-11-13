// Bases de item e afixos do Mago mercenário.

export const ITEM_BASES = [
  // cajado — dmg
  { id: 'cajado-cinza', slot: 'cajado', name: 'Cajado Cinza', glyph: '⚚', stat: 'dmg', value: [0.06, 0.10] },
  { id: 'cajado-fendido', slot: 'cajado', name: 'Cajado Fendido', glyph: '⟡', stat: 'dmg', value: [0.08, 0.12] },
  { id: 'cajado-oculto', slot: 'cajado', name: 'Cajado Oculto', glyph: '☽', stat: 'dmg', value: [0.10, 0.15] },
  { id: 'cajado-vexado', slot: 'cajado', name: 'Cajado Vexado', glyph: '♆', stat: 'dmg', value: [0.12, 0.18] },
  { id: 'cajado-abissal', slot: 'cajado', name: 'Cajado Abissal', glyph: '⌘', stat: 'dmg', value: [0.14, 0.22] },
  // manto — hp
  { id: 'manto-rasgado', slot: 'manto', name: 'Manto Rasgado', glyph: '◇', stat: 'hp', value: [10, 15] },
  { id: 'manto-umido', slot: 'manto', name: 'Manto Úmido', glyph: '◈', stat: 'hp', value: [16, 22] },
  { id: 'manto-livido', slot: 'manto', name: 'Manto Lívido', glyph: '❖', stat: 'hp', value: [23, 30] },
  { id: 'manto-taciturno', slot: 'manto', name: 'Manto Taciturno', glyph: '✦', stat: 'hp', value: [31, 38] },
  { id: 'manto-tumular', slot: 'manto', name: 'Manto Tumular', glyph: '⚜', stat: 'hp', value: [38, 45] },
  // amuleto — cd / area
  { id: 'amuleto-osso', slot: 'amuleto', name: 'Amuleto de Osso', glyph: '◈', stat: 'cd', value: [0.03, 0.05] },
  { id: 'amuleto-salmo', slot: 'amuleto', name: 'Amuleto Salmo', glyph: '☽', stat: 'cd', value: [0.05, 0.07] },
  { id: 'amuleto-vexo', slot: 'amuleto', name: 'Amuleto Vexo', glyph: '⟡', stat: 'area', value: [0.05, 0.08] },
  { id: 'amuleto-cindido', slot: 'amuleto', name: 'Amuleto Cindido', glyph: '⚚', stat: 'area', value: [0.09, 0.13] },
  { id: 'amuleto-nefando', slot: 'amuleto', name: 'Amuleto Nefando', glyph: '♆', stat: 'cd', value: [0.08, 0.12] },
  // anel — speed / magnet / crit
  { id: 'anel-tosco', slot: 'anel', name: 'Anel Tosco', glyph: '◇', stat: 'speed', value: [0.03, 0.05] },
  { id: 'anel-ferro', slot: 'anel', name: 'Anel de Ferro Frio', glyph: '❖', stat: 'magnet', value: [0.15, 0.25] },
  { id: 'anel-ervado', slot: 'anel', name: 'Anel Ervado', glyph: '✦', stat: 'crit', value: [0.02, 0.03] },
  { id: 'anel-umbroso', slot: 'anel', name: 'Anel Umbroso', glyph: '⚜', stat: 'magnet', value: [0.4, 0.6] },
  { id: 'anel-espectro', slot: 'anel', name: 'Anel Espectro', glyph: '⌘', stat: 'speed', value: [0.08, 0.12] },
];

export const AFFIXES = [
  { id: 'brasa-fria', name: 'da Brasa Fria', stat: 'dmg', value: [0.03, 0.08] },
  { id: 'veu-rachado', name: 'do Véu Rachado', stat: 'hp', value: [5, 20] },
  { id: 'eco-oco', name: 'do Eco Oco', stat: 'cd', value: [0.02, 0.05] },
  { id: 'passo-mudo', name: 'do Passo Mudo', stat: 'speed', value: [0.02, 0.05] },
  { id: 'chamado-surdo', name: 'do Chamado Surdo', stat: 'magnet', value: [0.08, 0.2] },
  { id: 'golpe-torto', name: 'do Golpe Torto', stat: 'crit', value: [0.01, 0.03] },
  { id: 'pulso-lento', name: 'do Pulso Lento', stat: 'regen', value: [0.1, 0.4] },
  { id: 'cerco-aberto', name: 'do Cerco Aberto', stat: 'area', value: [0.03, 0.08] },
  { id: 'dizimo-rouco', name: 'do Dízimo Rouco', stat: 'gold', value: [0.05, 0.15] },
  { id: 'sal-na-veia', name: 'do Sal na Veia', stat: 'dmg', value: [0.03, 0.08] },
  { id: 'noite-curta', name: 'da Noite Curta', stat: 'regen', value: [0.1, 0.4] },
  { id: 'sede-magra', name: 'da Sede Magra', stat: 'hp', value: [5, 20] },
  { id: 'moeda-falsa', name: 'da Moeda Falsa', stat: 'gold', value: [0.05, 0.15] },
  { id: 'sombra-frouxa', name: 'da Sombra Frouxa', stat: 'speed', value: [0.02, 0.05] },
];
