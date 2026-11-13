// Modelos voxel de Ressonância Zero. Unidade = 1 voxel (0,1 tile). Caixa: [x, y, z, largura, altura, profundidade, cor]
// Cores "glow*" e "flame*" brilham no estilo 'combinado' (bloom). Frente do modelo = +z.
export const COLORS = {
  skin: '#e2b08c', skinD: '#b98566', dark: '#0f1118', hair: '#1c1a24', boot: '#22232c',
  teal: '#1f6f7a', tealL: '#3fa3a8', jeans: '#2b3550', orange: '#d9773a',
  steel: '#7d889b', steelD: '#3a4252', steelL: '#a9b4c4', black: '#191b22',
  magenta: '#a8399f', coat: '#e6ecf2', blue: '#2c4f8f', blueD: '#1d3466', amber: '#e1a653', yellow: '#e8c547',
  cyan: '#2fb8d6', cyanL: '#9be7f2', moss: '#4f9a4a', mossD: '#356f37', shroom: '#c8e06a',
  magma: '#5a2a26', sea2: '#2f7fc4', sea2L: '#69b4ea', ochre: '#66705e', ochreD: '#3e4639',
  violet: '#6a3fa8', violetD: '#432a78', glass: '#b9d7e6', concrete: '#565d6b', concreteD: '#3c414c',
  stripeY: '#e1b53f', stripeK: '#22242b', wood: '#6b4a32',
  glowC: '#5ff2ff', glowM: '#ff4fd8', glowY: '#ffe066', glowO: '#ff9b3d', glowB: '#7fc8ff', glowA: '#ffc96b',
  glowW: '#fff6dc', glowG: '#ffd34d', glowP: '#ff7ad9', glowV: '#b77bff', glowGhost: '#cfe9ff', glowGhostD: '#8fb6ef',
  flame: '#ffc04d', flame2: '#ff6a2a',
  fur: '#2b4a63', furD: '#1b2d3e', toad: '#3e5a2e', toadD: '#2a3f1f', pale: '#c9c3a8', capR: '#8a2f3a',
  magmaD: '#3a1c1a', seaD: '#1d4f7e', tealD: '#174f57', quartz: '#d9cfa6', bone: '#d8d2c0', voidK: '#0c0b10',
  fluid: '#3fbfa0', glowGreen: '#3fff9a', eWallP: '#42306a', iron: '#6b6f78', ironD: '#3d4048', rust: '#9a5a3a', cald: '#3a2a2a', caldD: '#1e1414', brass: '#b0803a',
  ice: '#bfe6f2', iceD: '#6fa8c0', deep: '#2c5f7a', ray: '#5a7fa8', rayD: '#2e4a6e', belly: '#c8dcef', bark: '#5a4030', stoneG: '#6b6f66', canopy: '#3f7a36',
  sheet: '#d8dde8', sheetD: '#8a90a8', hollow: '#14121c', suit: '#15141c', skinP: '#d9d6cf', slug: '#6b5a7a', slugD: '#3f3450', post: '#4a4f5c',
  spk: '#4a4458', spkD: '#2a2634', cone: '#8a8298', deerW: '#d8d2c4', deerD: '#8a8070', hoof: '#4a4038', fox: '#b8502e', foxD: '#6e2a1c', cream: '#e8d2b0', axo: '#3a8fb0', axoL: '#9fd6e6', axoD: '#1f5570',
  beet: '#3f6b38', beetD: '#24401f', leaf: '#8fd06a', pomb: '#8a97ab', pombD: '#4f5a6e', mem: '#c9c4dc', memD: '#6b5f8a', anc: '#5a5f6e', ancD: '#2e3240', pigeon: '#6f7c94', pigeonD: '#4a5468', glowAcid: '#b6ff3a', white2: '#e8f0f4', glowR: '#ff4f6a', alfaA: '#4a2a2a', alfaB: '#2e1a1c', alfaC: '#262a36', alfaD: '#2a1a2e',
  // v11: Fenda Estática, formas evoluídas e corpos de expedição
  volt: '#3e4a6a', voltD: '#262d44', mag: '#6a6458', magD: '#3e3a33', magR: '#b8423a', storm: '#2c3450', stormD: '#1a2036', stormL: '#5a6488',
  foxE: '#a8361e', foxED: '#5e1c12', axoE: '#2a6f9a', axoED: '#174866', beetE: '#335c2d', pombE: '#6d7a92', spkE: '#3a3448', spkED: '#221e2c',
  hairW: '#d8d8e0', coatG: '#5a6070', jkGreen: '#3f6b48', jkYellow: '#c9a227', jkRed: '#a03838', jkPurple: '#5a3f7a', denim: '#36507a', hairB: '#5a3a24', hairP: '#b04a8a', glass2: '#9fd8ec',
  coatE: '#6a5238', helm: '#c9a23a', pack: '#3a4a3a', packD: '#26321f', tFloorD: '#55524a',
  // v16: minérios das Fendas (veios coloridos) e o Mercador de Materiais
  glowOreCu: '#ff7a2a', glowOreQz: '#7fd8ff', glowOreAm: '#9dff4a', glowOreOb: '#7a3cff', glowOrePr: '#e0a8ff', glowOreMg: '#f6ff3a', obsid: '#2a1a3e',
};

const m = (x, y, z, w, h, d, c, tag) => [[x, y, z, w, h, d, c, tag], [-x - w, y, z, w, h, d, c, tag]];
const eyes = (y, z, c = 'dark', s = 0.7) => m(0.5, y, z, s, s, 0.1, c);

// humano chibi genérico: jaqueta, calça, cabelo e detalhe opcional
function human(jacket, pants, hair, extra = [], skin = 'skin') {
  return { parts: [
    ...m(0.3, 0, -1, 1.6, 2.5, 2, pants), ...m(0.3, 0, -1, 1.6, 0.6, 2.3, 'boot'),
    [-2.4, 2.5, -1.6, 4.8, 3.4, 3.2, jacket],
    ...m(2.4, 3.1, -0.8, 1.1, 2.6, 1.6, jacket), ...m(2.5, 2.5, -0.6, 0.9, 0.7, 1.2, skin),
    [-2.3, 5.9, -2.2, 4.6, 4.2, 4.4, skin],
    [-2.5, 9.1, -2.4, 5, 1.6, 4.8, hair], [-2.5, 6.6, -2.4, 0.6, 2.8, 3, hair], [1.9, 6.6, -2.4, 0.6, 2.8, 3, hair], [-2.5, 6.2, -2.5, 5, 3, 0.8, hair],
    ...eyes(7.3, 2.2), ...extra,
  ] };
}

