#!/usr/bin/env python3
"""Envia um briefing ao DeepSeek (agente construtor) e grava os arquivos retornados.
Uso: python3 tools/ds.py briefing.md pasta_destino
Formato de resposta exigido: blocos  ===FILE: caminho===  ...  ===END===  """
import json, os, re, sys, urllib.request
brief, out = open(sys.argv[1]).read(), sys.argv[2]
if len(sys.argv) > 3: brief += "\n\nNESTA RESPOSTA entregue SOMENTE estes arquivos, completos: " + sys.argv[3]
body = {"model": os.environ.get("DS_MODEL", "deepseek-v4-pro"), "max_tokens": 60000,
        "messages": [{"role": "system", "content": "Você é um desenvolvedor front-end sênior. Responda SOMENTE com blocos ===FILE: caminho=== conteúdo ===END===, sem comentários."},
                     {"role": "user", "content": brief}]}
req = urllib.request.Request("https://api.deepseek.com/chat/completions", json.dumps(body).encode(),
      {"Content-Type": "application/json", "Authorization": "Bearer proxy"})
r = json.load(urllib.request.urlopen(req, timeout=900))["choices"][0]; print("finish:", r["finish_reason"])
txt = r["message"]["content"]
open(os.path.join(out, ".ds_raw_%d.txt" % os.getpid()), "w").write(txt)
def parse(txt):
    parts = re.split(r"^===FILE: *(.+?) *===[ \t]*$", txt, flags=re.M)
    for path, c in zip(parts[1::2], parts[2::2]):
        c = re.sub(r"\s*===END===\s*$", "", c.strip())
        c = re.sub(r"^```[\w-]*\n|\n```$", "", c.strip())
        yield path.strip(), c + "\n"
for path, content in parse(txt):
    p = os.path.abspath(os.path.join(out, path))
    assert p.startswith(os.path.abspath(out)), p
    os.makedirs(os.path.dirname(p), exist_ok=True); open(p, "w").write(content); print("ok", p)
