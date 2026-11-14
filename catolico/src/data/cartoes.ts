/* Cartões do feed: todo conteúdo vira um Cartão com tipo, tema (para o gosto), símbolo e texto.
   O feed mistura jaculatórias, "Você sabia?", mistérios do terço, santos e orações curtas. */
import type { Simbolo } from "../ui/simbolos";
import { simboloDoSanto } from "../ui/simbolos";
import { JACULATORIAS, oracao } from "./oracoes";
import { CONJUNTOS } from "./terco";
import { SANTOS } from "./santos";
import sabia from "./sabia.json";

export type Tipo = "jaculatoria" | "sabia" | "misterio" | "santo" | "oracao" | "evangelho" | "dia" | "oracaodia";
export interface Cartao { id: string; tipo: Tipo; tema: string; simbolo: Simbolo; rotulo: string; titulo?: string; texto: string; de: string; acao?: { rotulo: string; aba?: string; oracao?: string } }

const SIMB_SABIA: Record<string, Simbolo> = { liturgia: "luz", missa: "calice", sacramentos: "pomba", terco: "terco", maria: "maria", santos: "luz", biblia: "livro", ano: "estrela", simbolos: "cruz", oracoes: "vela" };
const SIMB_JAC = (t: string): Simbolo => /coração/i.test(t) ? "coracao" : /maria|senhora|mãe/i.test(t) ? "maria" : /josé/i.test(t) ? "lirio" : /espírito/i.test(t) ? "pomba" : /sacramento/i.test(t) ? "calice" : "cruz";
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const POOL: Cartao[] = [
  ...JACULATORIAS.map((j, i): Cartao => ({ id: `jac:${i}`, tipo: "jaculatoria", tema: "jaculatoria", simbolo: SIMB_JAC(j.texto), rotulo: "Jaculatória", texto: j.texto, de: j.de })),
  ...(sabia as { itens: { titulo: string; texto: string; tema: string }[] }).itens.map((s, i): Cartao => ({
    id: `sab:${i}`, tipo: "sabia", tema: s.tema, simbolo: SIMB_SABIA[s.tema] || "luz", rotulo: "Você sabia?", titulo: s.titulo, texto: s.texto, de: "Lumen Católico" })),
  ...CONJUNTOS.flatMap(c => c.misterios.map((m, i): Cartao => ({
    id: `mis:${c.id}:${i}`, tipo: "misterio", tema: "terco", simbolo: "terco", rotulo: `${i + 1}º mistério ${c.nome.replace("Mistérios ", "").toLowerCase().replace(/s$/, "")}`,
    titulo: m.titulo, texto: `Fruto do mistério: ${m.fruto}.`, de: m.ref, acao: { rotulo: "Rezar o terço", aba: "terco" } }))),
  ...Object.entries(SANTOS).map(([k, s]): Cartao => {
    const [mm, dd] = k.split("-").map(Number);
    return { id: `san:${k}`, tipo: "santo", tema: "santos", simbolo: simboloDoSanto(s.nome, s.martir ? "vermelho" : undefined), rotulo: `Santo · ${dd} de ${MESES[mm - 1]}`,
      titulo: s.nome, texto: s.sobre + (s.padroeiro ? ` Padroeiro ${s.padroeiro}.` : ""), de: "Lumen Católico" };
  }),
  ...["anjo", "contricao", "gloria", "fatima", "miguel"].map((id): Cartao => {
    const o = oracao(id);
    return { id: `ora:${id}`, tipo: "oracao", tema: "oracoes", simbolo: id === "anjo" || id === "miguel" ? "asas" : "vela", rotulo: "Oração", titulo: o.nome, texto: o.texto.replace(/\n/g, " "), de: "Oração tradicional" };
  }),
];
export const ROTULO_TEMA: Record<string, string> = { jaculatoria: "Jaculatórias", liturgia: "Liturgia", missa: "Missa", sacramentos: "Sacramentos", terco: "Terço", maria: "Nossa Senhora", santos: "Santos", biblia: "Bíblia", ano: "Ano litúrgico", simbolos: "Símbolos", oracoes: "Orações" };
