"""Etapa 3: dossiê (<=1 página) por problema, a partir do resumo-fonte + busca arXiv de trabalhos relacionados."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__)); from deepseek import ask; from garimpo_lib import arxiv
BUSCAS = {  # consultas definidas pelo orquestrador
 "P02": ['all:"variable star" AND all:catalog AND all:classification AND all:agreement',
         'all:TESS AND all:"variable stars" AND all:"cross-match" AND all:Gaia'],
 "P06": ['abs:alias AND abs:period AND abs:TESS', 'abs:"half period" AND abs:eclipsing'],
 "P15": ['abs:TESS AND abs:faint AND abs:periods', 'abs:TESS AND abs:"injection" AND abs:recovery AND abs:period',
         'abs:"ZTF" AND abs:TESS AND abs:periods AND abs:comparison'],
}
fila = json.load(open("fila.json"))
TAREFA = ("Escreva um dossiê de estado da questão (máx. 350 palavras no total) para o PROBLEMA, usando SÓ as "
          "referências da ENTRADA (cite por arXiv ID entre colchetes). Formato: {\"problema\":..,\"contexto\":..,"
          "\"ja_tentado\":[{\"ref\":\"<id>\",\"o_que\":..}],\"lacuna\":..,\"dados_publicos\":[..],"
          "\"abordagens_candidatas\":[{\"ideia\":..,\"teste_verificavel\":..}],\"riscos\":[..]} Em português.")
for item in fila["fila"][:3]:
    if os.path.exists(f"dossies/{item['cid']}.json") and json.load(open(f"dossies/{item['cid']}.json")).get("n_refs",0) > 0: continue
    cid = item["cid"]; refs = {}
    for q in BUSCAS[cid]:
        for p in arxiv(q + " AND cat:astro-ph*", 15): refs[p["id"]] = p
    refs.pop(item["id"], None)
    ent = (f"PROBLEMA: {item['problema']}\nFONTE [{item['id']}] {item['titulo']}\nTRECHO: {item['trecho']}\n\n"
           + "\n".join(f"[{p['id']}] ({p['ano']}) {p['titulo']}: {p['resumo'][:700]}" for p in list(refs.values())[:12]))
    d, tok = ask(TAREFA, ent, max_tokens=1500)
    validos = set(refs) | {item["id"]}
    d["refs_invalidas"] = [r["ref"] for r in d.get("ja_tentado", []) if r["ref"].strip("[]") not in validos]
    d["tokens"] = tok; d["n_refs"] = len(refs); d["fonte"] = item["id"]
    os.makedirs("dossies", exist_ok=True)
    json.dump(d, open(f"dossies/{cid}.json", "w"), ensure_ascii=False, indent=1)
    print(cid, "refs buscadas", len(refs), "tokens", tok, "invalidas", d["refs_invalidas"])
