import { describe, expect, it } from "vitest";
import { parseQuery, findBook } from "../../src/features/search/query";
import { parseRef } from "../../src/services/bible";

describe("busca por referência", () => {
  it.each([
    ["João 3:16", { book: "João", ch: 3, a: 16, b: 16 }],
    ["jo 3 16", { book: "João", ch: 3, a: 16, b: 16 }],
    ["joao 3.16", { book: "João", ch: 3, a: 16, b: 16 }],
    ["sl 23", { book: "Salmos", ch: 23, a: undefined, b: undefined }],
    ["1 co 13:4-7", { book: "1 Coríntios", ch: 13, a: 4, b: 7 }],
    ["1co 13 4-7", { book: "1 Coríntios", ch: 13, a: 4, b: 7 }],
    ["Filipenses 4:13", { book: "Filipenses", ch: 4, a: 13, b: 13 }],
  ])("%s", (q, esperado) => { expect(parseQuery(q)).toEqual(esperado); });

  it("Jó (com acento) não vira João", () => { expect(findBook("Jó")).toBe("Jó"); expect(findBook("jo")).toBe("João"); });
  it("texto comum não é referência", () => { for (const q of ["paz", "ansiedade", "amor de Deus", ""]) expect(parseQuery(q)).toBeNull(); });
  it("rejeita intervalos invertidos ou enormes e capítulo zero", () => {
    expect(parseQuery("jo 3:16-10")).toBeNull(); expect(parseQuery("sl 119:1-80")).toBeNull(); expect(parseQuery("sl 0")).toBeNull();
  });
  it("parseRef aceita o formato do feed e recusa o resto", () => {
    expect(parseRef("Romanos 8:38-39")).toEqual({ book: "Romanos", ab: "Rm", ch: 8, a: 38, b: 39 });
    expect(parseRef("Romanos 8")).toBeNull(); expect(parseRef(null)).toBeNull(); expect(parseRef("x".repeat(200))).toBeNull();
  });
});