export const MODELS = {
  kay: human('teal', 'jeans', 'hair', [   // assinatura: cachecol laranja longo + Nexo ciano no peito
    [-2.6, 5.3, -1.8, 5.2, 1.1, 3.8, 'orange'], [0.6, 2.6, -2.5, 1.4, 3, 0.7, 'orange'], [0.9, 1.8, -2.6, 1, 1, 0.6, 'orange'],
    [-2.45, 4.2, -1.65, 4.9, 0.3, 3.3, 'tealL'],
    [-1.2, 2.8, 1.62, 2.4, 1.8, 0.2, 'glowC'],
  ]),
  operadora: human('magenta', 'black', 'hair', [[-2.6, 8.6, -0.6, 5.2, 0.5, 1.2, 'steelD'], [2.3, 7, 0.6, 0.6, 1.2, 1, 'glowM'], [-2.5, 7.1, 2.25, 5, 0.8, 0.12, 'glowM']]),   // viseira
  hana: human('coat', 'steelD', 'hair', [[-2.7, 0.6, -1.9, 5.4, 2.2, 3.8, 'coat'], [-0.3, 2.6, 1.6, 0.6, 3.2, 0.15, 'steelL'], [-2.5, 7.4, 2.2, 5, 0.8, 0.12, 'glowB']], 'skin'),   // jaleco longo
  rin: human('blue', 'blueD', 'hair', [[-2.6, 4.2, -1.8, 5.2, 1.4, 3.6, 'blueD'], [-2.8, 8.8, -2.7, 5.6, 2.4, 5.4, 'blueD'], [-2.3, 7.1, 2.62, 4.6, 0.8, 0.12, 'glowB'], ...m(2.2, 5.2, -1.4, 1.6, 1, 2.8, 'blueD'), [-1.6, 4.6, 1.7, 3.2, 0.4, 0.15, 'glowB']], 'skinD'),   // capacete e ombreiras
  genetista: human('coat', 'black', 'hair', [[-2.7, 0.6, -1.9, 5.4, 2.2, 3.8, 'coat'], [-2.5, 7.1, 2.25, 5, 0.9, 0.12, 'glowGreen'], ...m(2.5, 2.5, -0.6, 0.9, 0.7, 1.2, 'steelD'), [-1, 4.6, 1.62, 2, 0.6, 0.15, 'glowGreen']], 'skinD'),   // visor verde e luvas
  pickaxe: { parts: [[-0.3, 0, -0.3, 0.6, 6.4, 0.6, 'wood'], [-2.6, 5.8, -0.45, 5.2, 0.9, 0.9, 'steel'], [2.6, 5.9, -0.35, 1, 0.7, 0.7, 'glowA'], [-3.4, 6, -0.35, 0.8, 0.5, 0.7, 'steelD'], [-0.45, 2, -0.45, 0.9, 0.6, 0.9, 'steelD']] },
  corvo: human('black', 'black', 'hair', [[-2.6, 2.4, -1.8, 5.2, 4, 3.6, 'suit'], [-2.5, 7.1, 2.25, 5, 0.7, 0.12, 'glowR'], [-2.8, 9.4, -2.6, 5.6, 0.8, 5.2, 'suit']], 'skinD'),   // casaco escuro e viseira vermelha
  vance: human('suit', 'black', 'hair', [[-2.7, 0.6, -1.9, 5.4, 2.2, 3.8, 'suit'], [-0.3, 2.8, 1.62, 0.6, 2.4, 0.15, 'glowA'], [-2.5, 7.1, 2.25, 5, 0.6, 0.12, 'glowA'], [-2.6, 9.4, -2.4, 5.2, 0.5, 4.8, 'steelD']], 'skin'),   // diretor da Horizonte: terno longo, gravata e visor âmbar
  // moradores de Kanda-9 e do Bioparque (v14)
  yuki: human('coat', 'blueD', 'hairP', [[-2.7, 0.6, -1.9, 5.4, 2.2, 3.8, 'coat'], [-2.5, 7.4, 2.2, 5, 0.6, 0.12, 'glowC']]),   // atendente do posto Helix
  aiko: human('coatG', 'concreteD', 'hairW', [[-2.7, 0.6, -1.9, 5.4, 2, 3.8, 'coatG'], [2.6, 2.6, 0.4, 1.2, 1.2, 1.2, 'wood']]),   // senhora com saco de migalhas
  mei: { ...human('jkYellow', 'denim', 'hairB', [[-2.6, 9, -0.8, 5.2, 1.4, 1.6, 'jkRed']]), scale: 0.72 },   // criança com boné
  musico: human('jkPurple', 'black', 'hair', [[-1.8, 2.6, 1.6, 3.6, 2.2, 0.6, 'wood'], [-0.3, 4.6, 2.1, 0.6, 2.6, 0.3, 'wood']]),   // violão
  entregador: human('jkRed', 'black', 'hair', [[-2.2, 2.6, -3.4, 4.4, 3.6, 1.8, 'jkYellow'], [-2.5, 9, -2.4, 5, 1, 4.8, 'jkRed']]),   // mochila de entrega
  lojista: human('jkGreen', 'concreteD', 'hairB', [[-2.6, 2.4, 1.6, 5.2, 3, 0.3, 'coat']]),   // avental
  carregador: human('jkYellow', 'concreteD', 'hair', [[-2.6, 9, -2.6, 5.2, 1.2, 5.2, 'jkYellow'], [-2.4, 5.6, 2.3, 4.8, 0.4, 0.15, 'glowO']]),   // capacete de obra
  takeshi: human('coatG', 'black', 'hairW', [[-2.6, 5.3, -1.8, 5.2, 1, 3.8, 'jkRed']]),
  estudante: human('blue', 'denim', 'hair', [[-2.2, 2.6, -3, 4.4, 3.4, 1.4, 'jkPurple'], [-2.5, 7.3, 2.25, 5, 0.6, 0.12, 'glass2']]),
  visitante: human('jkGreen', 'denim', 'hairB'),
  // áreas da história (v15)
  okabe: human('blueD', 'blueD', 'hair', [[-2.8, 8.8, -2.7, 5.6, 2.2, 5.4, 'blueD'], ...m(2.2, 5.2, -1.4, 1.6, 1, 2.8, 'steelD'), [-2.3, 7.1, 2.62, 4.6, 0.8, 0.12, 'glowY'], [-1.8, 4.4, 1.7, 3.6, 0.5, 0.15, 'glowY']], 'skinD'),   // sargento instrutor: capacete, viseira âmbar
  guarda: human('blue', 'blueD', 'hair', [[-2.8, 8.8, -2.7, 5.6, 2.2, 5.4, 'blueD'], [-2.3, 7.1, 2.62, 4.6, 0.8, 0.12, 'glowB']], 'skin'),
  emi: human('coat', 'jkPurple', 'hairP', [[-2.7, 0.6, -1.9, 5.4, 2.2, 3.8, 'coat'], [-1.2, 4.4, 1.62, 2.4, 1.2, 0.15, 'glowGreen'], [-2.5, 7.3, 2.25, 5, 0.6, 0.12, 'glass2']]),   // curadora do Bioparque
  mara: human('jkYellow', 'concreteD', 'hairB', [[-2.6, 9, -2.6, 5.2, 1.2, 5.2, 'orange'], [-2.4, 7.2, 2.3, 4.8, 0.9, 0.15, 'glowC'], [2.6, 2.4, -0.4, 1, 3, 1, 'steelD']]),   // engenheira: capacete laranja, óculos de telemetria
  operario: human('orange', 'concreteD', 'hair', [[-2.6, 9, -2.6, 5.2, 1.2, 5.2, 'jkYellow']]),
  vendedor: human('amber', 'concreteD', 'hair', [[-2.6, 2.4, 1.6, 5.2, 2.6, 0.3, 'steelD'], [-0.8, 3.4, 1.9, 1.6, 0.6, 0.12, 'glowY']], 'skinD'),
  leiloeira: human('suit', 'black', 'hairP', [[-2.7, 0.6, -1.9, 5.4, 2.2, 3.8, 'suit'], [-2.5, 7.2, 2.25, 5, 0.6, 0.12, 'glowG'], [2.6, 2.6, 0.2, 0.6, 2.6, 0.6, 'wood'], [2.2, 5, -0.2, 1.4, 0.8, 1, 'wood']]),   // leiloeira com martelo
  mercador: human('rust', 'concreteD', 'hairW', [[-2.6, 2.4, 1.6, 5.2, 3, 0.3, 'wood'], [-2.6, 9, -2.6, 5.2, 0.8, 5.2, 'steelD'], [-2.5, 7.2, 2.25, 5, 0.7, 0.12, 'glowOreCu'], [2.6, 2.4, 0.2, 1.2, 1.2, 1.2, 'glowOreMg']], 'skinD'),   // avental de couro, lupa de minério

  // ---------- Elenco-piloto (Bíblia Visual v1.1): 6 silhuetas validadas no motor ----------
  // ≤3 cores estruturais + 1 emissiva · ≤3 grupos móveis no idle · tags: ear, gill, plate, sprout, wing, tail, orbit, core, pillar
  brasque: { idle: 'bob', parts: [   // raposa-salamandra em cunha · orelhas altas · cauda-braseiro
    ...m(1, 0, -2, 1, 1.6, 1.2, 'foxD'), ...m(1, 0, 1.6, 1, 1.6, 1.2, 'foxD'),
    [-2, 1.6, -3, 4, 2.4, 6, 'fox'], [-1.4, 4, -2.4, 2.8, 0.6, 4.6, 'foxD'],
    [-1.8, 3, 2.6, 3.6, 2.6, 2.6, 'fox'], [-1, 3, 5.2, 2, 1.4, 1.4, 'cream'], [-0.4, 3.8, 6.6, 0.8, 0.5, 0.1, 'dark'],
    ...m(0.3, 4.3, 5.22, 1.2, 0.9, 0.1, 'cream'), ...m(0.6, 4.5, 5.33, 0.6, 0.6, 0.1, 'dark'),
    ...m(0.8, 5.6, 3, 1.2, 2.8, 0.8, 'fox', 'ear'), ...m(1, 5.9, 3.82, 0.8, 2.1, 0.1, 'foxD', 'ear'),
    [-0.8, 2.6, -4.6, 1.6, 1.6, 1.8, 'fox', 'tail'], [-1, 3.6, -6.2, 2, 2, 1.8, 'glowO', 'tail'],
  ] },
  marolho: { idle: 'breathe', parts: [   // axolote baixo · cabeça larga · guelras cúbicas
    ...m(2, 0, -2.2, 1.2, 0.8, 1.2, 'axoD'), ...m(2, 0, 1.6, 1.2, 0.8, 1.2, 'axoD'),
    [-2.2, 0.8, -3.6, 4.4, 2.6, 6, 'axo'], [-0.3, 3.4, -3, 0.6, 0.8, 4.6, 'axoL'],
    [-3, 1, 2.2, 6, 3, 3.2, 'axo'], [-2, 1.6, 5.42, 4, 0.3, 0.1, 'axoD'], ...m(1.4, 3, 5.42, 0.8, 0.8, 0.1, 'dark'),
    ...m(3, 2.4, 2.6, 1.2, 0.6, 0.6, 'glowC', 'gill'), ...m(3, 3.2, 3.2, 1.4, 0.6, 0.6, 'glowC', 'gill'), ...m(3, 4, 2.6, 1.2, 0.6, 0.6, 'glowC', 'gill'),
    [-0.4, 1.4, -6.4, 0.8, 2.2, 2.8, 'axoL', 'tail'],
  ] },
  brogume: { idle: 'breathe', parts: [   // besouro-broto · carapaça em degraus · folhas-antena
    ...m(2.4, 0, -2.4, 1, 1.2, 1, 'beetD'), ...m(2.4, 0, 0, 1, 1.2, 1, 'beetD'), ...m(2.4, 0, 2.2, 1, 1.2, 1, 'beetD'),
    [-3, 1, -3.4, 6, 1.6, 6.4, 'beet'], [-2.4, 2.6, -2.8, 4.8, 1.2, 5.2, 'beet', 'plate'], [-1.6, 3.8, -2, 3.2, 1, 3.6, 'beetD', 'plate'],
    [-1.6, 1.2, 3, 3.2, 2, 1.8, 'beetD'], ...m(0.5, 2.2, 4.82, 0.7, 0.6, 0.1, 'glowAcid'),
    ...m(0.6, 3.2, 3.8, 0.4, 2.2, 0.4, 'beetD'), ...m(0.2, 5.4, 3.2, 1.8, 0.4, 2.2, 'leaf', 'sprout'),
  ] },
  pombrax: { idle: 'flap', parts: [   // pombo geométrico · asas horizontais largas · bico quadrado
    ...m(0.6, 0, -0.2, 0.5, 1.2, 0.5, 'amber'),
    [-2, 1.2, -2.6, 4, 3.2, 5, 'pomb'], [-1.5, 4.2, 0.6, 3, 0.5, 2.6, 'glowC'],
    [-1.4, 4.6, 0.4, 2.8, 2.4, 2.8, 'pombD'], [-0.5, 5.2, 3.2, 1, 0.8, 0.8, 'amber'], ...m(0.7, 5.8, 3.22, 0.5, 0.5, 0.1, 'dark'),
    ...m(2, 3.4, -2.2, 4.4, 0.6, 4, 'pombD', 'wing'), ...m(6.4, 3.6, -2, 1.6, 0.4, 3.2, 'pomb', 'wing'),
    [-1.2, 2.2, -4.4, 2.4, 0.6, 1.8, 'pombD'],
  ] },
  memoris: { idle: 'float', parts: [   // fantasma fragmentado · cabeça cúbica vazada · blocos orbitais
    [-0.6, 0, -0.6, 1.2, 0.8, 1.2, 'memD'], [-1.2, 0.8, -1.2, 2.4, 1.2, 2.4, 'mem'], [-1.8, 2, -1.6, 3.6, 3.6, 3.2, 'mem'],
    [-2.4, 5.6, -2.4, 4.8, 0.6, 4.8, 'mem'], [-2.4, 9, -2.4, 4.8, 0.6, 4.8, 'mem'],
    [1.8, 6.2, 1.8, 0.6, 2.8, 0.6, 'mem'], [-2.4, 6.2, 1.8, 0.6, 2.8, 0.6, 'mem'], [1.8, 6.2, -2.4, 0.6, 2.8, 0.6, 'memD'],
    [-0.8, 6.8, -0.8, 1.6, 1.6, 1.6, 'glowV', 'core'],
    [3.4, 7, 0, 1, 1, 1, 'memD', 'orbit'], [-4, 5, 1, 1.2, 1.2, 1.2, 'memD', 'orbit'], [0.4, 10.4, -3.6, 0.8, 0.8, 0.8, 'memD', 'orbit'],
  ] },
  ancora: { idle: 'breathe', parts: [   // chefe · arco de quatro pilares · núcleo nervoso
    [-5, 0, -5, 10, 1, 10, 'ancD'],
    ...m(3, 1, 3, 2, 9, 2, 'anc', 'pillar'), ...m(3, 1, -5, 2, 9, 2, 'anc', 'pillar'),
    [-5, 10, 3, 10, 1.6, 2, 'ancD'], [-5, 10, -5, 10, 1.6, 2, 'ancD'],
    [-3, 5.4, -0.3, 6, 0.3, 0.6, 'glowV'], [-0.3, 5.4, -3, 0.6, 0.3, 6, 'glowV'],
    [-1.6, 4, -1.6, 3.2, 3.2, 3.2, 'glowV', 'core'],
  ] },
  // ---------- Fauna das Fendas temáticas (v8) · ≤3 cores estruturais + 1 emissiva ----------
  cascalco: { idle: 'breathe', parts: [   // Magma · tatu-couraça de ferro, placas em degraus
    ...m(2.6, 0, -2.6, 1.4, 1.2, 1.6, 'ironD'), ...m(2.6, 0, 1.6, 1.4, 1.2, 1.6, 'ironD'),
    [-3.4, 1, -3.6, 6.8, 3, 7.2, 'iron'],
    [-3, 4, -3, 6, 1, 1.6, 'ironD', 'plate'], [-3, 4, -0.8, 6, 1.2, 1.6, 'rust', 'plate'], [-3, 4, 1.4, 6, 1, 1.6, 'ironD', 'plate'],
    [-1.4, 1.2, 3.6, 2.8, 2.2, 1.8, 'ironD'], [-0.6, 1.4, 5.4, 1.2, 0.8, 0.8, 'rust'], ...m(0.4, 2.4, 5.42, 0.6, 0.4, 0.1, 'glowO'),
    [-0.6, 1.6, -5, 1.2, 1, 1.6, 'ironD', 'tail'],
  ] },
  ferfogo: { idle: 'breathe', parts: [   // Magma (rara) · besouro-caldeira com coluna térmica
    ...m(2.6, 0, -2, 1, 1, 1, 'caldD'), ...m(2.6, 0, 0.2, 1, 1, 1, 'caldD'), ...m(2.6, 0, 2.2, 1, 1, 1, 'caldD'),
    [-3, 1, -3.2, 6, 2.4, 6.4, 'cald'], [-3.2, 2, -3.4, 6.4, 0.4, 6.8, 'brass'],
    [-1, 3.4, -1.6, 2, 3, 2, 'caldD'], [-1.3, 6.4, -1.9, 2.6, 0.6, 2.6, 'brass'],
    [-0.7, 7, -1.3, 1.4, 1.4, 1.4, 'flame', 'core'], [-0.4, 8.4, -1, 0.8, 0.8, 0.8, 'flame2', 'core'],
    [-1.4, 1.2, 3.2, 2.8, 1.8, 1.6, 'caldD'], ...m(0.6, 1, 4.8, 0.6, 0.6, 1.2, 'brass'), ...m(0.5, 2.4, 4.82, 0.6, 0.4, 0.1, 'glowO'),
  ] },
  gelideo: { idle: 'bob', parts: [   // Azul · caranguejo de gelo com carapaça cristalina
    ...m(2.4, 0, -1.6, 1, 1.4, 0.8, 'deep'), ...m(3, 0, 0.4, 1, 1.2, 0.8, 'deep'),
    [-2.6, 1.2, -2.2, 5.2, 2.4, 4.4, 'iceD'], [-2, 3.6, -1.6, 4, 1.4, 3.2, 'ice'],
    [-1.4, 5, -1, 0.8, 1.6, 0.8, 'ice'], [0.6, 5, -0.2, 0.8, 2.2, 0.8, 'ice'], [-0.2, 5, 0.8, 0.6, 1.2, 0.6, 'ice'],
    ...m(3, 1.6, 1.4, 1.6, 1.4, 2, 'ice', 'ear'),
    ...m(0.6, 3.6, 2.2, 0.4, 1.2, 0.4, 'deep'), ...m(0.5, 4.8, 2.1, 0.6, 0.6, 0.6, 'glowB'),
  ] },
  nuvemar: { idle: 'float', parts: [   // Azul (rara) · arraia suspensa em cruz
    [-1.6, 4, -3, 3.2, 1, 6, 'ray'], [-1.4, 3.8, -2.6, 2.8, 0.2, 5.2, 'belly'],
    ...m(1.6, 4.2, -1.6, 4, 0.6, 3.2, 'ray', 'wing'), ...m(5.6, 4.4, -1, 1.4, 0.4, 2, 'rayD', 'wing'),
    ...m(0.6, 5, 2.8, 0.6, 0.4, 0.2, 'glowC'),
    [-0.3, 4.2, -5.4, 0.6, 0.4, 2.4, 'rayD', 'tail'], [-0.4, 4.1, -6.2, 0.8, 0.6, 0.8, 'glowC', 'tail'],
  ] },
  arborion: { idle: 'breathe', parts: [   // Verde (rara) · árvore quadrúpede com pernas de pedra
    ...m(1.6, 0, -2.4, 1.6, 2.6, 1.6, 'stoneG'), ...m(1.6, 0, 1.2, 1.6, 2.6, 1.6, 'stoneG'),
    [-2.4, 2.6, -2.8, 4.8, 2.4, 5.6, 'bark'], [-1.2, 5, -1.2, 2.4, 3, 2.4, 'bark'],
    [-1.2, 3.4, 2.8, 2.4, 2, 1.8, 'bark'], ...m(0.4, 4.4, 4.62, 0.6, 0.5, 0.1, 'glowAcid'),
    [-3.4, 8, -3.2, 6.8, 2.4, 6, 'canopy', 'sprout'], [-2.2, 10.4, -2, 4.4, 1.4, 4, 'leaf', 'sprout'], [1.6, 7.4, 1.4, 2, 1.2, 2, 'canopy', 'sprout'],
  ] },
  velamen: { idle: 'float', parts: [   // Sombria · lençol-fantasma com rosto vazio
    [-2, 1.2, -1.8, 4, 5.4, 3.6, 'sheet'], [-1.6, 6.6, -1.4, 3.2, 1.6, 2.8, 'sheet'],
    [-2, 0.4, -1.8, 1, 0.8, 3.6, 'sheetD', 'tent'], [-0.4, 0, -1.8, 0.8, 1.2, 3.6, 'sheetD', 'tent'], [1, 0.4, -1.8, 1, 0.8, 3.6, 'sheetD', 'tent'],
    [-1.2, 4.6, 1.82, 2.4, 1.6, 0.1, 'hollow'], ...m(0.4, 5.2, 1.93, 0.5, 0.5, 0.1, 'glowV'),
    ...m(2, 3.2, -0.4, 0.8, 2.4, 0.8, 'sheetD', 'wing'),
  ] },
  longinquus: { idle: 'tremble', parts: [   // Sombria (rara, Void) · humanoide esguio sem rosto
    ...m(0.4, 0, -0.3, 0.7, 7, 0.7, 'suit'), [-1.4, 7, -0.8, 2.8, 5, 1.6, 'suit'],
    ...m(1.4, 4.6, -0.4, 0.5, 7.2, 0.5, 'suit'),
    [-1, 12.2, -1, 2, 2.6, 2, 'skinP'],
    ...m(0.8, 8.6, -1.6, 0.3, 4, 0.3, 'glowV', 'tent'), [-0.15, 7.6, -1.8, 0.3, 5, 0.3, 'glowV', 'tent'],
  ] },
  fanaluz: { idle: 'breathe', parts: [   // Sombria · caracol-luminária: a única luz da Fenda
    [-1.6, 0, -3, 3.2, 1.4, 6, 'slug'], [-1.2, 0.4, 3, 2.4, 1.6, 1.4, 'slugD'],
    ...m(0.5, 2, 3.6, 0.4, 1.4, 0.4, 'slugD'), ...m(0.4, 3.4, 3.5, 0.6, 0.6, 0.6, 'post'),
    [-0.5, 1.4, -1.6, 1, 5, 1, 'post'], [-1.4, 6.4, -2.5, 2.8, 2.4, 2.8, 'post'],
    [-1, 6.8, -2.1, 2, 1.6, 2, 'glowW', 'core'], [-1.6, 8.8, -2.7, 3.2, 0.6, 3.2, 'slugD'],
  ] },
  sonom: { idle: 'flap', parts: [   // Eco · morcego de sinais com orelhas-alto-falante
    ...m(0.6, 0, -0.3, 0.6, 1.6, 0.6, 'spkD'),
    [-1.6, 1.6, -1.4, 3.2, 3.2, 2.8, 'spk'],
    ...m(1, 4.8, -0.8, 2.2, 2.2, 1.6, 'cone', 'ear'), ...m(1.4, 5.2, 0.82, 1.4, 1.4, 0.1, 'spkD'), ...m(1.8, 5.6, 0.85, 0.6, 0.6, 0.1, 'glowP'),
    ...m(1.6, 2, -0.6, 3.2, 2.6, 0.4, 'spkD', 'wing'), ...m(0.4, 3.6, 1.42, 0.6, 0.4, 0.1, 'glowP'),
  ] },
  prismar: { idle: 'bob', parts: [   // Eco · cervídeo de corpo fino e coroa assimétrica de prismas
    ...m(1, 0, -2.4, 0.6, 3.4, 0.6, 'hoof'), ...m(1, 0, 1.8, 0.6, 3.4, 0.6, 'hoof'),
    [-1.4, 3.4, -2.8, 2.8, 2, 5.6, 'deerW'], [-0.7, 5, 2, 1.4, 2.4, 1.2, 'deerW'], [-1, 7, 2.4, 2, 1.6, 2.4, 'deerD'], ...m(0.6, 7.8, 4.82, 0.4, 0.3, 0.1, 'dark'),
    [0.6, 8.6, 2.6, 0.6, 3, 0.6, 'glowG', 'core'], [1, 10.6, 2, 0.5, 1.6, 0.5, 'glowG'], [-1.2, 8.6, 2.8, 0.5, 2, 0.5, 'glowG'], [-1.8, 9.8, 2.2, 0.5, 1.2, 0.5, 'glowG'],
    [-0.4, 4.4, -3.4, 0.8, 0.8, 0.8, 'deerD', 'tail'],
  ] },
  e091: { scale: 1.1, parts: [
    ...m(0.6, 0, -0.2, 0.3, 2.2, 0.3, 'glowV'), ...m(1.6, 1, -0.2, 0.3, 5, 0.3, 'glowV'),
    [-1.6, 2, -1.2, 3.2, 5, 2.4, 'glowGhostD'], [-1.4, 7, -1.2, 2.8, 2.4, 2.4, 'glowGhost'],
    ...m(0.3, 8.4, 1.2, 0.5, 0.5, 0.1, 'dark'), ...m(0.9, 7.6, 1.2, 0.4, 0.4, 0.1, 'dark'),
    ...m(1.2, 9.4, -0.2, 0.3, 2, 0.3, 'glowV'),
  ] },
};

