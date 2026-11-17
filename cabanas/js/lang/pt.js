// Dicionário em português (opcional). Objeto plano, chaves com pontos.
export default {
  // ---- Itens -------------------------------------------------------------
  'item.espingarda': 'Espingarda',
  'item.espingarda.desc': 'Alta, pesada, definitiva. Seis cartuchos e uma prece.',
  'item.pistola': 'Pistola',
  'item.pistola.desc': 'Leve, rápida e nunca alta o bastante.',
  'item.cartuchos': 'Cartuchos',
  'item.cartuchos.desc': 'Da espingarda. Conte cada um deles.',
  'item.balas': 'Balas',
  'item.balas.desc': 'Da pistola. Cada uma é uma promessa.',
  'item.pilha': 'Pilha',
  'item.pilha.desc': 'Mantém a lanterna viva mais uma hora.',
  'item.vela': 'Vela',
  'item.vela.desc': 'Sal e chama. A noite fica do lado de fora.',
  'item.pano': 'Pano',
  'item.pano.desc': 'Trapo limpo. Ainda pode virar atadura.',
  'item.alcool': 'Álcool',
  'item.alcool.desc': 'Arde no corte. Melhor que nada.',
  'item.curativo': 'Curativo',
  'item.curativo.desc': 'Pano e álcool. Segura o sangue.',
  'item.kit': 'Kit de primeiros socorros',
  'item.kit.desc': 'Tudo o que você precisa para sair inteiro.',
  'item.fosforo': 'Fósforo',
  'item.fosforo.desc': 'Um risco. Não desperdice.',
  'item.chave_barracao': 'Chave do barracão',
  'item.chave_barracao.desc': 'Ferro enferrujado. Serve no barracão.',
  'item.chave_motel7': 'Chave do quarto 7',
  'item.chave_motel7.desc': 'Chave do motel. Alguém nunca foi embora.',
  'item.bilhete': 'Bilhete',
  'item.bilhete.desc': 'Letra que você quase reconhece.',

  // ---- Falas do rádio: objetivo -----------------------------------------
  'fala.radio.objetivo': [
    'Você entrou. Bom. Acenda a vela.',
    'O sino tocou. Três delas acordaram agora.',
    'Põe sal na porta. Isso te dá minutos.',
    'Chegue na cabana norte antes da escuridão.',
    'Abrigo, vela, sal. O plano é só isso.',
  ],

  // ---- Falas do rádio: espera -------------------------------------------
  'fala.radio.espera': [
    'Barulho aí fora. Apaga a lanterna.',
    'Tem algo rondando a cabana. Fica baixo.',
    'Quase amanhecendo. Não morre agora.',
    'Elas odeiam fogo. Deixa a vela acesa.',
    'Guarda os cartuchos. Tiro curto.',
    'Segura a porta. Não corre pra escuridão.',
  ],

  // ---- Falas de morte ----------------------------------------------------
  'fala.morte': [
    'A cidade fica com o que pega.',
    'A noite levou você. O rádio calou.',
    'Sem sinal. Sem resposta.',
    'O sino tocou mais uma vez. Por você.',
    'Elas acharam você antes do amanhecer.',
    'Pine Hollow lembra do seu nome.',
  ],

  // ---- Dicas -------------------------------------------------------------
  'fala.dicas': [
    'Barulho atrai criaturas. Um tiro, e depois ande.',
    'Lanterna acesa te deixa fácil de ver.',
    'Joystick até a metade: passos em silêncio.',
    'Segure ATIRAR para mirar. Solte para atirar.',
    'Munição é rara. Conte cada cartucho.',
    'Abrigo com vela acesa salva o jogo.',
    'De dia as criaturas dormem. Trabalhe rápido.',
  ],

  // ---- Criatura mariposa -------------------------------------------------
  'fala.mariposa': [
    'Mariposa na estrada. Luz chama ela.',
    'Essa mariposa vê o facho. Apaga a lanterna.',
    'Mariposa voa pra luz. Não seja a luz.',
    'Asas na janela. Apaga a luz e anda devagar.',
  ],

  // ---- Criatura gritadora ------------------------------------------------
  'fala.gritador': [
    'Gritador perto. Se ele grita, a cidade vem.',
    'Gritador na área. Cale ele antes.',
    'O gritador chama os outros. Não deixa.',
    'Gritador na encruzilhada. Resolve em silêncio.',
  ],

  // ---- Bateria fraca -----------------------------------------------------
  'fala.bateria': [
    'Bateria fraca. A sorte também.',
    'A lanterna está piscando. Isso é ruim.',
    'O fim da luz. Sinto cheiro de problema.',
    'Mais uma hora de pilha. Talvez.',
  ],

  // ---- Interface ---------------------------------------------------------
  'ui.titulo': 'Pine Hollow',
  'ui.subtitulo': 'Seu carro morreu na ponte. A cidade é logo ali.',
  'ui.comecar': 'Começar',
  'ui.continuar': 'Continuar',
  'ui.novo': 'Novo jogo',
  'ui.idioma': 'Idioma',
  'ui.som': 'Som',

  'ui.morte.titulo': 'Você morreu',
  'ui.morte.tempo': 'Tempo sobrevivido',
  'ui.morte.abates': 'Criaturas mortas',
  'ui.morte.voltar': 'Carregar último jogo',
  'ui.morte.recomecar': 'Começar de novo',

  'ui.dia': 'Dia {n}',
  'ui.noite.cai': 'A noite cai.',
  'ui.amanhece': 'Amanhece. As criaturas voltam a dormir.',
  'ui.sino': 'O sino da igreja toca três vezes.',

  'ui.abrigo.entrar': 'Descansar',
  'ui.abrigo.salvar': 'Acender a vela (salvar)',
  'ui.abrigo.salvo': 'Jogo salvo.',
  'ui.abrigo.bau': 'Baú',
  'ui.abrigo.dormir': 'Dormir até o amanhecer',
  'ui.abrigo.fechar': 'Sair',
  'ui.abrigo.seguro': 'Seguro aqui. Eles não cruzam o sal.',
  'abrigo.barracao': 'Barracão',
  'abrigo.cabana_norte': 'Cabana norte',
  'abrigo.cabana_sul': 'Cabana sul',

  'ui.inv.titulo': 'Inventário',
  'ui.inv.usar': 'Usar',
  'ui.inv.combinar': 'Combinar',
  'ui.inv.largar': 'Largar',
  'ui.inv.equipar': 'Equipar',
  'ui.inv.guardar': 'Guardar',
  'ui.inv.pegar': 'Pegar',
  'ui.inv.cheio': 'Sem espaço.',
  'ui.inv.combinou': 'Feito: {item}.',
  'ui.inv.nada': 'Isso não funciona.',
  'ui.inv.vazio': 'Vazio',

  'ui.pegou': '+{qtd} {item}',
  'ui.sem.municao': 'Sem munição.',
  'ui.sem.pilha': 'Sem pilhas. Escuridão agora.',
  'ui.pilha.nova': 'Pilha nova.',
  'ui.silencio': 'silencioso',
  'ui.recarregando': 'recarregando',

  'arma.espingarda': 'Espingarda',
  'arma.pistola': 'Pistola',

  'quem.voce': 'Você',
  'quem.radio': 'Rádio',
};
