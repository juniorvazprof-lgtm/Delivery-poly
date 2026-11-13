/* Orações tradicionais nas formas populares rezadas no Brasil.
   PROVISÓRIO: textos escritos de memória pela equipe; precisam de conferência com um revisor católico
   e com uma fonte em domínio público antes do lançamento. */

export interface Oracao { id: string; nome: string; texto: string; grupo: "Essenciais" | "Marianas" | "Do dia a dia"; nota?: string }

export const ORACOES: Oracao[] = [
  { id: "sinal", grupo: "Essenciais", nome: "Sinal da Cruz",
    texto: "Pelo sinal da Santa Cruz, livrai-nos, Deus, nosso Senhor, dos nossos inimigos. Em nome do Pai, e do Filho, e do Espírito Santo. Amém." },
  { id: "credo", grupo: "Essenciais", nome: "Creio (Símbolo dos Apóstolos)",
    texto: "Creio em Deus Pai todo-poderoso, criador do céu e da terra; e em Jesus Cristo, seu único Filho, nosso Senhor, que foi concebido pelo poder do Espírito Santo; nasceu da Virgem Maria; padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado; desceu à mansão dos mortos; ressuscitou ao terceiro dia; subiu aos céus; está sentado à direita de Deus Pai todo-poderoso, donde há de vir a julgar os vivos e os mortos. Creio no Espírito Santo, na santa Igreja católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne, na vida eterna. Amém." },
  { id: "painosso", grupo: "Essenciais", nome: "Pai-Nosso",
    texto: "Pai nosso que estais nos céus, santificado seja o vosso nome; venha a nós o vosso reino; seja feita a vossa vontade, assim na terra como no céu. O pão nosso de cada dia nos dai hoje; perdoai-nos as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido; e não nos deixeis cair em tentação, mas livrai-nos do mal. Amém." },
  { id: "avemaria", grupo: "Essenciais", nome: "Ave-Maria",
    texto: "Ave Maria, cheia de graça, o Senhor é convosco; bendita sois vós entre as mulheres, e bendito é o fruto do vosso ventre, Jesus. Santa Maria, Mãe de Deus, rogai por nós, pecadores, agora e na hora da nossa morte. Amém." },
  { id: "gloria", grupo: "Essenciais", nome: "Glória ao Pai",
    texto: "Glória ao Pai, e ao Filho, e ao Espírito Santo. Como era no princípio, agora e sempre. Amém." },
  { id: "fatima", grupo: "Essenciais", nome: "Jaculatória de Fátima",
    texto: "Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno, levai as almas todas para o céu e socorrei principalmente as que mais precisarem." },
  { id: "contricao", grupo: "Essenciais", nome: "Ato de Contrição",
    texto: "Meu Deus, eu me arrependo de todo o coração de vos ter ofendido, porque sois tão bom e amável. Prometo, com a vossa graça, esforçar-me para ser bom. Meu Jesus, misericórdia!" },
  { id: "salve", grupo: "Marianas", nome: "Salve-Rainha",
    texto: "Salve, Rainha, Mãe de misericórdia, vida, doçura e esperança nossa, salve! A vós bradamos, os degredados filhos de Eva. A vós suspiramos, gemendo e chorando neste vale de lágrimas. Eia, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei. E depois deste desterro, mostrai-nos Jesus, bendito fruto do vosso ventre. Ó clemente, ó piedosa, ó doce sempre Virgem Maria.\nRogai por nós, santa Mãe de Deus.\nPara que sejamos dignos das promessas de Cristo. Amém." },
  { id: "angelus", grupo: "Marianas", nome: "Ângelus", nota: "Rezado às 6h, 12h e 18h. No tempo pascal, reza-se a Rainha do Céu.",
    texto: "O Anjo do Senhor anunciou a Maria.\nE ela concebeu do Espírito Santo.\nAve Maria…\nEis aqui a serva do Senhor.\nFaça-se em mim segundo a vossa palavra.\nAve Maria…\nE o Verbo se fez carne.\nE habitou entre nós.\nAve Maria…\nRogai por nós, santa Mãe de Deus.\nPara que sejamos dignos das promessas de Cristo.\nOremos: Infundi, Senhor, como vos pedimos, a vossa graça em nossas almas, para que nós, que pela anunciação do Anjo conhecemos a encarnação de Cristo, vosso Filho, por sua paixão e morte na cruz sejamos conduzidos à glória da ressurreição. Pelo mesmo Cristo, Senhor nosso. Amém." },
  { id: "reginacaeli", grupo: "Marianas", nome: "Rainha do Céu (Regina Caeli)", nota: "Rezada no tempo pascal, no lugar do Ângelus.",
    texto: "Rainha do céu, alegrai-vos, aleluia!\nPorque aquele que merecestes trazer em vosso seio, aleluia!\nRessuscitou como disse, aleluia!\nRogai a Deus por nós, aleluia!\nExultai e alegrai-vos, ó Virgem Maria, aleluia!\nPorque o Senhor ressuscitou verdadeiramente, aleluia!\nOremos: Ó Deus, que vos dignastes alegrar o mundo com a ressurreição do vosso Filho, nosso Senhor Jesus Cristo, concedei-nos, vos suplicamos, que por sua Mãe, a Virgem Maria, alcancemos as alegrias da vida eterna. Pelo mesmo Cristo, Senhor nosso. Amém." },
  { id: "lembrai", grupo: "Marianas", nome: "Lembrai-vos",
    texto: "Lembrai-vos, ó piíssima Virgem Maria, que nunca se ouviu dizer que algum daqueles que têm recorrido à vossa proteção, implorado a vossa assistência e reclamado o vosso socorro, fosse por vós desamparado. Animado eu, pois, com igual confiança, a vós, ó Virgem entre todas singular, como a Mãe recorro, de vós me valho e, gemendo sob o peso dos meus pecados, me prostro aos vossos pés. Não rejeiteis as minhas súplicas, ó Mãe do Verbo encarnado, mas dignai-vos de as ouvir propícias e de me alcançar o que vos rogo. Amém." },
  { id: "anjo", grupo: "Do dia a dia", nome: "Santo Anjo",
    texto: "Santo Anjo do Senhor, meu zeloso guardador, se a ti me confiou a piedade divina, sempre me rege, me guarda, me governa e me ilumina. Amém." },
  { id: "miguel", grupo: "Do dia a dia", nome: "Oração a São Miguel Arcanjo",
    texto: "São Miguel Arcanjo, defendei-nos no combate; sede o nosso refúgio contra as maldades e ciladas do demônio. Ordene-lhe Deus, instantemente o pedimos; e vós, príncipe da milícia celeste, pela virtude divina, precipitai no inferno a Satanás e aos outros espíritos malignos, que andam pelo mundo para perder as almas. Amém." },
];
export const oracao = (id: string): Oracao => ORACOES.find(o => o.id === id) || ORACOES[0];

