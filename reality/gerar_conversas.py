#!/usr/bin/env python3
"""Gera, com o DeepSeek, o banco de conversas em grupo da Casa Vigiada (casa3d.html).

A página no navegador não pode chamar a API, então as falas são geradas aqui uma vez
(barato: ~100 chamadas no modelo flash) e a página só as encena.

    python3 gerar_conversas.py --pares 28 --trios 40 --quartetos 30
Saída: conversas.json ao lado deste arquivo.
"""
import argparse, itertools, json, random, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from reality import llm, USO

AQUI = Path(__file__).parent
BIOS = {b["n"]: b for b in json.loads((AQUI / "casa_bios.json").read_text())}
VIBES = {"boa": "clima ótimo: risadas, cumplicidade, alguém se abre e é acolhido",
         "neutra": "clima morno: papo educado, alguma alfinetada sutil, interesses diferentes",
         "ruim": "clima pesado: discordância, julgamento, alguém se ofende, pode virar discussão"}
TEMAS = ["ex-namorados e traições", "família e infância", "carreira e sonhos que não deram certo",
         "dinheiro e de onde vieram", "medos e inseguranças", "primeiro amor", "o que fariam com o prêmio",
         "quem está jogando sujo na casa", "religião e crenças", "a pior noite de suas vidas",
         "corpo, aparência e autoestima", "filhos e paternidade/maternidade", "festas e loucuras"]
LOCAIS = ["sala", "cozinha", "jardim", "piscina", "quarto"]

def gerar(grupo):
    vibe = random.choices(list(VIBES), weights=[45, 25, 30])[0]
    tema = random.choice(TEMAS)
    fichas = "\n".join(f"- {n} ({BIOS[n]['idade']}): {BIOS[n]['bio']} Jeito de falar: {BIOS[n]['jeito']}." for n in grupo)
    r = llm("Você é roteirista de um reality show brasileiro. Escreve diálogos naturais, orais, "
            "com gírias regionais, interrupções e detalhes concretos da vida de cada um. Sem narração.",
            f"""Participantes desta roda de conversa na casa:
{fichas}

Tema puxado: {tema}. Clima: {VIBES[vibe]}.
Escreva uma conversa realista de 10 a 14 falas entre {', '.join(grupo)} (todos falam ao menos 2 vezes).
Eles revelam coisas da vida pessoal ligadas às fichas. Cada fala com no máximo 25 palavras.
Depois diga como cada um saiu sentindo sobre os outros.
JSON: {{"titulo": "título curto da cena", "local": "um de {LOCAIS}",
"falas": [{{"quem": "nome", "fala": "..."}}],
"efeitos": [{{"de": "nome", "para": "nome", "amz": -15..15, "atr": 0..10, "riv": 0..15, "conf": -15..15}}],
"resumo": "1 frase para o feed ao vivo"}}""", temp=1.0, max_tokens=1400)
    r["falas"] = [f for f in r.get("falas", []) if f.get("quem") in grupo and f.get("fala")]
    r["efeitos"] = [e for e in r.get("efeitos", []) if e.get("de") in grupo and e.get("para") in grupo and e["de"] != e["para"]]
    if r.get("local") not in LOCAIS:
        r["local"] = random.choice(LOCAIS)
    return {"grupo": list(grupo), "vibe": vibe, "tema": tema, **r} if len(r["falas"]) >= 6 else None

def confessionario(n):
    r = llm("Você escreve depoimentos de confessionário de reality show brasileiro.",
            f"""Ficha: {n} ({BIOS[n]['idade']}): {BIOS[n]['bio']} Jeito: {BIOS[n]['jeito']}.
Escreva 8 depoimentos curtos (até 30 palavras) dele(a) sozinho(a) para a câmera, misturando vida pessoal,
saudade, estratégia e o que pensa dos colegas ({', '.join(x for x in BIOS if x != n)}).
JSON: {{"falas": ["..."]}}""", temp=1.0, max_tokens=900)
    return n, r.get("falas", [])

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--pares", type=int, default=28)
    ap.add_argument("--trios", type=int, default=40)
    ap.add_argument("--quartetos", type=int, default=30)
    a = ap.parse_args()
    nomes = list(BIOS)
    grupos = random.sample(list(itertools.combinations(nomes, 2)), a.pares) \
           + random.sample(list(itertools.combinations(nomes, 3)), a.trios) \
           + random.sample(list(itertools.combinations(nomes, 4)), a.quartetos)
    with ThreadPoolExecutor(8) as ex:
        convs = [c for c in ex.map(gerar, grupos) if c]
        confs = dict(ex.map(confessionario, nomes))
    (AQUI / "conversas.json").write_text(json.dumps({"conversas": convs, "confessionario": confs}, ensure_ascii=False))
    print(f"{len(convs)} conversas · {USO}")
