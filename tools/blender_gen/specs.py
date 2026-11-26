# Especificações dos modelos da Capivara Explora.
# Coordenadas do Blender: Z para cima, frente da peça virada para -Y, base apoiada em z=0, centro em x=y=0.
# dims = (largura X, profundidade Y, altura Z) aproximadas em metros; tris = limite de triângulos.
STYLE = ("Estilo low poly fofo e estilizado, poucas faces (segments/vertices entre 5 e 10), "
         "cores vibrantes porém suaves e naturais, sem texturas.")

SPECS = {
    "capivara": dict(dims=(0.75, 1.6, 1.25), tris=2500, desc=(
        "Capivara jovem fofa, corpo arredondado e robusto marrom-caramelo (#b07a4f), focinho grande e quadrado mais escuro (#7a4f33), "
        "olhinhos pretos pequenos com brilho branco, orelhinhas pequenas arredondadas, quatro pernas curtas e grossas. Sem cauda visível. "
        "HIERARQUIA OBRIGATÓRIA (nomes exatos): objeto 'body' (corpo, centro aprox. (0,0,0.68)); "
        "empty 'head_pivot' em (0,-0.72,0.98) e TODAS as peças da cabeça filhas dele, com coordenadas locais (cabeça 'head', focinho 'snout', nariz, orelhas 'ear_l'/'ear_r'); "
        "olhos 'eye_l' e 'eye_r' filhos de head_pivot, perto de (±0.22,-0.24,0.1) locais; "
        "quatro empties de quadril 'leg_fl','leg_fr','leg_bl','leg_br' em (∓0.3,-0.45,0.42) para as dianteiras e (∓0.3,0.5,0.42) para as traseiras, "
        "cada um com a perna como filha descendo de z local 0 até -0.42. A frente (cabeça) aponta para -Y.")),
    "arvore": dict(dims=(3.2, 3.2, 4.2), tris=900, desc="Árvore alta e frondosa sem frutos: tronco marrom levemente cônico e copa de 2-3 blocos de folhagem verde em tons diferentes."),
    "arvore_frutas": dict(dims=(3.0, 3.0, 3.4), tris=1400, desc="Árvore baixa de tronco marrom e copa verde clara arredondada, cheia de frutinhas vermelhas brilhantes (#ff2d4b) espalhadas pela superfície da copa (12-16 frutinhas)."),
    "arbusto_amoras": dict(dims=(1.4, 1.4, 1.0), tris=1200, desc="Arbusto baixo e redondo de folhas verde-escuras, com cachinhos de bolinhas roxo-escuras (amoras, #4b1f5c) aparecendo na superfície."),
    "capim_alto": dict(dims=(1.2, 1.2, 1.1), tris=600, desc="Touceira de capim alto e macio: 10-14 lâminas finas e pontudas (cones achatados) verde-claras saindo de uma base, levemente inclinadas para fora."),
    "arbusto_espinhos": dict(dims=(1.3, 1.3, 1.0), tris=1200, desc="Arbusto de folhas pontudas verde-acinzentadas (vários cones pequenos espetados para fora em várias direções) com algumas frutinhas amarelas redondas (#ffd23f)."),
    "arbusto_bagas_brancas": dict(dims=(1.2, 1.2, 0.9), tris=1000, desc="Arbusto delicado verde-azulado com pequenos ramos e bagas brancas peroladas (#f4f1ff) em grupinhos."),
    "cogumelo_vermelho": dict(dims=(0.6, 0.6, 0.75), tris=500, desc="Cogumelo de chapéu vermelho vivo (#e8262f) em forma de meia esfera com 6-8 pintas brancas, haste creme grossa."),
    "cogumelo_marrom": dict(dims=(0.55, 0.55, 0.65), tris=400, desc="Cogumelo simples de chapéu marrom (#9a6a3e) achatado e haste creme."),
    "pedra": dict(dims=(3.0, 2.4, 1.3), tris=300, desc="Pedra grande lisa e cinzenta (#9a9aa6), forma irregular achatada boa para sentar em cima, com uma pedra menor ao lado."),
    "caverna": dict(dims=(7.0, 6.5, 3.6), tris=900, desc=("Morro rochoso cinza-escuro (#6e6a73) em forma de domo irregular, com uma ENTRADA escura (#0b0a10) em arco "
                                                         "voltada para +X (lado direito), na base, com cerca de 2.4 m de largura e 1.8 m de altura. Algumas pedras soltas perto da entrada.")),
    "flores": dict(dims=(2.0, 2.0, 0.55), tris=1200, desc="Canteiro com 9-12 flores coloridas (rosa, amarelo, lilás, laranja, azul claro): hastes finas verdes e miolos/pétalas simples."),
    "fonte": dict(dims=(1.8, 1.8, 1.3), tris=900, desc=("Pequena fonte natural de beber: uma bacia de pedras cinza-claras empilhadas em círculo com água azul clara (#6fd6ff) dentro, "
                                                      "e uma pedra mais alta atrás (+Y) com uma bica de bambu verde por onde escorre um filete de água (cilindro fino azul).")),
    "abrigo": dict(dims=(2.8, 2.2, 1.8), tris=900, desc=("Abrigo simples tipo 'lean-to': dois troncos em pé na frente formando uma viga, telhado inclinado de galhos e folhas largas "
                                                       "descendo até o chão atrás (+Y), aberto na frente (-Y), com um montinho de folhas secas (forro) no chão dentro.")),
    "passaro": dict(dims=(0.8, 0.6, 0.35), tris=400, desc=("Passarinho azul (#2f7dff) estilizado, corpo de esfera achatada, bico laranja pequeno apontando para -Y, olhinhos pretos. "
                                                        "Asas como objetos separados chamados exatamente 'wing_l' e 'wing_r' (placas finas azul-escuras) presas na lateral do corpo.")),
    "melancia": dict(dims=(0.9, 0.7, 0.7), tris=500, desc="Melancia inteira oval verde (#2e9a3c) com listras verde-escuras."),
    "bola": dict(dims=(0.7, 0.7, 0.7), tris=500, desc="Bola de praia colorida com gomos rosa, amarelo e azul (pode ser esfera com faixas toroidais)."),
    "jacare": dict(dims=(1.1, 2.9, 0.55), tris=1500, desc=("Jacaré low poly verde-escuro (#3d5a3a) com barriga clara, focinho longo para -Y. "
        "Nós obrigatórios: 'jaw' (mandíbula inferior, pivô na articulação), 'tail' (pivô na base da cauda), olhos salientes no topo da cabeça.")),
    "caixa": dict(dims=(0.75, 0.75, 0.9), tris=300, desc="Caixa de presente roxa (#a45cff) com fitas douradas em cruz e um laço dourado em cima."),
    # --- rodada 4 (modelados à mão pelo Claude, sem DeepSeek) ---
    "pinha": dict(dims=(0.3, 0.3, 0.4), tris=400, desc="Pinha marrom caída no chão."),
    "formigueiro": dict(dims=(1.2, 1.2, 0.6), tris=600, desc="Montinho de terra com formigas."),
    "tronco_musgo": dict(dims=(0.9, 2.6, 0.75), tris=500, desc="Tronco caído coberto de musgo."),
    "caramujo": dict(dims=(0.35, 0.45, 0.3), tris=500, desc="Caramujo com concha espiral."),
    "ninho": dict(dims=(0.7, 0.7, 0.35), tris=700, desc="Ninho de gravetos com ovinhos azuis."),
    "teia": dict(dims=(1.3, 0.1, 1.5), tris=700, desc="Teia de aranha entre dois galhos."),
    "trevo": dict(dims=(1.2, 1.2, 0.25), tris=1100, desc="Moita baixa de trevos."),
    "grama_seca": dict(dims=(0.9, 0.9, 0.6), tris=400, desc="Tufo de grama seca amarelada."),
    "grama_baixa": dict(dims=(1.4, 1.4, 0.35), tris=600, desc="Tapete de grama baixa e verde."),
    "coco": dict(dims=(0.3, 0.3, 0.22), tris=300, desc="Cocozinho de capivara (bolinhas ovais marrons)."),
}