// ---------- Fenda Estática (v11) ----------
MODELS.volteiro = { idle: 'bob', scale: 1.3, parts: [   // furão de cabos · corpo baixo e longo · cauda em zigue-zague carregada
  ...m(1.1, 0, -2.6, 0.9, 1.2, 1, 'voltD'), ...m(1.1, 0, 1.8, 0.9, 1.2, 1, 'voltD'),
  [-1.6, 1.2, -3.4, 3.2, 2, 6.4, 'volt'], [-1.2, 1, -3, 2.4, 0.3, 5.6, 'cream'],
  [-1.6, 2, 3, 3.2, 2.4, 2.6, 'volt'], [-0.8, 2, 5.6, 1.6, 1.2, 1, 'voltD'], [-0.3, 2.8, 6.6, 0.6, 0.4, 0.1, 'dark'],
  ...m(0.5, 3.4, 5.62, 0.6, 0.6, 0.1, 'dark'), ...m(1.3, 2.4, 5.2, 0.5, 0.5, 0.5, 'glowY'),
  ...m(0.7, 4.4, 3.4, 0.9, 1.4, 0.6, 'volt', 'ear'),
  [-0.5, 2.6, -4.6, 1, 1, 1.4, 'voltD', 'tail'], [-0.5, 3.4, -5.6, 1, 1, 1.2, 'glowY', 'tail'], [-0.5, 4.2, -5, 1, 1, 1.2, 'glowY', 'tail'], [-0.5, 5, -6, 1, 1.2, 1.2, 'glowY', 'tail'],
] };
MODELS.imantado = { idle: 'breathe', scale: 1.2, parts: [   // tartaruga-ímã · casco em degraus · dois polos com faísca no meio
  ...m(2, 0, -2.2, 1.4, 1.2, 1.4, 'magD'), ...m(2, 0, 1.4, 1.4, 1.2, 1.4, 'magD'),
  [-3.2, 1, -3.2, 6.4, 2, 6.4, 'mag'], [-2.6, 3, -2.6, 5.2, 1.2, 5.2, 'magD', 'plate'],
  ...m(0.9, 4.2, -0.6, 0.9, 1.8, 1.2, 'magR'), ...m(0.9, 6, -0.6, 0.9, 0.6, 1.2, 'steelL'),
  [-0.4, 6.1, -0.4, 0.8, 0.4, 0.8, 'glowY', 'core'],
  [-1.2, 1.4, 3.2, 2.4, 1.8, 2, 'magD'], ...m(0.5, 2.4, 5.22, 0.5, 0.4, 0.1, 'glowY'),
  [-0.5, 1.2, -4.2, 1, 0.8, 1.2, 'magD', 'tail'],
] };
MODELS.fulgor = { idle: 'flap', scale: 1.3, parts: [   // ave-trovão · asas largas com borda de relâmpago · crista
  ...m(0.6, 0, -0.2, 0.5, 1.6, 0.5, 'brass'),
  [-1.6, 1.6, -2.4, 3.2, 3.4, 4.6, 'storm'], [-1.2, 2, 2.2, 2.4, 2.2, 0.3, 'stormL'],
  [-1.2, 5, 0.8, 2.4, 2.2, 2.6, 'storm'], [-0.4, 5.4, 3.4, 0.8, 0.8, 1.2, 'brass'], ...m(0.6, 6.2, 3.42, 0.5, 0.4, 0.1, 'glowY'),
  [-0.3, 7.2, 0.4, 0.6, 1.4, 1.8, 'glowY', 'core'],
  ...m(1.6, 4, -2, 4.4, 0.6, 3.6, 'stormD', 'wing'), ...m(6, 4.2, -1.6, 1.6, 0.5, 2.8, 'storm', 'wing'),
  ...m(2, 3.7, 1.5, 2.2, 0.3, 0.4, 'glowY', 'wing'), ...m(4.2, 3.9, 1.1, 2.2, 0.3, 0.4, 'glowY', 'wing'),
  [-1.2, 2.4, -4.4, 2.4, 0.6, 2, 'stormD', 'tail'], [-0.4, 2.2, -5.6, 0.8, 0.6, 1.4, 'glowY', 'tail'],
] };

