import { describe, expect, it } from "vitest";
import { pascoa, advento, epifania, batismo, diaLiturgico, dia } from "../../src/core/liturgia";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const L = (y: number, m: number, d: number) => diaLiturgico(dia(y, m, d));

describe("datas móveis", () => {
  it.each([[2024, "2024-03-31"], [2025, "2025-04-20"], [2026, "2026-04-05"], [2027, "2027-03-28"], [2030, "2030-04-21"], [2038, "2038-04-25"]])("Páscoa %i", (y, e) => expect(iso(pascoa(y))).toBe(e));
  it.each([[2024, "2024-12-01"], [2025, "2025-11-30"], [2026, "2026-11-29"], [2027, "2027-11-28"]])("Advento %i", (y, e) => expect(iso(advento(y))).toBe(e));
  it("Epifania e Batismo no Brasil", () => {
    expect(iso(epifania(2026))).toBe("2026-01-04"); expect(iso(batismo(2026))).toBe("2026-01-11");
    expect(iso(epifania(2023))).toBe("2023-01-08"); expect(iso(batismo(2023))).toBe("2023-01-09");   // Epifania em 8/1 → Batismo na segunda
  });
});
describe("dia litúrgico", () => {
  it("tempos e cores", () => {
    expect(L(2026, 2, 18)).toMatchObject({ titulo: "Quarta-feira de Cinzas", tempo: "Quaresma", cor: "roxo" });
    expect(L(2026, 3, 15)).toMatchObject({ tempo: "Quaresma", cor: "rosa", semana: 4 });         // Laetare
    expect(L(2026, 3, 29)).toMatchObject({ titulo: "Domingo de Ramos", cor: "vermelho" });
    expect(L(2026, 4, 3)).toMatchObject({ titulo: "Sexta-feira da Paixão", cor: "vermelho", tempo: "Tríduo Pascal" });
    expect(L(2026, 4, 5)).toMatchObject({ titulo: "Domingo da Páscoa", cor: "branco" });
    expect(L(2026, 5, 24)).toMatchObject({ titulo: "Pentecostes", cor: "vermelho" });
    expect(L(2026, 5, 17)).toMatchObject({ titulo: "Ascensão do Senhor", cor: "branco" });   // no Brasil, no domingo
    expect(L(2026, 5, 31)).toMatchObject({ titulo: "Santíssima Trindade", cor: "branco" });
    expect(L(2026, 12, 13)).toMatchObject({ tempo: "Advento", cor: "rosa", semana: 3 });        // Gaudete
    expect(L(2026, 12, 25)).toMatchObject({ titulo: "Natal do Senhor", cor: "branco" });
    expect(L(2026, 11, 22)).toMatchObject({ titulo: "Nosso Senhor Jesus Cristo, Rei do Universo", cor: "branco" });
  });
  it("semanas do Tempo Comum", () => {
    expect(L(2026, 1, 14)).toMatchObject({ tempo: "Tempo Comum", semana: 1, cor: "verde" });
    expect(L(2026, 1, 18).semana).toBe(2);
    expect(L(2026, 11, 13).semana).toBe(32);
    expect(L(2026, 11, 15).semana).toBe(33);
    expect(L(2026, 6, 7).titulo).toBe("10ª semana do Tempo Comum");
  });
  it("ciclos dominical e ferial", () => {
    expect(L(2026, 6, 7)).toMatchObject({ ciclo: "A", ano: "II" });
    expect(L(2026, 12, 6)).toMatchObject({ ciclo: "B", ano: "I" });   // Advento já é o ano litúrgico 2027
    expect(L(2025, 6, 8)).toMatchObject({ ciclo: "C", ano: "I" });
  });
});
