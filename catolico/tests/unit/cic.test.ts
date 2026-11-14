import { describe, expect, it } from "vitest";
import { linkCIC, numerosCIC } from "../../src/core/cic";
import Q from "../../src/data/quiz-sacramentos.json";

describe("links do CIC", () => {
  it("cada parágrafo cai na página certa do vatican.va", () => {
    expect(linkCIC(1)).toContain("prologo%201-25_po.html");
    expect(linkCIC(1213)).toContain("p2s2cap1_1210-1419_po.html");
    expect(linkCIC(1420)).toContain("p2s2cap1_1420-1532_po.html");
    expect(linkCIC(2865)).toContain("p4s2_2759-2865_po.html");
    expect(linkCIC(0)).toBeNull(); expect(linkCIC(2866)).toBeNull();
    for (let n = 1; n <= 2865; n++) expect(linkCIC(n), `n. ${n}`).not.toBeNull();
  });
  it("lê os números das notas", () => { expect(numerosCIC("1261; 1257")).toEqual([1261, 1257]); expect(numerosCIC("2267 (redação de 2018); 2263-2265")).toEqual([2267, 2263]); });
  it("quiz dos sacramentos: 32 perguntas com uma certa e referências na parte dos sacramentos", () => {
    expect(Q.quiz).toHaveLength(32); expect(Q.explica).toHaveLength(8);
    for (const q of Q.quiz) { expect(q.op).toHaveLength(3); expect(q.certa).toBeGreaterThanOrEqual(0); expect(q.certa).toBeLessThan(3); }
    for (const x of [...Q.quiz, ...Q.explica]) for (const n of x.cic) { expect(n).toBeGreaterThanOrEqual(1113); expect(n).toBeLessThanOrEqual(1666); }
  });
});