// ---------- exóticas do mercado negro (v13) ----------
MODELS.rasgo = { idle: 'float', scale: 1.3, parts: [   // fenda ambulante: duas lâminas escuras e uma rachadura magenta viva
  [-1.8, 1, -0.8, 1.4, 6, 1.6, 'voidK'], [0.4, 1, -0.8, 1.4, 6, 1.6, 'voidK'], [-0.4, 1.2, -0.4, 0.8, 5.6, 0.8, 'glowM', 'core'],
  [-1.2, 7, -0.6, 0.8, 1, 1.2, 'voidK'], [0.4, 7.4, -0.4, 0.6, 1.4, 0.8, 'voidK'], [-0.2, 7.2, -0.2, 0.4, 0.8, 0.4, 'glowP'],
  ...m(0.9, 0, -0.4, 0.5, 1, 0.5, 'voidK', 'tent'),
  [2.6, 4, 0, 0.8, 0.8, 0.8, 'glowP', 'orbit'], [-3.4, 3, 0.6, 0.7, 0.7, 0.7, 'glowM', 'orbit'], [0.6, 8.6, -2.6, 0.6, 0.6, 0.6, 'voidK', 'orbit'],
] };
MODELS.lastro = { idle: 'breathe', scale: 1.25, parts: [   // filhote de Âncora: corpo atarracado em forma de âncora, núcleo violeta
  ...m(1.2, 0, -1.2, 1.2, 1, 2.4, 'ancD'),
  [-2.4, 1, -2, 4.8, 3.6, 4, 'anc'], [-0.6, 4.6, -0.6, 1.2, 3, 1.2, 'ancD'], [-1.4, 7.6, -0.4, 2.8, 0.7, 0.8, 'ancD'],
  ...m(2.4, 0.8, -0.8, 1.6, 1, 1.6, 'ancD'), ...m(3.4, 1.8, -0.8, 0.8, 1.6, 1.6, 'ancD', 'ear'),
  [-0.8, 2.2, 1.95, 1.6, 1.6, 0.3, 'glowV', 'core'], ...m(0.6, 3.8, 2.02, 0.6, 0.5, 0.1, 'glowV'),
] };

// ---------- formas evoluídas (v11): mesma família visual, silhueta maior e um elemento novo marcante ----------
function evolved(base, swap, extra, scale) {
  const def = MODELS[base];
  return { idle: def.idle, scale, parts: [...def.parts.map(([x, y, z, w, h, d, c, tag]) => [x, y, z, w, h, d, swap[c] || c, tag]), ...extra] };
}
MODELS.brasador = evolved('brasque', { fox: 'foxE', foxD: 'foxED' }, [   // juba de brasa e segunda cauda
  [-1.6, 4.6, -2.2, 3.2, 1.4, 3.6, 'flame', 'core'], [-1, 6, -1.4, 2, 0.8, 2, 'flame2'],
  ...m(0.9, 8.2, 3.2, 0.8, 1.2, 0.6, 'glowO', 'ear'),
  [0.8, 4.4, -6.4, 1.6, 1.6, 1.6, 'foxE', 'tail'], [1, 5.8, -7.6, 1.6, 2, 1.6, 'flame2', 'tail'],
  ...m(1, 0, -2, 1, 0.6, 1.2, 'foxED'), ...m(1, 0, 1.6, 1, 0.6, 1.2, 'foxED'),
], 1.6);
MODELS.maremor = evolved('marolho', { axo: 'axoE', axoD: 'axoED' }, [   // barbatana dorsal alta e chifres de coral
  [-0.4, 3.4, -4, 0.8, 3.4, 5.6, 'axoL', 'sprout'], [-0.4, 6.8, -3.2, 0.8, 0.8, 3.6, 'glowC'],
  [-3.2, 4, 2.2, 6.4, 0.6, 3.2, 'axoED'], ...m(1.4, 4.6, 3.4, 0.8, 1.6, 0.8, 'glowC'), ...m(2.6, 4.6, 2.6, 0.8, 2.4, 0.8, 'glowC'), [-0.4, 4.6, 4.2, 0.8, 1.2, 0.8, 'glowC'],
  [-1.6, 0.6, -8.4, 3.2, 3.4, 1, 'axoL', 'tail'], [-0.6, 1, -7.2, 1.2, 2, 1.2, 'axoE', 'tail'],
], 1.5);
MODELS.brotaneo = evolved('brogume', { beet: 'beetE' }, [   // um jardim inteiro nas costas
  [-0.9, 4.6, -1.8, 1.8, 2.4, 1.8, 'bark'], [-2.6, 6.8, -3, 5.2, 1.8, 4.6, 'canopy', 'sprout'], [-1.6, 8.6, -2, 3.2, 1.2, 2.8, 'leaf', 'sprout'],
  [1.6, 7.8, 0.8, 0.8, 0.8, 0.8, 'glowP'], [-2.2, 8.2, -2.2, 0.8, 0.8, 0.8, 'glowP'], [0.2, 10.2, -1, 0.7, 0.7, 0.7, 'glowAcid'],
  ...m(3.2, 1, -3, 0.8, 1.6, 6, 'beetD'),
], 1.5);
MODELS.voltarco = evolved('volteiro', {}, [   // juba de raios e arco entre duas pontas de cauda
  [-1.2, 4.4, -2.6, 0.8, 1.6, 0.8, 'glowY'], [0.4, 4.6, -1.4, 0.8, 2, 0.8, 'glowY'], [-0.6, 4.8, 0.2, 0.8, 1.4, 0.8, 'glowY'], [0.2, 4.4, 1.6, 0.8, 1.8, 0.8, 'glowY'],
  [1.4, 5, -6.4, 1, 1.2, 1.2, 'glowY', 'tail'], [-1.2, 6.2, -6.2, 3.6, 0.4, 0.4, 'glowW', 'core'],
  ...m(0.6, 5.6, 3.2, 0.8, 1.2, 0.6, 'voltD', 'ear'),
], 1.5);
MODELS.ventoral = evolved('pombrax', { pomb: 'pombE' }, [   // segundo par de asas e redemoinho sobre a cabeça
  ...m(1.6, 5.2, -1.8, 3.6, 0.5, 3.2, 'pombD', 'wing'), ...m(5.2, 5.4, -1.4, 1.4, 0.4, 2.4, 'glowC', 'wing'),
  [-1.6, 8, -0.6, 3.2, 0.3, 0.4, 'glowC', 'halo'], [-1.6, 8, 2.6, 3.2, 0.3, 0.4, 'glowC', 'halo'], [-1.8, 8, -0.6, 0.4, 0.3, 3.6, 'glowC', 'halo'], [1.4, 8, -0.6, 0.4, 0.3, 3.6, 'glowC', 'halo'],
  [-0.6, 4.2, -5.8, 1.2, 0.5, 1.6, 'pombD'],
], 1.45);
MODELS.megassom = evolved('sonom', { spk: 'spkE', spkD: 'spkED' }, [   // orelhas viraram caixas de som, ondas em órbita
  ...m(2.6, 6.4, -0.8, 1.8, 2.6, 1.6, 'cone', 'ear'), ...m(2.9, 7, 0.82, 1.2, 1.4, 0.1, 'glowP'),
  [3.6, 3, 0, 0.8, 0.8, 0.8, 'glowP', 'orbit'], [-4.2, 4, 0.6, 0.6, 0.6, 0.6, 'glowP', 'orbit'],
  ...m(4.8, 2.2, -0.6, 1.6, 2, 0.4, 'spkED', 'wing'),
], 1.45);

