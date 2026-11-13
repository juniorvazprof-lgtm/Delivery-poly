/* Calendário litúrgico (rito romano, regras do Brasil para Epifania e Batismo do Senhor).
   Tudo é calculado: Páscoa, tempos, cor do dia, semana do Tempo Comum e ciclos A/B/C e I/II.
   Festas fixas dos santos ficam em data/santos.ts. */

export type Cor = "verde" | "roxo" | "branco" | "vermelho" | "rosa";
export type Tempo = "Advento" | "Natal" | "Tempo Comum" | "Quaresma" | "Tríduo Pascal" | "Páscoa";
export interface DiaLiturgico { data: Date; tempo: Tempo; cor: Cor; semana: number | null; titulo: string; ciclo: "A" | "B" | "C"; ano: "I" | "II" }

const DAY = 864e5;
/** Data local à meia-noite (evita erro de fuso). */
export const dia = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const add = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const diff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY);
const sundayOnOrBefore = (d: Date) => add(d, -d.getDay());

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
export function pascoa(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mes = Math.floor((h + l - 7 * m + 114) / 31),
    di = ((h + l - 7 * m + 114) % 31) + 1;
  return dia(y, mes, di);
}
/** 1º domingo do Advento: o quarto domingo antes do Natal (entre 27/11 e 3/12). */
export const advento = (y: number) => add(sundayOnOrBefore(dia(y, 12, 24)), -21);
/** Epifania no Brasil: domingo entre 2 e 8 de janeiro. */
export const epifania = (y: number) => { const d = dia(y, 1, 2); return add(d, (7 - d.getDay()) % 7); };
/** Batismo do Senhor: domingo depois da Epifania; se a Epifania cair em 7 ou 8/1, na segunda-feira seguinte. */
export const batismo = (y: number) => { const e = epifania(y); return e.getDate() >= 7 ? add(e, 1) : add(e, 7); };

export function diaLiturgico(d0: Date): DiaLiturgico {
  const d = dia(d0.getFullYear(), d0.getMonth() + 1, d0.getDate()), y = d.getFullYear();
  const P = pascoa(y), cinzas = add(P, -46), ramos = add(P, -7), quintaSanta = add(P, -3), pentecostes = add(P, 49);
  const adv = advento(y), bat = batismo(y), cristoRei = add(adv, -7);
  // o ano litúrgico começa no Advento: de dezembro em diante já conta o ano seguinte
  const anoLit = d >= adv ? y + 1 : y;
  const ciclo = (["C", "A", "B"] as const)[anoLit % 3], ano = anoLit % 2 ? "I" : "II";
  const base = { data: d, ciclo, ano } as const;
  const domingo = d.getDay() === 0;

  if (d >= adv && d < dia(y, 12, 25)) {
    const semana = Math.floor(diff(d, adv) / 7) + 1;
    return { ...base, tempo: "Advento", cor: semana === 3 && domingo ? "rosa" : "roxo", semana, titulo: `${semana}ª semana do Advento` };
  }
  if (d >= dia(y, 12, 25) || d <= bat) {
    const titulo = d.getMonth() === 11 && d.getDate() === 25 ? "Natal do Senhor" : d.getTime() === epifania(y).getTime() ? "Epifania do Senhor"
      : d.getTime() === bat.getTime() ? "Batismo do Senhor" : "Tempo do Natal";
    return { ...base, tempo: "Natal", cor: "branco", semana: null, titulo };
  }
  if (d >= cinzas && d < quintaSanta) {
    const semana = d < add(cinzas, 4) ? 0 : Math.floor(diff(d, add(cinzas, 4)) / 7) + 1;
    const titulo = d.getTime() === cinzas.getTime() ? "Quarta-feira de Cinzas" : d.getTime() === ramos.getTime() ? "Domingo de Ramos"
      : d > ramos ? "Semana Santa" : semana === 0 ? "Depois das Cinzas" : `${semana}ª semana da Quaresma`;
    const cor = d.getTime() === ramos.getTime() ? "vermelho" : semana === 4 && domingo ? "rosa" : "roxo";
    return { ...base, tempo: "Quaresma", cor, semana: semana || null, titulo };
  }
  if (d >= quintaSanta && d < P) {
    const titulo = ["Quinta-feira Santa", "Sexta-feira da Paixão", "Sábado Santo"][diff(d, quintaSanta)];
    return { ...base, tempo: "Tríduo Pascal", cor: diff(d, quintaSanta) === 1 ? "vermelho" : "branco", semana: null, titulo };
  }
  if (d >= P && d <= pentecostes) {
    const semana = Math.floor(diff(d, P) / 7) + 1;
    const titulo = d.getTime() === P.getTime() ? "Domingo da Páscoa" : d.getTime() === pentecostes.getTime() ? "Pentecostes"
      : d.getTime() === add(P, 42).getTime() ? "Ascensão do Senhor" : `${semana}ª semana da Páscoa`;
    return { ...base, tempo: "Páscoa", cor: d.getTime() === pentecostes.getTime() ? "vermelho" : "branco", semana, titulo };
  }
  // Tempo Comum: antes da Quaresma conta a partir do Batismo; depois de Pentecostes conta para trás a partir de Cristo Rei (34ª)
  const semana = d < cinzas ? Math.floor(diff(sundayOnOrBefore(d), sundayOnOrBefore(bat)) / 7) + 1
    : 34 - Math.floor(diff(cristoRei, sundayOnOrBefore(d)) / 7);
  const titulo = d.getTime() === cristoRei.getTime() ? "Nosso Senhor Jesus Cristo, Rei do Universo"
    : d.getTime() === add(pentecostes, 7).getTime() ? "Santíssima Trindade" : `${semana}ª semana do Tempo Comum`;
  return { ...base, tempo: "Tempo Comum", cor: d.getTime() === cristoRei.getTime() || d.getTime() === add(pentecostes, 7).getTime() ? "branco" : "verde", semana, titulo };
}

/** Cores da luz de fundo do app para cada cor litúrgica. */
export const LUZ: Record<Cor, [string, string]> = {
  verde: ["#9CC9A0", "#C8DDA9"], roxo: ["#B49AE0", "#8E7AC8"], branco: ["#F2E6C9", "#F2C879"], vermelho: ["#E89A9A", "#C9606A"], rosa: ["#F2B8C6", "#E8A0B4"],
};
export const NOME_COR: Record<Cor, string> = { verde: "Verde", roxo: "Roxo", branco: "Branco", vermelho: "Vermelho", rosa: "Rosa" };
