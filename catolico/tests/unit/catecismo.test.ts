import { describe, expect, it } from "vitest";
import C from "../../src/data/catecismo.json";
import { perguntaDoDia, perguntasDoFeed, type Catecismo } from "../../src/features/catecismo";
import { diaLiturgico } from "../../src/core/liturgia";
const cat = C as Catecismo;

describe("catecismo", () => {
  it("tem 430 perguntas traduzidas, sem as da Concordata italiana", () => {
    expect(cat.perguntas).toHaveLength(430);
    expect(cat.perguntas.some(q => [409, 410, 411].includes(q.n))).toBe(false);
    for (const q of cat.perguntas) { expect(q.p.length).toBeGreaterThan(5); expect(q.r.length).toBeGreaterThan(3); }
  });
  it("as perguntas que divergem do ensino atual levam nota e ficam fora do feed", () => {
    for (const n of [100, 125, 126, 186, 218, 221, 335, 386, 392]) expect(cat.perguntas.find(q => q.n === n)?.d, `pergunta ${n}`).toBeDefined();
    const feed = perguntasDoFeed(cat); expect(feed.some(q => q.d !== undefined)).toBe(false); expect(feed.length).toBeGreaterThan(250);
  });
  it("a pergunta do dia segue o tempo litúrgico", () => {
    const d = new Date(2027, 2, 3), L = diaLiturgico(d); expect(L.tempo).toBe("Quaresma");
    expect(cat.capitulos[perguntaDoDia(cat, d, L, "").c].nome).toBe("Confissão");
  });
});
