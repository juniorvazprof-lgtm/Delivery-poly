/**
 * Validação da pregação devolvida pela IA.
 *
 * A resposta da IA é tratada como dado não confiável: campos desconhecidos são descartados,
 * textos são limpos e limitados, números ficam em faixas razoáveis e as referências bíblicas
 * precisam ter formato válido. O texto bíblico é depois substituído pelo da Bíblia do app.
 */
import { cleanText } from "../utils/text";
import { parseRef } from "../services/bible";
import type { Passage, Sermon, SermonPart } from "../types";

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const T = cleanText;

export function parseSermon(data: unknown, minutes: number): Sermon | null {
  if (!isObj(data) || !Array.isArray(data.passagens) || !Array.isArray(data.partes)) return null;
  const passagens: Passage[] = data.passagens.slice(0, 6).filter(isObj).map(p => ({
    ref: T(p.ref, 60), texto: T(p.texto, 1200), quem: T(p.quem, 400), para_quem: T(p.para_quem, 400),
    quando: T(p.quando, 400), explicacao: T(p.explicacao, 1200),
    palavras: Array.isArray(p.palavras) ? p.palavras.slice(0, 8).filter(isObj).map(w => ({ p: T(w.p, 60), s: T(w.s, 240) })).filter(w => w.p && w.s) : [],
    lembrar: T(p.lembrar, 240),
  })).filter(p => parseRef(p.ref));
  const partes: SermonPart[] = data.partes.slice(0, 12).filter(isObj).map(r => ({
    nome: T(r.nome, 60), min: Math.min(30, Math.max(1, Math.round(Number(r.min) || 1))),
    ref: parseRef(r.ref) ? T(r.ref, 60) : "", fala: T(r.fala, 12000),
  })).filter(r => r.nome && r.fala);
  if (!passagens.length || !partes.length) return null;
  return { titulo: T(data.titulo, 120) || "Pregação", ideia_central: T(data.ideia_central, 300), passagens, partes, minutos: minutes };
}
