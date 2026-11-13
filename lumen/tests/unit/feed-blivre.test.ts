import { describe, expect, it } from "vitest";
import fs from "node:fs";
import feed from "../../src/data/versiculos-feed.json";
import { exibir } from "../../feed/exibir.mjs";

const livros = JSON.parse(fs.readFileSync("public/biblia/livros.json", "utf8")).livros as { abrev: string; nome: string; arquivo: string }[];
const cache = new Map<string, { capitulos: string[][] }>();
const livro = (ab: string) => { const l = livros.find(x => x.abrev === ab)!; if (!cache.has(ab)) cache.set(ab, JSON.parse(fs.readFileSync("public/biblia/" + l.arquivo, "utf8"))); return { l, b: cache.get(ab)! }; };
const TEMAS = new Set(["ansiedade", "cuidado", "oração", "paz", "descanso", "confiança", "coragem", "força", "esperança", "propósito", "graça", "amor", "fé", "gratidão", "alegria"]);

describe("feed conferido contra a BLIVRE", () => {
  it("todo texto é idêntico ao da Bíblia do app", () => {
    for (const v of feed.versiculos) {
      const { b } = livro(v.abrev);
      expect(b.capitulos[v.cap - 1].slice(v.de - 1, v.ate).join(" ").replace(/\s+/g, " ").trim(), v.ref).toBe(v.texto);
    }
  });
  it("referência escrita bate com livro, capítulo e versículos", () => {
    for (const v of feed.versiculos) expect(v.ref).toBe(`${livro(v.abrev).l.nome} ${v.cap}:${v.de}${v.ate > v.de ? "-" + v.ate : ""}`);
  });
  it("sem referências repetidas, temas válidos e gradiente de 2 cores", () => {
    expect(new Set(feed.versiculos.map(v => v.ref)).size).toBe(feed.versiculos.length);
    for (const v of feed.versiculos) { expect(v.temas.length).toBeGreaterThan(0); for (const t of v.temas) expect(TEMAS.has(t), `${v.ref}: ${t}`).toBe(true); expect(v.cores.length).toBe(2); }
  });
  it("o texto exibido só muda maiúscula inicial e pontuação final", () => {
    const tira = (s: string) => s.replace(/^[\s"“'(]+/, "").replace(/[\s.,;:!?—–-]+$/, "").toLocaleLowerCase("pt-BR");
    for (const v of feed.versiculos) expect(tira(v.exibir), v.ref).toBe(tira(v.texto));
  });
  it("regra de exibição", () => { expect(exibir("lançando sobre ele;")).toBe("Lançando sobre ele."); expect(exibir("Deus é amor!")).toBe("Deus é amor!"); });
});
