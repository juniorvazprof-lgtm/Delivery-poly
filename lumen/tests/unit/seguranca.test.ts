import { describe, expect, it } from "vitest";
import { escapeHtml, html, raw } from "../../src/utils/html";
import * as valid from "../../src/security/validate";

describe("escape de HTML", () => {
  it("escapa os caracteres perigosos, incluindo aspas", () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).not.toMatch(/[<>"']/);
  });
  it("html`` escapa dados mas mantém trechos seguros aninhados", () => {
    const dado = "<script>alert(1)</script>", r = html`<p>${dado}${html`<b>${"<i>"}</b>`}${raw("<hr>")}</p>`.value;
    expect(r).not.toContain("<script>"); expect(r).toContain("<b>&lt;i&gt;</b>"); expect(r).toContain("<hr>");
  });
});
describe("validação de dados salvos no aparelho", () => {
  const conhecidos = new Set(["a", "b"]);
  it("idList descarta ids desconhecidos, repetidos e lixo", () => {
    expect(valid.idList(["a", "x", "a", 3, null, "b"], conhecidos, 10)).toEqual(["a", "b"]);
    expect(valid.idList("não é lista", conhecidos, 10)).toEqual([]);
  });
  it("numberMap limita valores e ignora chaves desconhecidas e protótipo", () => {
    const m = valid.numberMap(JSON.parse('{"a": 999, "b": -50, "x": 1, "__proto__": {"p": 1}}'), conhecidos, -5, 40);
    expect(m).toEqual({ a: 40, b: -5 }); expect(({} as Record<string, unknown>).p).toBeUndefined();
  });
  it("horário e data inválidos viram valor seguro", () => {
    expect(valid.time("07:30")).toBe("07:30"); expect(valid.time("25:99")).toBeNull(); expect(valid.time({})).toBeNull();
    expect(valid.timestamp(Date.now() + 1e12)).toBe(0); expect(valid.timestamp(NaN)).toBe(0);
  });
});
describe("playlists adulteradas (cobre a tela de música mesmo com ela desligada)", () => {
  it("descarta ids inválidos, troca cores perigosas e filtra faixas desconhecidas", () => {
    const evil = `<img src=x onerror=alert(1)>`;
    const r = valid.playlists([{ id: "pl1", name: evil, c: ["red;background:url(x)", "#fff\" onmouseover=\"alert(1)"], ids: ["t1", "nao-existe", evil] },
      { id: "\"><svg onload=alert(1)>", name: "x", c: ["#000000", "#000000"], ids: [] }], new Set(["t1"]));
    expect(r.length).toBe(1); expect(r[0].id).toBe("pl1"); expect(r[0].c).toEqual(["#9EC5E8", "#4B4785"]); expect(r[0].ids).toEqual(["t1"]);
  });
});
