/* Mistérios do Rosário e montagem do terço passo a passo.
   Os mistérios trazem só o título e a referência bíblica: o texto bíblico entra quando houver uma
   tradução católica em domínio público ou licenciada. */

export interface Misterio { titulo: string; ref: string; fruto: string }
export interface Conjunto { id: "gozosos" | "luminosos" | "dolorosos" | "gloriosos"; nome: string; misterios: Misterio[] }

export const CONJUNTOS: Conjunto[] = [
  { id: "gozosos", nome: "Mistérios Gozosos", misterios: [
    { titulo: "A anunciação do Anjo a Maria", ref: "Lc 1,26-38", fruto: "humildade" },
    { titulo: "A visita de Maria a sua prima Isabel", ref: "Lc 1,39-56", fruto: "caridade com o próximo" },
    { titulo: "O nascimento de Jesus em Belém", ref: "Lc 2,1-20", fruto: "desapego e pobreza de espírito" },
    { titulo: "A apresentação de Jesus no Templo", ref: "Lc 2,22-38", fruto: "obediência" },
    { titulo: "Jesus é encontrado no Templo", ref: "Lc 2,41-52", fruto: "busca de Deus em tudo" } ] },
  { id: "luminosos", nome: "Mistérios Luminosos", misterios: [
    { titulo: "O batismo de Jesus no rio Jordão", ref: "Mt 3,13-17", fruto: "fidelidade ao batismo" },
    { titulo: "Jesus nas bodas de Caná", ref: "Jo 2,1-11", fruto: "confiança na intercessão de Maria" },
    { titulo: "O anúncio do Reino de Deus", ref: "Mc 1,14-15", fruto: "conversão" },
    { titulo: "A transfiguração de Jesus", ref: "Lc 9,28-36", fruto: "desejo de santidade" },
    { titulo: "A instituição da Eucaristia", ref: "Lc 22,14-20", fruto: "amor à Eucaristia" } ] },
  { id: "dolorosos", nome: "Mistérios Dolorosos", misterios: [
    { titulo: "A agonia de Jesus no Horto das Oliveiras", ref: "Lc 22,39-46", fruto: "entrega à vontade de Deus" },
    { titulo: "A flagelação de Jesus", ref: "Jo 19,1", fruto: "pureza" },
    { titulo: "A coroação de espinhos", ref: "Mt 27,27-31", fruto: "humildade diante das humilhações" },
    { titulo: "Jesus carrega a cruz até o Calvário", ref: "Jo 19,16-17", fruto: "paciência nas dificuldades" },
    { titulo: "A crucifixão e morte de Jesus", ref: "Lc 23,33-46", fruto: "amor e perdão" } ] },
  { id: "gloriosos", nome: "Mistérios Gloriosos", misterios: [
    { titulo: "A ressurreição de Jesus", ref: "Mc 16,1-7", fruto: "fé" },
    { titulo: "A ascensão de Jesus ao céu", ref: "At 1,6-11", fruto: "esperança" },
    { titulo: "A vinda do Espírito Santo", ref: "At 2,1-4", fruto: "abertura ao Espírito" },
    { titulo: "A assunção de Maria ao céu", ref: "Tradição da Igreja", fruto: "uma boa morte" },
    { titulo: "A coroação de Maria como Rainha do céu e da terra", ref: "Ap 12,1", fruto: "confiança em Maria" } ] },
];
/** Mistérios de cada dia da semana (0 = domingo), segundo o costume atual. */
const POR_DIA: Conjunto["id"][] = ["gloriosos", "gozosos", "dolorosos", "gloriosos", "luminosos", "dolorosos", "gozosos"];
export const conjuntoDoDia = (d: Date): Conjunto => CONJUNTOS.find(c => c.id === POR_DIA[d.getDay()])!;

export type Passo =
  | { tipo: "oracao"; id: string; titulo: string; dezena?: number; conta?: number; total?: number }
  | { tipo: "misterio"; dezena: number; misterio: Misterio };

/** Sequência completa do terço: abertura, 5 dezenas e encerramento. */
export function passosDoTerco(c: Conjunto): Passo[] {
  const p: Passo[] = [
    { tipo: "oracao", id: "sinal", titulo: "Sinal da Cruz" }, { tipo: "oracao", id: "credo", titulo: "Creio" },
    { tipo: "oracao", id: "painosso", titulo: "Pai-Nosso" },
    ...[1, 2, 3].map(n => ({ tipo: "oracao" as const, id: "avemaria", titulo: ["Ave-Maria pela fé", "Ave-Maria pela esperança", "Ave-Maria pela caridade"][n - 1], conta: n, total: 3 })),
    { tipo: "oracao", id: "gloria", titulo: "Glória ao Pai" },
  ];
  for (let d = 1; d <= 5; d++) {
    p.push({ tipo: "misterio", dezena: d, misterio: c.misterios[d - 1] });
    p.push({ tipo: "oracao", id: "painosso", titulo: "Pai-Nosso", dezena: d });
    for (let n = 1; n <= 10; n++) p.push({ tipo: "oracao", id: "avemaria", titulo: "Ave-Maria", dezena: d, conta: n, total: 10 });
    p.push({ tipo: "oracao", id: "gloria", titulo: "Glória ao Pai", dezena: d });
    p.push({ tipo: "oracao", id: "fatima", titulo: "Ó meu Jesus", dezena: d });
  }
  p.push({ tipo: "oracao", id: "salve", titulo: "Salve-Rainha" });
  return p;
}
