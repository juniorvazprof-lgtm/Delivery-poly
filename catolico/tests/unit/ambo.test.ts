import { describe, expect, it } from "vitest";
import cal from "../../src/data/calendario.json";
import { diaLiturgico } from "../../src/core/liturgia";

// Confere o calendário calculado pelo app contra os 730 dias do calendário Ambo (Brasil, 2026-2027)
const TEMPO: Record<string, string> = { "ordinary-time": "Tempo Comum", advent: "Advento", christmas: "Natal", lent: "Quaresma", "paschal-triduum": "Tríduo Pascal", easter: "Páscoa" };
const dias = Object.entries((cal as { dias: Record<string, { s: string; w: number | null; c: string; g: string }> }).dias);

describe("calendário calculado × Ambo", () => {
  it("o tempo litúrgico bate em todos os 730 dias", () => {
    const erros = dias.filter(([k, a]) => { const [y, m, d] = k.split("-").map(Number); return diaLiturgico(new Date(y, m - 1, d)).tempo !== TEMPO[a.s]; }).map(([k, a]) => `${k} ${a.s}`);
    expect(erros).toEqual([]);
  });
  it("a semana do Tempo Comum bate", () => {
    const erros = dias.filter(([, a]) => a.s === "ordinary-time" && a.w != null).filter(([k, a]) => { const [y, m, d] = k.split("-").map(Number); return diaLiturgico(new Date(y, m - 1, d)).semana !== a.w; }).map(([k, a]) => `${k} ambo ${a.w}`);
    expect(erros).toEqual([]);
  });
  it("a cor bate nos dias de semana comuns (sem festa de santo)", () => {
    const erros = dias.filter(([, a]) => a.g === "Féria").filter(([k, a]) => { const [y, m, d] = k.split("-").map(Number); return diaLiturgico(new Date(y, m - 1, d)).cor !== a.c; }).map(([k, a]) => `${k} ambo ${a.c}`);
    expect(erros).toEqual([]);
  });
});

import { parseCitacao } from "../../src/core/dia";
describe("citações do Evangelho", () => {
  it.each([
    ["Luke 17:26-37", "Lc 17,26-37"], ["John 15:26-16:4a", "Jo 15,26–16,4"], ["Matt 4:12-23 or 4:12-17", "Mt 4,12-23"], ["John 1:1-5, 9-14", "Jo 1,1-5.9-14"],
    ["Luke 9:28b-36", "Lc 9,28-36"], ["Mark 1:7-11", "Mc 1,7-11"], ["Matt 5:1-12a", "Mt 5,1-12"],
  ])("%s", (c, e) => expect(parseCitacao(c)?.texto).toBe(e));
  it("todas as 730 citações do Ambo são entendidas", () => {
    const falhas = Object.entries((cal as { dias: Record<string, { ev: string }> }).dias).filter(([, a]) => a.ev && !parseCitacao(a.ev)).map(([k, a]) => `${k} ${a.ev}`);
    expect(falhas).toEqual([]);
  });
});