/** Jaculatórias tradicionais (orações curtíssimas) para o feed da tela Hoje. */
export const JACULATORIAS: { texto: string; de: string }[] = [
  { texto: "Jesus, eu confio em vós.", de: "Devoção à Divina Misericórdia" },
  { texto: "Sagrado Coração de Jesus, fazei o meu coração semelhante ao vosso.", de: "Devoção ao Sagrado Coração" },
  { texto: "Doce Coração de Maria, sede a minha salvação.", de: "Devoção ao Imaculado Coração" },
  { texto: "Ó Maria concebida sem pecado, rogai por nós que recorremos a vós.", de: "Medalha Milagrosa" },
  { texto: "Meu Jesus, misericórdia!", de: "Jaculatória tradicional" },
  { texto: "Graças e louvores se deem a todo momento ao Santíssimo e diviníssimo Sacramento.", de: "Louvor ao Santíssimo" },
  { texto: "Jesus, Maria e José, minha família vossa é.", de: "Jaculatória à Sagrada Família" },
  { texto: "São José, rogai por nós.", de: "Invocação a São José" },
  { texto: "Nossa Senhora Aparecida, rogai por nós.", de: "Padroeira do Brasil" },
  { texto: "Vinde, Espírito Santo, enchei os corações dos vossos fiéis.", de: "Invocação ao Espírito Santo" },
  { texto: "Bendito seja Deus.", de: "Louvor tradicional" },
  { texto: "Santa Mãe de Deus, mostrai que sois nossa Mãe.", de: "Invocação mariana" },
];
