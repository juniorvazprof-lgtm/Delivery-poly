import { beforeEach, describe, expect, it, vi } from "vitest";
// o feed e os efeitos visuais mexem na tela; aqui só interessa a escolha do próximo versículo
vi.mock("../../src/features/feed/feed", () => ({ recent: [] as string[] }));
vi.mock("../../src/ui/effects", () => ({ toast: () => {} }));
vi.mock("../../src/core/persist", () => ({ persist: () => {} }));
import { pick, score, bump } from "../../src/features/feed/recommend";
import { store } from "../../src/core/state";
import { V } from "../../src/data/verses";
import { recent } from "../../src/features/feed/feed";

beforeEach(() => { for (const k of Object.keys(store.taste)) delete store.taste[k]; store.filterTag = null; recent.length = 0; });

describe("recomendação do feed", () => {
  it("com filtro de tema, só mostra versículos daquele tema", () => {
    store.filterTag = "paz";
    for (let i = 0; i < 40; i++) expect(pick().t).toContain("paz");
  });
  it("não repete versículos recentes", () => {
    const vistos: string[] = []; for (let i = 0; i < 12; i++) vistos.push(pick().r);
    expect(new Set(vistos).size).toBe(vistos.length);
  });
  it("curtir um tema aumenta a chance dele aparecer", () => {
    const v = V.find(x => x.t[0] === "gratidão")!; for (let i = 0; i < 5; i++) bump(v, 3);
    expect(score(v)).toBeGreaterThan(0);
    let n = 0; for (let i = 0; i < 300; i++) if (pick().t.includes("gratidão")) n++;
    const base = V.filter(x => x.t.includes("gratidão")).length / V.length;
    expect(n / 300).toBeGreaterThan(base * 2);
  });
  it("gosto fica limitado entre -5 e 40", () => {
    const v = V[0]; for (let i = 0; i < 50; i++) bump(v, 5); expect(store.taste[v.t[0]]).toBe(40);
    for (let i = 0; i < 50; i++) bump(v, -5); expect(store.taste[v.t[0]]).toBe(-5);
  });
});
