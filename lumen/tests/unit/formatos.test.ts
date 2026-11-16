import { describe, expect, it } from "vitest";
import { FORMATOS, promptMensagem, roteiro, type Formato } from "../../src/features/pulpit/formatos";
import { EXEMPLOS } from "../../src/features/pulpit/example";
import { parseSermon } from "../../src/security/sermon-schema";
import { parseRef } from "../../src/services/bible";

const FS = Object.keys(FORMATOS) as Formato[];
describe("formatos de mensagem", () => {
  it("cada formato segue a estrutura do pastor e os minutos somam a duração", () => {
    for (const f of FS) for (const d of FORMATOS[f].duracoes) {
      const r = roteiro(f, d), tipos = r.map(x => x.tipo);
      expect(r.reduce((s, x) => s + x.min, 0), `${f} ${d}`).toBe(d);
      expect(r.every(x => x.min >= 1)).toBe(true);
      expect(tipos[0]).toBe("introducao");
      expect(tipos.filter(t => t === "desenvolvimento").length).toBeGreaterThanOrEqual(2);
      const ap = tipos.indexOf("aplicacao"), co = tipos.indexOf("conclusao");
      expect(ap).toBeGreaterThan(tipos.lastIndexOf("desenvolvimento")); expect(co).toBeGreaterThan(ap);
    }
    expect(roteiro("pregacao", 15).at(-1)?.tipo).toBe("oracao");      // oração final separada
    expect(roteiro("palestra", 20).at(-1)?.tipo).toBe("conclusao");
    expect(roteiro("estudo", 30).map(x => x.tipo)).toContain("perguntas");
    expect(roteiro("estudo", 30)[1].tipo).toBe("contexto");
  });
  it("as instruções pedem texto base, apelo e desafio na pregação", () => {
    const p = promptMensagem({ formato: "pregacao", tema: "fé", ocasiao: "Culto de domingo", dur: 30, ref: "Hebreus 11:1-6" });
    expect(p).toContain("TEXTO BASE escolhido: Hebreus 11:1-6"); expect(p).toContain("APELO"); expect(p).toContain("DESAFIO");
    expect(p).toContain('"texto_base"'); expect(p).toContain('tipo "oracao"');
    expect(promptMensagem({ formato: "estudo", tema: "fé", ocasiao: "Célula", dur: 30, ref: "" })).toContain("Escolha um TEXTO BASE");
  });
  it("a validação guarda formato, texto base e tipo das partes; descarta valores inválidos", () => {
    const s = parseSermon({ titulo: "T", formato: "estudo", texto_base: "Filipenses 4:4-9", tema: "Paz", ideia_central: "x",
      passagens: [{ ref: "Filipenses 4:4-9", texto: "" }], partes: [{ tipo: "perguntas", nome: "Perguntas", min: 5, ref: "", fala: "1. ..." }, { tipo: "<script>", nome: "X", min: 2, ref: "", fala: "y" }] }, 30)!;
    expect(s.formato).toBe("estudo"); expect(s.texto_base).toBe("Filipenses 4:4-9"); expect(s.tema_frase).toBe("Paz");
    expect(s.partes[0].tipo).toBe("perguntas"); expect(s.partes[1].tipo).toBeUndefined();
    const t = parseSermon({ formato: "culto", texto_base: "x", passagens: [{ ref: "João 3:16" }], partes: [{ nome: "A", min: 1, fala: "b" }] }, 15)!;
    expect(t.formato).toBeUndefined(); expect(t.texto_base).toBe("João 3:16");
  });
  it("os três exemplos prontos estão completos e coerentes", () => {
    for (const f of FS) {
      const s = EXEMPLOS[f]; expect(s.formato).toBe(f);
      expect(parseRef(s.texto_base)).not.toBeNull(); expect(s.passagens.some(p => p.ref === s.texto_base)).toBe(true);
      expect(s.partes.map(p => p.tipo)).toEqual(roteiro(f, s.minutos!).map(x => x.tipo));
      for (const p of s.partes) if (/\[LEITURA\]/.test(p.fala)) expect(s.passagens.some(x => x.ref === p.ref), `${f}: ${p.ref}`).toBe(true);
      for (const p of s.passagens) expect(p.texto.length).toBeGreaterThan(20);
    }
  });
});

import { emTelas, slidesOf } from "../../src/features/guided/slides";
describe("pregação guiada com textos longos", () => {
  it("quebra parágrafos longos no fim das frases, sem perder texto", () => {
    const t = Array.from({ length: 12 }, (_, i) => `Frase número ${i + 1} com algumas palavras a mais para encher.`).join(" ");
    const telas = emTelas(t); expect(telas.length).toBeGreaterThan(1);
    expect(telas.join(" ")).toBe(t); for (const x of telas) expect(x.endsWith(".")).toBe(true);
  });
  it("nenhuma tela dos exemplos passa de ~50 palavras", () => {
    for (const s of Object.values(EXEMPLOS)) for (const sl of slidesOf(s)) if (sl.kind === "text") expect(sl.text.split(/\s+/).length, sl.text.slice(0, 40)).toBeLessThanOrEqual(55);
  });
});