MODELS.brasque.scale = 1.35; MODELS.brogume.scale = 1.3; MODELS.marolho.scale = 1.25; MODELS.pombrax.scale = 1.25; MODELS.memoris.scale = 1.15;
MODELS.ancoraAlfa = MODELS.ancora;   // o Guardião usa o próprio chefe (sem variante recolorida)
MODELS.cascalco.scale = 1.2; MODELS.ferfogo.scale = 1.3; MODELS.nuvemar.scale = 1.3; MODELS.arborion.scale = 1.1; MODELS.gelideo.scale = 1.25; MODELS.velamen.scale = 1.1; MODELS.fanaluz.scale = 1.4; MODELS.sonom.scale = 1.3; MODELS.prismar.scale = 1.1;

// Guardião "Alfa" de cada Fenda (família totêmica): a espécie rara com cores de ameaça, chifres, auréola girando e pedestal
function alfa(def, swap, ring = 'glowR') {
  const parts = def.parts.map(([x, y, z, w, h, d, c, tag]) => [x, y, z, w, h, d, swap[c] || c, tag]);
  const top = Math.max(...def.parts.map(p => p[1] + p[4])), hy = top + 1.6;
  return { scale: (def.scale || 1) * 1.15, idle: def.idle, parts: [...parts,
    ...m(0.8, top - 0.4, -0.6, 0.8, 2.6, 0.8, 'bone'), ...m(1.6, top - 0.8, -0.6, 0.6, 1.6, 0.6, 'bone'),
    [-3.4, hy, -3.4, 6.8, 0.35, 0.5, ring, 'halo'], [-3.4, hy, 2.9, 6.8, 0.35, 0.5, ring, 'halo'], [-3.4, hy, -3.4, 0.5, 0.35, 6.8, ring, 'halo'], [2.9, hy, -3.4, 0.5, 0.35, 6.8, ring, 'halo'],
    [-5, 0, -5, 10, 0.25, 10, 'alfaB'], [-5.2, 0.05, -5.2, 10.4, 0.15, 0.4, ring], [-5.2, 0.05, 4.8, 10.4, 0.15, 0.4, ring]] };
}
MODELS.ferfogoAlfa = alfa(MODELS.ferfogo, { cald: 'alfaD', brass: 'bone' });
MODELS.nuvemarAlfa = alfa(MODELS.nuvemar, { ray: 'alfaC', rayD: 'alfaB', glowC: 'glowR' });
MODELS.arborionAlfa = alfa(MODELS.arborion, { canopy: 'alfaD', leaf: 'alfaA', glowAcid: 'glowR' });
MODELS.longinquusAlfa = alfa(MODELS.longinquus, { skinP: 'bone', glowV: 'glowR' });
MODELS.fulgorAlfa = alfa(MODELS.fulgor, { storm: 'alfaC', stormD: 'alfaB', glowY: 'glowR' });

// quiosque estilo Blade Runner: pilares de trás, toldo, letreiro neon com 2 linhas, balcão iluminado e placa holográfica
function kiosk(c1, c2, holo, extra = []) {
  return { light: true, lightColor: COLORS[c1], lightI: 7, idle: 'breathe', parts: [
    ...m(4, 0, -5, 0.8, 13.4, 0.8, 'steelD'),
    [-5.4, 12.6, -5.6, 10.8, 0.6, 5.4, 'black'], [-5.4, 12.4, -0.4, 10.8, 0.3, 0.3, c1],
    [-4.2, 13.4, -1.2, 8.4, 3.2, 0.6, 'black'], [-3.6, 14.1, -0.55, 7.2, 0.5, 0.1, c1], [-3.6, 15.1, -0.55, 4.4, 0.5, 0.1, c2], [1.6, 15.1, -0.55, 1.4, 0.5, 0.1, c1],
    [-4.6, 0, 2.6, 9.2, 4.4, 1.8, 'steelD'], [-4.8, 4.4, 2.4, 9.6, 0.4, 2.2, 'steel'], [-4.6, 3.4, 4.42, 9.2, 0.3, 0.1, c1], [-4.6, 0.6, 4.42, 9.2, 0.2, 0.1, c2],
    [4.2, 5.4, 2.8, 0.2, 3.4, 2.6, holo, 'core'], [4.15, 6.2, 3, 0.1, 0.25, 2.2, 'black'], [4.15, 7.2, 3, 0.1, 0.25, 1.4, 'black'],
    ...extra,
  ] };
}

// fachada de loja de Kanda-9: rua estreita, toldo, vitrine acesa e holograma lateral
function storefront(frame, sign, glass = 'glowB', accent = 'glowW', extra = []) {
  return { light: true, lightColor: COLORS[sign] || '#5ff2ff', lightI: 8, idle: 'breathe', parts: [
    [-5.2, 0, -5.2, 10.4, 0.6, 10.4, 'steelD'], [-5.4, 0.6, -5.4, 10.8, 13.2, 2.1, 'concreteD'],
    [-5.4, 12.8, -5.6, 10.8, 0.8, 5.6, 'black'], [-5.2, 12.4, -0.5, 10.4, 0.3, 0.2, sign],
    [-4.2, 13.6, -0.35, 8.4, 2.6, 0.12, sign], [-2.8, 14.5, -0.2, 5.6, 0.45, 0.1, accent],
    [-5, 8.8, -3.6, 10, 3, 0.5, frame], [-4.6, 4.1, -3.15, 9.2, 4.2, 0.12, glass],
    [-4.4, 1, 2.6, 8.8, 3.2, 2.2, 'steelD'], [-4.8, 4.2, 2.4, 9.6, 0.4, 2.6, frame],
    [-4.8, 4.6, 4.45, 9.6, 0.25, 0.1, sign], [-4.2, 0.6, 4.42, 8.4, 0.2, 0.1, accent],
    [-4.9, 0.6, 2.7, 0.35, 8.8, 0.35, sign], [4.55, 0.6, 2.7, 0.35, 8.8, 0.35, sign],
    [5.05, 5.6, 2.8, 0.16, 3.2, 2.4, accent, 'core'], [4.98, 6.2, 2.95, 0.08, 0.22, 2.1, 'black'], [4.98, 7.2, 2.95, 0.08, 0.22, 1.4, 'black'],
    ...extra,
  ] };
}
function shutterShop(sign = 'glowM', accent = 'glowB') {
  return { light: true, lightColor: COLORS[sign] || '#ff4fd8', lightI: 3, idle: 'breathe', parts: [
    [-5.1, 0, -5.1, 10.2, 0.5, 10.2, 'steelD'], [-5.3, 0.5, -5.3, 10.6, 12.8, 1.9, 'concreteD'],
    [-5.3, 11.8, -5.4, 10.6, 1.1, 5.4, 'black'], [-4.6, 12.3, -0.2, 9.2, 0.28, 0.1, sign],
    [-4.2, 4.1, -3.2, 8.4, 6.8, 0.18, 'iron'], [-4.2, 4.8, -3.05, 8.4, 0.18, 0.08, 'steelD'], [-4.2, 6.2, -3.05, 8.4, 0.18, 0.08, 'steelD'], [-4.2, 7.6, -3.05, 8.4, 0.18, 0.08, 'steelD'],
    [-4.8, 0.8, 2.6, 9.6, 2.6, 2.2, 'steelD'], [-4.2, 3.2, 4.42, 8.4, 0.2, 0.1, accent],
    [-4.9, 0.5, 2.7, 0.4, 7.6, 0.35, 'black'], [4.5, 0.5, 2.7, 0.4, 7.6, 0.35, 'black'],
  ] };
}
function ringPortal(frame, energy, accent, base = 'steelD', unstable = false, giant = false) {
  const w = giant ? 12 : 9.2, h = giant ? 16 : 12.4, innerW = giant ? 7.6 : 5.8, innerH = giant ? 11.2 : 8.8, step = giant ? 1.2 : 1;
  const x0 = -w / 2, y0 = 0, z0 = -0.8, parts = [
    [x0 - 1, 0, -6, w + 2, 1.4, 12, base], [x0 - 0.4, 1.4, -5.1, w + 0.8, 0.5, 10.2, frame],
    [x0, y0 + 1.4, z0, step, h - 3.2, 1.6, frame], [w / 2 - step, y0 + 1.4, z0, step, h - 3.2, 1.6, frame],
    [x0 + 1.2, y0 + h - 2.6, z0, w - 2.4, 1.2, 1.6, frame], [x0 + 1.2, y0 + 1.4, z0, w - 2.4, 1, 1.6, frame],
    [x0 + 0.7, y0 + 3.1, z0, 1.4, 2, 1.6, frame], [w / 2 - 2.1, y0 + 3.1, z0, 1.4, 2, 1.6, frame],
    [x0 + 0.7, y0 + h - 5.3, z0, 1.4, 2, 1.6, frame], [w / 2 - 2.1, y0 + h - 5.3, z0, 1.4, 2, 1.6, frame],
    [-(innerW / 2), 2.2, 0.05, innerW, innerH, 0.18, energy, 'core'], [-(innerW / 2) + 0.8, 3.1, 0.24, innerW - 1.6, innerH - 2.4, 0.14, accent, 'core'],
    [-(innerW / 2) + 0.4, h * 0.34, 0.28, 1.2, 0.32, 0.1, accent], [innerW / 2 - 1.6, h * 0.52, 0.28, 1.2, 0.32, 0.1, accent],
  ];
  const chevrons = giant ? [[-5.1, 2.6], [4.2, 2.6], [-5.1, 12.2], [4.2, 12.2], [-0.6, 14.2]] : [[-3.9, 2.4], [3, 2.4], [-3.9, 9.2], [3, 9.2], [-0.5, 10.8]];
  for (const [x, y] of chevrons) parts.push([x, y, 0.55, giant ? 1.6 : 1.2, 0.55, 0.18, accent]);
  if (unstable) {
    parts.push([-2.8, 3.6, 0.28, 1.8, 0.2, 0.1, 'glowP', 'core'], [0.4, 5.2, 0.28, 2.2, 0.2, 0.1, 'glowV', 'core'], [-0.6, 7.8, 0.28, 1.6, 0.2, 0.1, 'glowC', 'core']);
  }
  return { light: true, lightColor: COLORS[energy] || '#b77bff', lightI: giant ? 14 : 11, idle: 'breathe', parts };
}

