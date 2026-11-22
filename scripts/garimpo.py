"""Etapa 1: busca no arXiv (com cache) e extração de problemas abertos via DeepSeek."""
import json, os, sys, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET, yaml
sys.path.insert(0, os.path.dirname(__file__)); import cache
from deepseek import ask
G = yaml.safe_load(open("config.yaml"))["garimpo"]; NS = {"a": "http://www.w3.org/2005/Atom"}
def arxiv(q):
    url = "https://export.arxiv.org/api/query?" + urllib.parse.urlencode(
        {"search_query": q, "max_results": G["max_por_consulta"], "sortBy": "relevance"})
    k = cache.key("arxiv", url)
    if (hit := cache.get(k)) is not None: return hit
    time.sleep(3)
    root = ET.fromstring(urllib.request.urlopen(url, timeout=60).read()); out = []
    for e in root.findall("a:entry", NS):
        out.append({"id": e.find("a:id", NS).text.split("/abs/")[-1].rsplit("v", 1)[0],
                    "ano": int(e.find("a:published", NS).text[:4]),
                    "titulo": " ".join(e.find("a:title", NS).text.split()),
                    "resumo": " ".join(e.find("a:summary", NS).text.split())})
    cache.put(k, out); return out
papers = {}
for tema in G["temas"]:
    t = " AND ".join(f'all:"{w}"' if " " in w else f"all:{w}" for w in [tema.split()[0]] + tema.split()[1:])
    for p in arxiv(f"({t}) AND cat:astro-ph*"):
        if p["ano"] >= G["desde_ano"]: papers[p["id"]] = p
print("artigos:", len(papers), file=sys.stderr)
TAREFA = ("Para cada resumo, extraia problemas em aberto EXPLÍCITOS (limitações declaradas, trabalho futuro, "
          "questões não resolvidas) ligados à classificação/caracterização de estrelas variáveis com dados TESS. "
          "Ignore resumos sem problema aberto. Formato: {\"problemas\":[{\"id\":\"<arXiv id da entrada>\","
          "\"problema\":\"<1 frase em português>\",\"trecho\":\"<citação curta do resumo em inglês>\"}]}")
ps, tok, lst = [], 0, list(papers.values())
for i in range(0, len(lst), 8):
    lote = "\n\n".join(f"[{p['id']}] {p['titulo']}\n{p['resumo']}" for p in lst[i:i+8])
    r, t = ask(TAREFA, lote, max_tokens=1500); tok += t
    ps += [x for x in r.get("problemas", []) if x.get("id") in papers]   # descarta IDs inventados
for x in ps: x["titulo"] = papers[x["id"]]["titulo"]; x["ano"] = papers[x["id"]]["ano"]
json.dump({"artigos": len(papers), "tokens": tok, "problemas": ps}, open("garimpo/brutos.json", "w"), ensure_ascii=False, indent=1)
print("problemas:", len(ps), "tokens:", tok, file=sys.stderr)
