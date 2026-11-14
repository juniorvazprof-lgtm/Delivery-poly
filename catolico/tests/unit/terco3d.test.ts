import { describe, expect, it } from "vitest";
import { CONJUNTOS, passosDoTerco } from "../../src/data/terco";
import { mapaDePassos } from "../../src/features/terco3d";

describe("terço 3D: cada passo na conta certa", () => {
  const passos = passosDoTerco(CONJUNTOS[0]), m = mapaDePassos(passos);
  it("abertura: crucifixo, conta grande, 3 pequenas, conta antes da medalha", () => {
    expect(m.slice(0, 7)).toEqual([0, 0, 1, 2, 3, 4, 5]);
  });
  it("cada dezena usa 10 contas diferentes, em ordem, e as 50 não se repetem", () => {
    const aves = passos.map((p, i) => [p, m[i]] as const).filter(([p]) => p.tipo === "oracao" && p.id === "avemaria" && p.dezena).map(([, k]) => k);
    expect(aves).toHaveLength(50); expect(new Set(aves).size).toBe(50);
    expect(aves[0]).toBe(7); expect(aves[49]).toBe(60);
    for (let k = 1; k < 50; k++) expect(aves[k]).toBeGreaterThan(aves[k - 1]);
  });
  it("Pai-Nosso das dezenas 2 a 5 nas contas grandes do laço; a 1ª na conta do pingente", () => {
    const pn = passos.map((p, i) => [p, m[i]] as const).filter(([p]) => p.tipo === "oracao" && p.id === "painosso" && p.dezena).map(([, k]) => k);
    expect(pn).toEqual([5, 17, 28, 39, 50]);
  });
  it("Salve-Rainha na medalha", () => { expect(m[m.length - 1]).toBe(6); });
});