export const PROPS = {
  kioskHelix: kiosk('glowC', 'glowW', 'glowB'),
  kioskBlack: kiosk('glowR', 'glowP', 'glowR', [[-3.6, 5, 3, 3, 1.2, 1.4, 'hollow'], [-3.2, 6.2, 3.3, 0.8, 0.8, 0.8, 'glowR']]),   // beco do mercado negro
  tent: { parts: [[-4, 0, -4, 8, 0.4, 8, 'concreteD'], [-3.6, 0.4, -3.4, 7.2, 3, 6.8, 'teal'], [-2.6, 3.4, -3.4, 5.2, 1.6, 6.8, 'teal'], [-1.4, 5, -3.4, 2.8, 1, 6.8, 'tealL'], [-1.2, 0.4, 3.42, 2.4, 2.6, 0.1, 'black'], [2.6, 0.4, 3.42, 0.8, 0.8, 0.1, 'glowC']] },
  campfire: { light: true, lightColor: '#ff9b3d', lightI: 9, parts: [[-2.6, 0, -2.6, 5.2, 0.8, 5.2, 'concreteD'], [-1.8, 0.8, -0.4, 3.6, 0.8, 0.8, 'wood'], [-0.4, 0.8, -1.8, 0.8, 0.8, 3.6, 'wood'], [-1, 1.6, -1, 2, 1.8, 2, 'flame'], [-0.5, 3.2, -0.5, 1, 1.2, 1, 'flame2']] },
  converter: { parts: [[-3, 0, -2.4, 6, 5, 4.8, 'steelD'], [-2.4, 5, -1.8, 4.8, 1.2, 3.6, 'steel'], [-2.2, 1.6, 2.42, 1.8, 2.4, 0.1, 'glowA'], [0.4, 1.6, 2.42, 1.8, 2.4, 0.1, 'glowB'], [-0.4, 6.2, -0.4, 0.8, 1.4, 0.8, 'steelD']] },
  kioskOps: kiosk('glowA', 'glowY', 'glowA'),
  kioskShop: kiosk('glowM', 'glowB', 'glowP', [[-3.4, 5.2, 3.2, 1, 1, 1, 'glowC'], [-2, 5.2, 3.2, 1, 1, 1, 'glowC'], [-0.6, 5.2, 3.3, 0.8, 0.8, 0.8, 'glowR']]),   // cápsulas e chip expostos
  kioskMats: kiosk('glowO', 'glowA', 'glowOreCu', [[-3.8, 5.2, 3, 1.2, 1, 1.2, 'glowOreCu'], [-2.4, 5.2, 3, 1.2, 1.2, 1.2, 'glowOreQz'], [-1, 5.2, 3, 1, 0.8, 1, 'glowOreAm'],
    [0.2, 5.2, 3, 1.2, 1.1, 1.2, 'glowOrePr'], [1.6, 5.2, 3, 1, 0.9, 1, 'glowOreMg'], [-4.4, 0, -4.4, 3, 2.4, 3, 'wood'], [-4.2, 2.4, -4.2, 2.6, 0.8, 2.6, 'steel']]),   // bancada de minérios
  kioskAuction: kiosk('glowG', 'glowW', 'glowG', [[-1, 4.8, 2.8, 2, 2.6, 1.4, 'wood'], [-1.3, 7.4, 2.6, 2.6, 0.4, 1.8, 'brass'], [2.6, 5.2, 3, 1, 1.4, 1, 'glowP', 'core'], [-3.8, 5.2, 3, 1.2, 1.2, 1.2, 'glowB', 'core']]),   // púlpito e lotes em exposição
  kioskGene: kiosk('glowGreen', 'glowC', 'glowGreen', [[-0.4, 5.6, 3.2, 0.8, 2.6, 0.2, 'glowGreen', 'core'], [-1.3, 6.5, 3.2, 2.6, 0.8, 0.2, 'glowGreen', 'core'],
    [-4.4, 0, -4.4, 2.6, 0.6, 2.6, 'steelD'], [-4.2, 0.6, -4.2, 2.2, 5, 2.2, 'fluid'], [-4.4, 5.6, -4.4, 2.6, 0.5, 2.6, 'steelD']]),   // cruz holográfica + tanque de cura
  closedShop: shutterShop('glowM', 'glowB'),
  shopHelixDeco: storefront('glowC', 'glowW', 'glowB', 'glowC', [[-3.8, 5.2, 3, 1.2, 1.2, 1.2, 'glowB'], [-2, 5.2, 3.2, 1, 1.6, 1, 'glowC'], [0.8, 5, 3.1, 1.6, 1.4, 1.2, 'coat']]),
  shopGeneDeco: storefront('glowGreen', 'glowC', 'glowGreen', 'glowW', [[-3.8, 4.6, 3.1, 1.4, 2.8, 0.18, 'glowGreen', 'core'], [-1.4, 5.4, 3.1, 2.8, 1, 0.18, 'glowGreen', 'core'], [2.4, 4.4, 3, 1.2, 2.6, 1.2, 'fluid']]),
  shopMatsDeco: storefront('glowO', 'glowA', 'glowOreCu', 'glowW', [[-3.8, 5, 3, 1.1, 1.1, 1.1, 'glowOreCu'], [-2.2, 5.2, 3, 1, 1.3, 1, 'glowOreQz'], [-0.7, 5.1, 3, 1, 1, 1, 'glowOreAm'], [0.8, 5.1, 3, 1, 1.1, 1, 'glowOrePr']]),
  shopTechDeco: storefront('glowM', 'glowB', 'glowP', 'glowC', [[-3.6, 5.3, 3.1, 1, 1, 1, 'glowC'], [-1.8, 5.3, 3.1, 1, 1, 1, 'glowY'], [0.2, 5.1, 3.1, 1.2, 1.2, 1.2, 'glowR']]),
  shopHelixHub: storefront('glowC', 'glowW', 'glowB', 'glowC', [[-3.7, 4.8, 3.1, 2.2, 1.2, 1.3, 'coat'], [-0.2, 4.8, 3.1, 1.2, 1.4, 1.2, 'glowB'], [1.8, 5, 3.2, 0.8, 0.8, 0.8, 'glowC']]),
  shopGeneHub: storefront('glowGreen', 'glowC', 'glowGreen', 'glowW', [[-3.8, 4.7, 3.2, 1.2, 2.6, 0.18, 'glowGreen', 'core'], [-1.8, 5.5, 3.2, 3.4, 0.8, 0.18, 'glowGreen', 'core'], [2.6, 4.4, 3, 1.2, 2.8, 1.2, 'fluid']]),
  shopSupplyHub: storefront('glowM', 'glowB', 'glowP', 'glowC', [[-3.8, 5.2, 3.1, 1, 1, 1, 'glowC'], [-2, 5.2, 3.1, 1, 1, 1, 'glowY'], [-0.2, 5.2, 3.1, 1.2, 1.2, 1.2, 'glowR'], [1.8, 5.2, 3.1, 1, 1, 1, 'glowP']]),
  shopMatsHub: storefront('glowO', 'glowA', 'glowOreCu', 'glowW', [[-3.8, 5, 3, 1.1, 1.1, 1.1, 'glowOreCu'], [-2.2, 5.2, 3, 1, 1.3, 1, 'glowOreQz'], [-0.7, 5.1, 3, 1, 1, 1, 'glowOreAm'], [0.8, 5.1, 3, 1, 1.1, 1, 'glowOrePr'], [2.2, 5.1, 3, 1, 1.1, 1, 'glowOreMg']]),
  shopAuctionHub: storefront('glowG', 'glowW', 'glowG', 'glowP', [[-1.2, 4.6, 2.8, 2.4, 2.4, 1.3, 'wood'], [-1.4, 7, 2.6, 2.8, 0.4, 1.8, 'brass'], [2.6, 5.1, 3, 1, 1.4, 1, 'glowP', 'core'], [-3.8, 5.1, 3, 1.2, 1.2, 1.2, 'glowB', 'core']]),
  shopOpsHub: storefront('glowA', 'glowY', 'glowA', 'glowW', [[-3.8, 5, 3, 1.2, 1.2, 1.2, 'glowA'], [-1.8, 5.2, 3.1, 1.4, 1.4, 1.4, 'glowY'], [0.6, 4.8, 3.1, 1.6, 1.8, 1.4, 'steelD']]),
  shopBlackHub: storefront('glowR', 'glowP', 'glowR', 'glowV', [[-3.6, 5, 3, 3, 1.2, 1.4, 'hollow'], [-3.2, 6.2, 3.3, 0.8, 0.8, 0.8, 'glowR'], [1.2, 5.1, 3.1, 1.2, 1.2, 1.2, 'glowP']]),
  lavarock: { light: true, lightColor: '#ff7a3d', lightI: 4, parts: [[-4, 0, -3.5, 8, 3.2, 7, 'magmaD'], [-3, 3.2, -2.5, 5, 1.6, 5, 'magma'], [-2.6, 0.8, 3.52, 5, 0.4, 0.1, 'glowO'], [-0.2, 1, 3.52, 0.4, 2, 0.1, 'glowO'], [1.6, 3.6, -1, 0.4, 1.4, 2, 'glowO']] },
  icecrystal: { parts: [[-3, 0, -3, 6, 1.4, 6, 'iceD'], [-1.4, 1.4, -1.4, 2.8, 6, 2.8, 'ice'], [1.4, 1.4, 0.2, 1.6, 3.6, 1.6, 'ice'], [-3, 1.4, 0.6, 1.4, 2.4, 1.4, 'iceD'], [-0.6, 7.4, -0.6, 1.2, 1.4, 1.2, 'glowB']] },
  bush: { parts: [[-3.6, 0, -3.6, 7.2, 3, 7.2, 'canopy'], [-2.6, 3, -2.6, 5.2, 1.6, 5.2, 'leaf'], [1, 2.4, 3.6, 1, 1, 0.2, 'glowAcid']] },
  tree: { parts: [[-1, 0, -1, 2, 5, 2, 'bark'], [-3.8, 5, -3.8, 7.6, 3.4, 7.6, 'canopy'], [-2.6, 8.4, -2.6, 5.2, 1.6, 5.2, 'leaf']] },
  monolith: { parts: [[-2, 0, -1.4, 4, 9, 2.8, 'suit'], [-2.4, 0, -1.8, 4.8, 1, 3.6, 'hollow'], [-0.4, 4, 1.42, 0.8, 2.6, 0.1, 'glowV']] },
  deadtree: { parts: [[-0.8, 0, -0.8, 1.6, 7, 1.6, 'hollow'], [0.8, 4, -0.4, 3, 0.8, 0.8, 'hollow'], [-3, 5.6, -0.4, 2.2, 0.7, 0.7, 'hollow'], [2.8, 4.8, -0.4, 0.7, 1.8, 0.7, 'hollow']] },
  glyph: { parts: [[-3, 0, -3, 6, 0.6, 6, 'eWallP'], [-1, 2, -1, 2, 2, 2, 'mem'], [1.6, 4.4, 0.4, 1.2, 1.2, 1.2, 'memD'], [-2.6, 5.4, -1, 1, 1, 1, 'memD'], [-0.4, 7, -0.4, 0.8, 0.8, 0.8, 'glowV']] },
  vein: { parts: [[-4, 0, -3.5, 8, 3, 7, 'concreteD'], [-3, 3, -2.5, 5, 1.6, 5, 'concrete'], [-2.4, 3, 1.4, 1.4, 3.4, 1.4, 'glowA'], [0.6, 3.4, -0.6, 1.2, 2.6, 1.2, 'glowA'], [1.8, 2.2, 2, 1, 1.8, 1, 'glowA'], [-3.6, 2, -1, 1, 1.4, 1, 'glowA']] },
  labtank: { parts: [[-3, 0, -3, 6, 1.2, 6, 'steelD'], [-3, 8, -3, 6, 1, 6, 'steelD'], [-2.2, 1.2, -2.2, 4.4, 6.8, 4.4, 'fluid'], ...m(2.2, 1.2, 2.2, 0.6, 6.8, 0.6, 'steel'), [-1, 3, 2.25, 2, 2.4, 0.1, 'dark']] },
  lamp: { light: true, lightColor: '#5ff2ff', lightI: 9, parts: [[-0.6, 0, -0.6, 1.2, 9, 1.2, 'steelD'], [-0.6, 9, -0.6, 3.4, 0.6, 1.2, 'steelD'], [1.6, 8.2, -0.5, 1.2, 0.8, 1, 'glowC']] },
  neon: { light: true, lightColor: '#ff4fd8', lightI: 8, parts: [[-3.5, 0, -0.5, 1, 6, 1, 'steelD'], [2.5, 0, -0.5, 1, 6, 1, 'steelD'], [-4, 5, -0.6, 8, 4, 1.2, 'black'], [-3.4, 5.6, 0.6, 6.8, 0.6, 0.2, 'glowM'], [-3.4, 7.6, 0.6, 6.8, 0.6, 0.2, 'glowM'], [-2.4, 6.4, 0.6, 1.2, 1, 0.2, 'glowC'], [-0.4, 6.4, 0.6, 1.2, 1, 0.2, 'glowY'], [1.6, 6.4, 0.6, 1.2, 1, 0.2, 'glowC']] },
  console: { parts: [[-3.5, 0, -2.5, 7, 4.5, 5, 'steelD'], [-3, 4.5, -1.5, 6, 3.4, 1, 'black'], [-2.6, 4.9, -0.5, 5.2, 2.6, 0.1, 'glowC'], [-3.2, 3.6, 2, 6.4, 0.5, 0.6, 'glowY']] },
  tank: { parts: [[-4.5, 0, -4.5, 9, 1, 9, 'steelD'], [-4.5, 11.5, -4.5, 9, 1, 9, 'steelD'], ...m(3.8, 1, 3.8, 0.7, 10.5, 0.7, 'steel'), ...m(3.8, 1, -4.5, 0.7, 10.5, 0.7, 'steel'), [-4, 1, -4.4, 8, 0.3, 8.8, 'glowV']] },
  crate: { parts: [[-3.8, 0, -3.8, 7.6, 5, 7.6, 'steel'], [-3.9, 2, -3.9, 7.8, 0.6, 7.8, 'steelD'], [-1.6, 3, 3.8, 3.2, 1, 0.15, 'stripeY']] },
  barrier: { parts: [[-4.5, 0, -0.6, 1, 4.4, 1.2, 'stripeK'], [3.5, 0, -0.6, 1, 4.4, 1.2, 'stripeK'], [-4.8, 3, -0.4, 9.6, 1.2, 0.8, 'stripeY'], [-2.4, 3, 0.45, 1.2, 1.2, 0.1, 'stripeK'], [1.2, 3, 0.45, 1.2, 1.2, 0.1, 'stripeK'], [-0.4, 4.4, -0.4, 0.8, 0.6, 0.8, 'glowO']] },
  bench: { parts: [[-4, 0, -1, 0.8, 2, 2, 'steelD'], [3.2, 0, -1, 0.8, 2, 2, 'steelD'], [-4.4, 2, -1.6, 8.8, 0.6, 3.2, 'wood'], [-4.4, 2.6, -1.8, 8.8, 2, 0.5, 'wood']] },
  vending: { light: true, lightColor: '#ffe066', lightI: 5, parts: [[-3.5, 0, -2.5, 7, 9.5, 5, 'magenta'], [-2.8, 2.5, 2.5, 4, 6, 0.1, 'glowW'], [1.6, 4, 2.5, 1.2, 2, 0.1, 'glowY']] },
  crystal: { parts: [[-2, 0, -2, 4, 2, 4, 'violetD'], [-1.2, 2, -1.2, 2.4, 5, 2.4, 'glowV'], [1, 1.5, 0, 1.4, 3, 1.4, 'glowC'], [-2.6, 1.2, 0.6, 1.2, 2.4, 1.2, 'glowV']] },
  portal: ringPortal('violetD', 'glowV', 'glowC', 'steelD', false, false),
  // Fenda Estática: bobina de Tesla e torre de transmissão
  tesla: { light: true, lightColor: '#e8ff4a', lightI: 6, idle: 'breathe', parts: [[-2.6, 0, -2.6, 5.2, 1, 5.2, 'steelD'], [-1, 1, -1, 2, 5, 2, 'brass'], [-1.6, 2, -1.6, 3.2, 0.5, 3.2, 'steelD'], [-1.6, 3.6, -1.6, 3.2, 0.5, 3.2, 'steelD'], [-1.8, 6, -1.8, 3.6, 0.8, 3.6, 'steel'], [-1, 6.8, -1, 2, 2, 2, 'glowY', 'core']] },
  pylon: { parts: [...m(2.2, 0, -2.2, 0.6, 10, 0.6, 'steelD'), ...m(2.2, 0, 1.6, 0.6, 10, 0.6, 'steelD'), [-2.8, 4, -0.3, 5.6, 0.4, 0.6, 'steelD'], [-3.6, 8, -0.3, 7.2, 0.5, 0.6, 'steelD'], ...m(3.2, 6.8, -0.2, 0.4, 1.2, 0.4, 'glowY'), [-2.2, 10, -2.2, 4.4, 0.4, 4.4, 'steelD']] },
  // corpo de explorador de uma expedição anterior: deitado, mochila, capacete com lanterna fraca e páginas soltas
  corpse: { parts: [[-4.4, 0, -1.3, 3.2, 0.9, 1.1, 'jeans'], [-4.4, 0, 0.3, 3.2, 0.9, 1.1, 'jeans'], [-4.8, 0, -1.4, 0.8, 1.2, 1.3, 'boot'], [-4.8, 0, 0.2, 0.8, 1.2, 1.3, 'boot'],
    [-1.2, 0, -1.7, 3.8, 1.4, 3.4, 'coatE'], [2.6, 0, -1.1, 2.2, 1.6, 2.2, 'skinP'], [2.4, 0.1, -1.3, 2.6, 1.9, 2.6, 'helm'], [5, 0.6, -0.5, 0.3, 0.7, 0.9, 'glowA'],
    [-0.8, 0, 1.8, 2.8, 1.7, 1.9, 'pack'], [-0.2, 0, -3.4, 1, 0.7, 1.8, 'coatE'], [1.4, 0, 2.6, 1.3, 0.1, 1, 'white2'], [-2.4, 0, 2.8, 1, 0.1, 0.8, 'white2'], [0.6, 0, -4, 1.1, 0.25, 0.9, 'glowB']] },
  cache: { parts: [[-2, 0, -1.6, 4, 3, 3.2, 'pack'], [-2.2, 3, -1.8, 4.4, 0.8, 3.6, 'packD'], [-0.6, 1, 1.62, 1.2, 1.2, 0.1, 'glowB'], [-1.8, 0.6, -1.8, 0.4, 2.4, 0.2, 'packD'], [1.4, 0.6, -1.8, 0.4, 2.4, 0.2, 'packD'], [2, 0, -1, 1.4, 0.6, 2, 'helm']] },
  // ---------- ACF e Horizonte (v15) ----------
  van: { light: true, lightColor: '#7fc8ff', lightI: 5, parts: [[-4.6, 1, -4.4, 9.2, 4.4, 8.8, 'white2'], [-4.7, 3, -4.5, 9.4, 0.8, 9, 'blue'], [-4.4, 5.4, -4, 8.8, 0.3, 4, 'steelD'], [-2.4, 5.7, -1, 1.6, 0.6, 1, 'glowB'], [0.8, 5.7, -1, 1.6, 0.6, 1, 'glowR'], ...m(3, 0, 2.4, 1.4, 1.6, 1.6, 'black'), ...m(3, 0, -3.6, 1.4, 1.6, 1.6, 'black'), [-3.6, 3.2, 4.42, 7.2, 1.8, 0.1, 'glass2']] },
  turbine: { light: true, lightColor: '#ff9b3d', lightI: 6, idle: 'breathe', parts: [[-4.4, 0, -4.4, 8.8, 1.2, 8.8, 'ironD'], [-3.4, 1.2, -3.4, 6.8, 8, 6.8, 'iron'], [-3.6, 3, -3.6, 7.2, 0.6, 7.2, 'ironD'], [-3.6, 6.6, -3.6, 7.2, 0.6, 7.2, 'ironD'], [-1.4, 3.8, 3.42, 2.8, 2.4, 0.1, 'glowO', 'core'], [-2.4, 9.2, -2.4, 4.8, 1, 4.8, 'steelD'], [2.6, 9.2, 0.4, 0.8, 2, 0.8, 'glowC']] },
  pipe: { parts: [[-5, 1, -1, 10, 2, 2, 'rust'], [-5, 0, -0.6, 1, 1, 1.2, 'ironD'], [4, 0, -0.6, 1, 1, 1.2, 'ironD'], [-1, 1, -1.1, 0.6, 2.2, 2.2, 'ironD'], [1.6, 3, -0.3, 0.6, 0.4, 0.6, 'glowO']] },
  adboardHz: { light: true, lightColor: '#ff9b3d', lightI: 5, idle: 'breathe', parts: [[-0.6, 0, -0.6, 1.2, 6, 1.2, 'steelD'], [-4.4, 6, -0.4, 8.8, 5, 0.8, 'black'], [-4, 6.4, 0.45, 8, 4.2, 0.1, 'glowO', 'core'], [-3.2, 7.4, 0.6, 2.4, 2.4, 0.1, 'glowY'], [0, 9, 0.6, 3.2, 0.5, 0.1, 'glowW']] },
  meter: { light: true, lightColor: '#5ff2ff', lightI: 4, parts: [[-3, 0, -2.4, 6, 3.6, 4.8, 'ironD'], [-2.6, 3.6, -2, 5.2, 2.4, 4, 'iron'], [-1.6, 4, 2.02, 3.2, 1.6, 0.1, 'glowC'], [-3.4, 1.2, -1, 0.6, 1.4, 2, 'rust'], [2.8, 1.2, -1, 0.6, 1.4, 2, 'rust']] },
  // ---------- cidade e Bioparque (v14) ----------
  metro: { light: true, lightColor: '#5ff2ff', lightI: 6, parts: [[-4.6, 0, -4, 9.2, 0.6, 8, 'concreteD'], [-3.6, 0.6, -3, 7.2, 0.2, 6, 'black'], [-3.6, 0, 3.6, 7.2, 3.4, 0.4, 'steelD'],
    ...m(4, 0, -4, 0.8, 9, 0.8, 'steelD'), [-4.8, 9, -4.4, 9.6, 3, 1.4, 'steelD'], [-1.6, 9.6, -2.95, 3.2, 1.8, 0.1, 'glowC'], [-0.4, 10, -2.9, 0.8, 1, 0.1, 'black'], [-4.2, 9.4, -2.95, 1.6, 0.4, 0.1, 'glowY'], [2.6, 9.4, -2.95, 1.6, 0.4, 0.1, 'glowY']] },
  fountain: { idle: 'breathe', parts: [[-4.4, 0, -4.4, 8.8, 1.4, 8.8, 'concrete'], [-3.6, 1.4, -3.6, 7.2, 0.3, 7.2, 'sea2'], [-0.8, 1.4, -0.8, 1.6, 4, 1.6, 'concreteD'], [-1.8, 5.4, -1.8, 3.6, 0.6, 3.6, 'concrete'], [-0.6, 6, -0.6, 1.2, 1.6, 1.2, 'glowC', 'core'], [-1.4, 1.75, 1.6, 0.8, 0.5, 0.8, 'glowB']] },
  cage: { parts: [[-3.4, 0, -3.4, 6.8, 0.6, 6.8, 'steelD'], ...m(2.8, 0.6, 2.8, 0.4, 5, 0.4, 'steel'), ...m(2.8, 0.6, -3.2, 0.4, 5, 0.4, 'steel'), ...m(0.8, 0.6, 2.8, 0.3, 5, 0.3, 'steelL'), [-3.4, 5.6, -3.4, 6.8, 0.5, 6.8, 'steelD'], [-2, 6.1, 2.9, 4, 1.2, 0.3, 'jkRed'], [-1.6, 6.4, 3.25, 3.2, 0.5, 0.1, 'glowY']] },
  battery: { light: true, lightColor: '#e8ff4a', lightI: 4, parts: [[-3.4, 0, -3, 6.8, 9, 6, 'magenta'], [-2.8, 1.4, 3, 5.6, 6, 0.2, 'glowW'], [-3.2, 0, -3, 0.6, 9, 0.6, 'steelD'], [-2.6, 9, -2.6, 5.2, 0.6, 5.2, 'steelD'], [-1.2, 3.6, 3.25, 2.4, 0.6, 0.1, 'glowY']] },
  cart: { parts: [[-4, 1.4, -3, 7, 3, 6, 'rust'], [-4.2, 4.4, -3.2, 7.4, 0.5, 6.4, 'ironD'], ...m(2.6, 0, -2.4, 1.2, 1.6, 1.2, 'black'), ...m(2.6, 0, 1.4, 1.2, 1.6, 1.2, 'black'), [-2.6, 4.9, -2, 2.4, 1.6, 2.4, 'glowA'], [0.2, 4.9, -0.6, 2, 1.2, 2, 'concrete'], [3, 2.6, -0.4, 2.6, 0.4, 0.8, 'steelD']] },
  adboard: { light: true, lightColor: '#ff4fd8', lightI: 6, idle: 'breathe', parts: [[-0.6, 0, -0.6, 1.2, 6, 1.2, 'steelD'], [-4.4, 6, -0.4, 8.8, 5, 0.8, 'black'], [-4, 6.4, 0.45, 8, 4.2, 0.1, 'glowM', 'core'], [-3.2, 7.4, 0.6, 2.4, 2.4, 0.1, 'glowC'], [0, 9, 0.6, 3.2, 0.5, 0.1, 'glowW'], [0, 8, 0.6, 2.4, 0.5, 0.1, 'glowW']] },
  vitrine: { light: true, lightColor: '#9be7f2', lightI: 4, parts: [[-4.4, 0, -4, 8.8, 1.2, 8, 'steelD'], [-4.4, 9, -4, 8.8, 0.8, 8, 'steelD'], ...m(4, 1.2, 3.6, 0.4, 7.8, 0.4, 'steel'), ...m(4, 1.2, -4, 0.4, 7.8, 0.4, 'steel'), [-4, 1.2, 3.9, 8, 0.3, 0.1, 'glass2'], [-4, 8.6, 3.9, 8, 0.3, 0.1, 'glass2'], [-1.6, 0.4, 4.05, 3.2, 0.6, 0.1, 'glowC']] },
  chestGold: { parts: [[-3.4, 0, -2.4, 6.8, 3.2, 4.8, 'brass'], [-3.5, 3.2, -2.5, 7, 1.6, 5, 'glowG'], [-0.7, 2.2, 2.42, 1.4, 1.6, 0.2, 'glowW'], ...m(2.6, 0, 2.42, 0.6, 3.2, 0.12, 'steelD')] },
  nexusGate: ringPortal('steel', 'glowC', 'glowV', 'steelD', false, true),
  nexusConsole: { light: true, lightColor: '#5ff2ff', lightI: 8, idle: 'breathe', parts: [[-4.4, 0, -3.2, 8.8, 4.8, 6.4, 'steelD'], [-3.8, 4.8, -2.4, 7.6, 3.6, 2.6, 'black'], [-3.4, 5.3, -0.2, 6.8, 2.6, 0.14, 'glowC'], [-3.6, 3.6, 2.6, 7.2, 0.5, 0.7, 'glowY'], [-0.8, 8.6, 2.2, 1.6, 1.6, 0.2, 'glowV', 'core']] },
  portal2: ringPortal('hollow', 'glowP', 'glowC', 'steelD', true, false),
  tankBroken: { parts: [[-3, 0, -3, 6, 1.2, 6, 'steelD'], [-3, 8, -3, 6, 1, 6, 'steelD'], ...m(2.2, 1.2, 2.2, 0.6, 6.8, 0.6, 'steel'), [-2.2, 1.2, -2.2, 4.4, 2.2, 4.4, 'glass2'], [-2.2, 3.4, -2.2, 1.6, 3, 4.4, 'glass2'], [1, 1.2, 2.3, 1, 0.8, 0.8, 'glowGreen']] },
  chest: { parts: [[-3, 0, -2.2, 6, 3, 4.4, 'steelD'], [-3.1, 3, -2.3, 6.2, 1.4, 4.6, 'cyan'], [-0.6, 2.2, 2.2, 1.2, 1.4, 0.2, 'glowY']] },
};
// veio de cada minério: os cristais do veio padrão (glowA) trocados pela cor do minério
for (const [id, c] of Object.entries({ cobre: 'glowOreCu', quartzo: 'glowOreQz', ambar: 'glowOreAm', obsidiana: 'glowOreOb', prisma: 'glowOrePr', magnetita: 'glowOreMg' }))
  PROPS['vein_' + id] = { parts: PROPS.vein.parts.map(p => (p[6] === 'glowA' ? [p[0], p[1], p[2], p[3] * 1.15, p[4] * 1.2, p[5] * 1.15, c] : p)).concat([[-1, 4.6, -1.6, 1, 1.6, 1, c], [2.4, 3, -2, 0.8, 1.2, 0.8, c]]) };
