/* Exemplos prontos, um para cada formato, escritos para serem lidos em voz alta.
   Estrutura: texto base, tema, introdução, desenvolvimento, aplicação, conclusão (e oração final na pregação e no estudo).
   O texto bíblico das passagens é o da Bíblia Livre (BLIVRE). */
import type { Sermon } from "../../types";
import type { Formato } from "./formatos";
import dados from "./exemplos.json";

const META: Record<Formato, { tema: string; ocasiao: string; minutos: number }> = {
  pregacao: { tema: "esperança", ocasiao: "Culto de domingo", minutos: 15 },
  palestra: { tema: "família", ocasiao: "Casais e famílias", minutos: 20 },
  estudo: { tema: "ansiedade", ocasiao: "Célula", minutos: 30 },
};
type Bruto = Omit<Sermon, "tema"> & { tema: string };
export const EXEMPLOS = Object.fromEntries((Object.keys(META) as Formato[]).map(f => {
  const d = (dados as unknown as Record<Formato, Bruto>)[f];
  return [f, { ...d, formato: f, tema_frase: d.tema, ...META[f] } as Sermon];
})) as Record<Formato, Sermon>;
export const EXAMPLE: Sermon = EXEMPLOS.pregacao;
