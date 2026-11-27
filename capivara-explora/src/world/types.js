// Tipos de objeto: descrição visual (a IA vê) e efeitos ocultos (só o código conhece).
// (módulo 6/20 da Capivara Explora)
import * as THREE from 'three';
import { G, H } from '../core/runtime.js';
import { isNight, rand } from '../core/config.js';

// ---------------------------------------------------------------------
// 4. TIPOS DE OBJETO: descrição visual (a IA vê) + efeitos ocultos (só o código)
//    Cada efeito devolve { d: deltas de status, msg: resultado em texto, anim, extra }
// ---------------------------------------------------------------------
const TYPES = {
  arvore_frutas: {
    nome: 'árvore de frutinhas', desc: 'uma árvore baixa cheia de frutinhas vermelhas brilhantes',
    efeitos: {
      comer: () => Math.random() < 0.15
        ? { d: { fome: -10, humor: -12 }, msg: 'Você comeu frutinhas da árvore, mas estas ainda estavam verdes e ácidas. A barriga doeu um pouco.', anim: 'comer' }
        : { d: { fome: -30, humor: +10 }, msg: 'Você comeu as frutinhas vermelhas da árvore. Doces e suculentas! A fome diminuiu bastante.', anim: 'comer' },
      cheirar: () => ({ d: { humor: +3 }, msg: 'As frutinhas têm um cheiro doce e convidativo.', anim: 'cheirar' }),
    },
  },
  arvore: {
    nome: 'árvore alta', desc: 'uma árvore alta e frondosa, sem frutos',
    efeitos: {
      sentar: () => ({ d: { energia: +6, humor: +4 }, msg: 'Você sentou na sombra da árvore. Fresquinho.', anim: 'sentar' }),
      comer: () => ({ d: { humor: -5 }, msg: 'Você mordeu a casca da árvore. Gosto de madeira. Não matou a fome.', anim: 'comer' }),
    },
  },
  arbusto_amoras: {
    nome: 'arbusto de amoras', desc: 'um arbusto baixo e redondo com cachos de bolinhas roxo-escuras',
    efeitos: {
      comer: () => Math.random() < 0.15
        ? { d: { fome: -6, humor: -12 }, msg: 'Você comeu bolinhas roxas, mas estas estavam passadas e amargas. Ficou um gosto ruim na boca.', anim: 'comer' }
        : { d: { fome: -20, humor: +8 }, msg: 'Você comeu as bolinhas roxas do arbusto. Doces, com um fundo azedinho. A fome diminuiu.', anim: 'comer' },
      cheirar: () => ({ d: { humor: +2 }, msg: 'O arbusto tem um cheiro de fruta madura.', anim: 'cheirar' }),
    },
  },
  capim_alto: {
    nome: 'touceira de capim', desc: 'uma touceira de capim alto, verde-claro e macio',
    efeitos: {
      comer: () => ({ d: { fome: -15, humor: +5 }, msg: 'Você mastigou o capim alto devagar. Fresco e macio, parece feito para você.', anim: 'comer' }),
      sentar: () => ({ d: { energia: +5, humor: +3 }, msg: 'Você se acomodou no meio do capim. Ele faz cócegas na barriga.', anim: 'sentar' }),
    },
  },
  arbusto_espinhos: {
    nome: 'arbusto de folhas pontudas', desc: 'um arbusto de folhas pontudas com frutinhas amarelas no meio',
    efeitos: {
      comer: () => ({ d: { fome: -10, humor: -16, saude: -4 }, msg: 'Você tentou alcançar as frutinhas amarelas e as folhas pontudas furaram o focinho. Comeu pouco e doeu.', anim: 'tremer' }),
      cheirar: () => ({ d: { humor: -3 }, msg: 'Ao cheirar de perto, uma folha pontuda espetou o nariz.', anim: 'tremer' }),
    },
  },
  arbusto_bagas_brancas: {
    nome: 'arbusto de bagas brancas', desc: 'um arbusto delicado, verde-azulado, com bagas brancas peroladas',
    efeitos: {
      comer: () => ({ d: { fome: -8, energia: -20 }, msg: 'Você comeu as bagas brancas. Pouco tempo depois veio uma sonolência pesada, as pálpebras caindo.', anim: 'dormir' }),
      cheirar: () => ({ d: {}, msg: 'As bagas brancas quase não têm cheiro.', anim: 'cheirar' }),
    },
  },
  fonte: {
    nome: 'fonte de pedra', desc: 'uma pequena bacia de pedras com água limpa, alimentada por uma bica que escorre sem parar',
    efeitos: {
      beber: () => ({ d: { sede: -50, humor: +5 }, msg: 'Você bebeu da fonte. A água é limpa, fria e tem gosto de pedra.', anim: 'beber' }),
      cheirar: () => ({ d: { humor: +2 }, msg: 'A fonte cheira a musgo e água corrente.', anim: 'cheirar' }),
    },
  },
  abrigo: {
    nome: 'abrigo de galhos', desc: 'um abrigo simples de galhos e folhas largas, com um forro de folhas secas no chão',
    efeitos: {
      dormir: () => { const n = isNight(); return { d: { energia: n ? +70 : +40 }, msg: n ? 'Você dormiu no abrigo de galhos durante a noite. O forro de folhas é quente e o teto segura o sereno.' : 'Você cochilou no abrigo de galhos. Um descanso curto, mas bom.', anim: 'dormir' }; },
      sentar: () => ({ d: { energia: +8, humor: +4 }, msg: 'Você sentou sob o abrigo e ficou olhando o campo lá fora.', anim: 'sentar' }),
    },
  },
  // ---- gramas: comida fraca, cada uma com seu efeito ----
  grama_baixa: {
    nome: 'grama baixa', desc: 'um tapete de grama baixa e verde',
    efeitos: { comer: () => ({ d: { fome: -6 }, msg: 'Você pastou a grama baixa. Comida simples, mas sempre está por perto.', anim: 'comer' }) },
  },
  trevo: {
    nome: 'trevo', desc: 'uma moita baixa de folhinhas redondas, de três em três, com florzinhas brancas',
    efeitos: {
      comer: () => ({ d: { fome: -8, humor: +4 }, msg: 'Você comeu as folhinhas redondas. Macias e levemente adocicadas.', anim: 'comer' }),
      cheirar: () => ({ d: { humor: +2 }, msg: 'As florzinhas brancas têm um perfume suave de mel.', anim: 'cheirar' }),
    },
  },
  grama_seca: {
    nome: 'grama seca', desc: 'um tufo de grama seca e amarelada',
    efeitos: { comer: () => ({ d: { fome: -2, sede: +5 }, msg: 'Você mastigou a grama seca. Parece palha: quase não alimenta e dá sede.', anim: 'comer' }) },
  },
  // ---- coisas que não se comem: só cheirar, investigar ou sentar ----
  pinha: {
    nome: 'pinha', desc: 'uma coisa marrom, dura e cheia de escamas, caída no chão',
    efeitos: {
      comer: () => ({ d: { humor: -4 }, msg: 'Você tentou morder. Duro como pedra e sem gosto nenhum.', anim: 'curiosa' }),
      cheirar: () => ({ d: { humor: +2 }, msg: 'Cheira a resina, um cheiro forte e limpo.', anim: 'cheirar' }),
      investigar: () => ({ d: { humor: +3 }, msg: 'Você empurrou com o focinho e ela rolou um pouquinho. As escamas se abrem como pétalas de madeira.', anim: 'curiosa' }),
    },
  },
  formigueiro: {
    nome: 'formigueiro', desc: 'um montinho de terra com um furo no topo e muitos pontinhos escuros andando',
    efeitos: {
      cheirar: () => ({ d: {}, msg: 'Cheiro ácido. Os pontinhos andam em fila, sem parar, como se soubessem para onde vão.', anim: 'cheirar' }),
      investigar: () => ({ d: { humor: -12, saude: -5 }, msg: 'Você enfiou o focinho no montinho e os pontinhos subiram pelo nariz e picaram! Ardeu bastante.', anim: 'tremer' }),
      comer: () => ({ d: { humor: -15, fome: -1, saude: -7 }, msg: 'Você abocanhou a terra do montinho. Dezenas de picadas na boca. Péssima ideia.', anim: 'tremer' }),
    },
  },
  tronco_musgo: {
    nome: 'tronco caído', desc: 'um tronco caído, coberto de musgo verde e macio',
    efeitos: {
      sentar: () => ({ d: { energia: +6, humor: +7 }, msg: 'Você se esfregou no musgo e coçou as costas no tronco. Uma delícia.', anim: 'sentar' }),
      cheirar: () => ({ d: { humor: +2 }, msg: 'Cheiro de terra molhada e madeira velha.', anim: 'cheirar' }),
      comer: () => ({ d: { fome: -2, humor: -2 }, msg: 'Você mordiscou o musgo. Úmido e sem graça.', anim: 'comer' }),
    },
  },
  caramujo: {
    nome: 'caramujo', desc: 'uma bolinha em espiral, laranja, que se move bem devagar na beira da água',
    efeitos: {
      investigar: () => ({ d: { humor: +4 }, msg: 'Quando você chegou perto, o bichinho se escondeu dentro da espiral. Ele carrega a própria casa.', anim: 'curiosa' }),
      cheirar: () => ({ d: {}, msg: 'Cheiro de lodo e água parada.', anim: 'cheirar' }),
      comer: () => ({ d: { humor: -5 }, msg: 'A espiral é dura demais. Você desistiu.', anim: 'curiosa' }),
    },
  },
  ninho: {
    nome: 'ninho', desc: 'um círculo de gravetos trançados com três bolinhas azul-claras dentro',
    efeitos: {
      cheirar: () => { H.swoopNow(); return { d: { humor: -6 }, msg: 'Você cheirou as bolinhas azuis e o bicho-que-voa apareceu gritando e deu um rasante na sua cabeça.', anim: 'tremer' }; },
      investigar: () => { H.swoopNow(); return { d: { humor: -8 }, msg: 'Assim que você se aproximou, o bicho-que-voa mergulhou do céu para defender as bolinhas azuis.', anim: 'tremer' }; },
      comer: () => { H.swoopNow(); return { d: { humor: -12 }, msg: 'Você tentou abocanhar as bolinhas azuis e foi atacada pelo bicho-que-voa. Ele não deixou.', anim: 'tremer' }; },
    },
  },
  teia: {
    nome: 'teia', desc: 'fios finíssimos e brilhantes esticados entre dois galhos, com algo pequeno e escuro parado no meio',
    efeitos: {
      investigar: () => ({ d: { humor: +5 }, msg: 'Você observou os fios por um bom tempo. Alguém pequeno construiu isso sozinho, fio por fio.', anim: 'curiosa' }),
      cheirar: () => ({ d: { humor: -2 }, msg: 'Os fios grudaram no focinho. Você espirrou para se livrar deles.', anim: 'espirrar' }),
    },
  },
  coco: {
    nome: 'cocô', desc: 'umas bolinhas ovais marrons no chão, com cheiro forte', temp: true,
    efeitos: {
      cheirar: () => ({ d: { humor: +2 }, msg: 'Cheiro forte e familiar. É seu. Parece dizer que este lugar agora é um pouco seu.', anim: 'cheirar' }),
      comer: () => ({ d: { humor: -15 }, msg: 'Você provou. Não. Definitivamente não.', anim: 'tremer' }),
    },
  },
  lagoa: {
    nome: 'lagoa', desc: 'uma lagoa pequena e rasa, de água parada, cercada de plantas',
    efeitos: {
      beber: () => ({ d: { sede: -35 }, msg: 'Você bebeu da lagoa. Água morna, com gosto de folha.', anim: 'beber' }),
      nadar: () => ({ d: { humor: +15, energia: -6 }, msg: 'Você entrou na lagoa. É rasa, mas dá para boiar. Nenhum bicho de dentes por aqui.', anim: 'nadar' }),
    },
  },
  taboa: {
    nome: 'taboa', desc: 'uma touceira de folhas compridas com espigas marrons em forma de salsicha, na beira da água',
    efeitos: {
      comer: () => ({ d: { fome: -14, humor: +4 }, msg: 'Você mastigou os talos macios da base. Gosto de água doce. Muito bom.', anim: 'comer' }),
      cheirar: () => ({ d: {}, msg: 'Cheiro de lama e de verde molhado.', anim: 'cheirar' }),
    },
  },
  cacto: {
    nome: 'cacto', desc: 'uma planta grossa e verde, cheia de pontinhos, com uma flor rosa no topo',
    efeitos: {
      comer: () => ({ d: { sede: -10, humor: -14, saude: -5 }, msg: 'Você mordeu a planta grossa: os pontinhos espetaram a boca, mas lá dentro tinha água. Doeu e matou um pouco a sede.', anim: 'tremer' }),
      cheirar: () => ({ d: { humor: -3 }, msg: 'Você chegou perto demais e um espinho picou o nariz.', anim: 'tremer' }),
      investigar: () => ({ d: { humor: +4 }, msg: 'A flor rosa nasce no meio dos espinhos. Bonita e protegida ao mesmo tempo.', anim: 'curiosa' }),
    },
  },
  samambaia: {
    nome: 'samambaia', desc: 'uma planta de folhas compridas e recortadas que se curvam até o chão',
    efeitos: {
      comer: () => ({ d: { fome: -2, humor: -6 }, msg: 'Você provou as folhas recortadas. Amargas. Não é comida boa.', anim: 'comer' }),
      sentar: () => ({ d: { energia: +5, humor: +3 }, msg: 'Você deitou embaixo das folhas curvadas. Sombra fresca e úmida.', anim: 'sentar' }),
      cheirar: () => ({ d: { humor: +1 }, msg: 'Cheiro de mata fechada.', anim: 'cheirar' }),
    },
  },
  pedra_brilhante: {
    nome: 'cristais', desc: 'pedras transparentes e pontudas que brilham quando a luz bate',
    efeitos: {
      investigar: () => ({ d: { humor: +9 }, msg: 'A luz entra nas pedras transparentes e sai colorida. Você ficou olhando por muito tempo.', anim: 'curiosa' }),
      comer: () => ({ d: { humor: -8 }, msg: 'Duras como nada que você já mordeu. O dente doeu.', anim: 'tremer' }),
      cheirar: () => ({ d: {}, msg: 'Não têm cheiro nenhum. São frias.', anim: 'cheirar' }),
    },
  },
  computador: {
    nome: 'computador', desc: 'uma caixinha fina e aberta em cima de um toco, com uma parte lisa que brilha como água parada',
    efeitos: {
      investigar: () => ({ d: { humor: +6 }, msg: 'Você encostou o focinho nas pecinhas de baixo e apareceram sinais na parte que brilha. Ela responde ao toque. Parece que dá para perguntar coisas a ela (ação pesquisar).', anim: 'curiosa' }),
      cheirar: () => ({ d: {}, msg: 'Cheira a nada. É morna, como uma pedra no sol.', anim: 'cheirar' }),
      comer: () => ({ d: { humor: -5 }, msg: 'Você mordeu a borda. Dura e sem gosto. Melhor não.', anim: 'curiosa' }),
    },
  },
  gopro: {
    nome: 'câmera', desc: 'uma coisinha preta e lisa com um olho de vidro azul na frente e uma alça', temp: true,
    efeitos: {
      pegar: () => ({ d: { humor: +6 }, msg: 'Você pegou a coisinha de olho azul e ela ficou presa na sua cabeça pela alça. Junto dela havia um papel dobrado com instruções, que você leu com atenção: o MANUAL DA CÂMERA agora faz parte do que você sabe.', anim: 'comer', pickup: true }),
      investigar: () => ({ d: { humor: +3 }, msg: 'Tem um botão vermelho. Quando você encostou, ouviu um clique e uma luz piscou. Talvez dê para levar com você (ação pegar).', anim: 'curiosa' }),
      cheirar: () => ({ d: {}, msg: 'Cheiro de coisa nova, que não nasceu aqui.', anim: 'cheirar' }),
    },
  },
  jacare: {
    nome: 'jacaré', desc: 'dois olhinhos e um dorso escuro e rugoso boiando na água grande', mobile: true,
    efeitos: { investigar: o => H.jacareAtaca(o) },
  },
  cogumelo_vermelho: {
    nome: 'cogumelo vermelho com pintas', desc: 'um cogumelo de chapéu vermelho vivo com pintinhas brancas, muito bonito',
    efeitos: {
      comer: () => { G.sickUntil = G.gameTime + 20; return { d: { humor: -30, fome: -5, saude: -12 }, msg: 'Você comeu o cogumelo vermelho com pintas. Sentiu um enjoo fortíssimo e o mundo começou a girar!', anim: 'tremer', remove: true }; },
      cheirar: () => ({ d: {}, msg: 'O cogumelo vermelho tem um cheiro estranho, meio azedo.', anim: 'cheirar' }),
    },
  },
  cogumelo_marrom: {
    nome: 'cogumelo marrom', desc: 'um cogumelo simples de chapéu marrom',
    efeitos: {
      comer: () => ({ d: { fome: -15 }, msg: 'Você comeu o cogumelo marrom. Sabor de terra, mas encheu um pouco a barriga.', anim: 'comer', remove: true }),
    },
  },
  lago: {
    nome: 'lago', desc: 'um lago grande de água azul e calma',
    efeitos: {
      beber: () => ({ d: { sede: -40 }, msg: 'Você bebeu a água fresquinha do lago. A sede passou!', anim: 'beber' }),
      nadar: () => ({ d: { humor: +25, energia: -10 }, msg: 'Você nadou no lago! Sensação maravilhosa de flutuar. Ficou muito feliz, mas um pouco cansada.', anim: 'nadar' }),
    },
  },
  riacho: {
    nome: 'riacho', desc: 'um riacho estreito de água corrente que faz barulhinho',
    efeitos: {
      beber: () => ({ d: { sede: -25 }, msg: 'Você bebeu água do riacho. Geladinha!', anim: 'beber' }),
      nadar: () => ({ d: { humor: +5 }, msg: 'O riacho é raso demais para nadar, mas molhou as patinhas.', anim: 'pular' }),
    },
  },
  pedra: {
    nome: 'pedra grande', desc: 'uma pedra grande, lisa e cinzenta',
    efeitos: {
      sentar: () => ({ d: { energia: +10, humor: +5 }, msg: 'Você sentou na pedra grande e ficou contemplando o horizonte. Um momento de paz profunda.', anim: 'sentar' }),
      comer: () => ({ d: { humor: -8, saude: -2 }, msg: 'Você tentou morder a pedra. Doeu o dente!', anim: 'tremer' }),
    },
  },
  caverna: {
    nome: 'caverna', desc: 'a entrada de uma caverna escura e silenciosa',
    efeitos: {
      dormir: () => { const n = isNight(); return { d: { energia: n ? +100 : +50 }, msg: n ? 'Você dormiu na caverna durante a noite. Sono profundo e reparador, energia lá em cima!' : 'Você tirou um cochilo na caverna escura. Recuperou bastante energia.', anim: 'dormir' }; },
      investigar: () => ({ d: { humor: +3 }, msg: 'A caverna é escura, seca e protegida da chuva. Ecoa quando você respira.', anim: 'curiosa' }),
    },
  },
  flores: {
    nome: 'flores coloridas', desc: 'um canteiro de flores coloridas',
    efeitos: {
      cheirar: () => Math.random() < 0.45
        ? { d: { humor: +5 }, msg: 'Você cheirou as flores e... ATCHIM! Espirrou forte, mas o perfume era bom.', anim: 'espirrar' }
        : { d: { humor: +5 }, msg: 'Você cheirou as flores. Perfume delicioso!', anim: 'cheirar' },
      comer: () => ({ d: { fome: -5, humor: -3 }, msg: 'Você comeu umas flores. Amargas.', anim: 'comer' }),
    },
  },
  passaro: {
    nome: 'pássaro azul', desc: 'um passarinho azul que voa por aí', mobile: true,
    efeitos: {
      investigar: () => { H.scareBird(); return Math.random() < 0.5
        ? { d: { humor: -10 }, msg: 'Você chegou perto do pássaro e ele bateu as asas na sua cara! Que susto!', anim: 'tremer' }
        : { d: { humor: +8 }, msg: 'O pássaro te olhou, cantou um pouquinho e voou. Que fofo.', anim: 'pular' }; },
    },
  },
  // ---- surpresas do botão 🎁 ----
  melancia: {
    nome: 'melancia', desc: 'uma fruta enorme, verde e listrada', surprise: true,
    efeitos: {
      comer: () => ({ d: { fome: -40, sede: -20, humor: +20 }, msg: 'Você comeu a melancia inteira! Doce, molhada, a melhor coisa do mundo!', anim: 'pular', remove: true }),
    },
  },
  bola: {
    nome: 'bola colorida', desc: 'uma esfera colorida e brilhante, leve', surprise: true,
    efeitos: {
      investigar: o => { o.vel = new THREE.Vector3(rand(-3, 3), 0, rand(-3, 3)); return { d: { humor: +20, energia: -8 }, msg: 'Você encostou o focinho na esfera e ela saiu rolando! Muito divertido!', anim: 'pular' }; },
      comer: () => ({ d: { humor: -5 }, msg: 'Você tentou morder a bola. Borrachuda. Nada comestível.', anim: 'curiosa' }),
    },
  },
  caixa: {
    nome: 'caixa misteriosa', desc: 'uma caixa roxa com laço dourado', surprise: true,
    efeitos: {
      investigar: () => Math.random() < 0.6
        ? { d: { humor: +30 }, msg: 'Você abriu a caixa e saíram confetes coloridos! Uma festa só sua!', anim: 'pular', remove: true }
        : { d: { humor: -15 }, msg: 'Você abriu a caixa e um boneco de mola pulou na sua cara! SUSTO!', anim: 'tremer', remove: true },
      cheirar: () => ({ d: {}, msg: 'A caixa cheira a papelão e mistério.', anim: 'cheirar' }),
    },
  },
};
const DISCOVERY_TEXT = {
  'nadar:lago': 'nadar é incrível', 'comer:arvore_frutas': 'frutinhas vermelhas são deliciosas',
  'comer:cogumelo_vermelho': 'cogumelo vermelho dá enjoo', 'comer:cogumelo_marrom': 'cogumelo marrom mata a fome',
  'beber:lago': 'água do lago', 'dormir:caverna': 'dormir na caverna', 'sentar:pedra': 'contemplar na pedra',
  'cheirar:flores': 'o perfume das flores', 'investigar:passaro': 'um amigo de penas', 'comer:melancia': 'MELANCIA!',
  'investigar:bola': 'brincar de bola', 'investigar:caixa': 'caixas misteriosas',
  'comer:arbusto_amoras': 'amoras matam a fome', 'comer:capim_alto': 'o capim é macio e bom',
  'comer:arbusto_espinhos': 'folhas pontudas machucam', 'comer:arbusto_bagas_brancas': 'bagas brancas dão sono',
  'beber:fonte': 'a fonte de água limpa', 'dormir:abrigo': 'um abrigo para dormir',
};

export { DISCOVERY_TEXT, TYPES };
