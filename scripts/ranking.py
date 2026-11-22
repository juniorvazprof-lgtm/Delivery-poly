"""Etapa 2: DeepSeek pontua candidatos pré-filtrados pelo orquestrador; gera fila.json."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__)); from deepseek import ask
SEL = [0, 1, 3, 11, 12, 14, 22, 25, 29, 33, 35, 40, 45, 52, 61, 65]   # escolhidos pelo Claude
ps = json.load(open("garimpo/brutos.json"))["problemas"]
cand = [dict(ps[i], cid=f"P{n+1:02d}") for n, i in enumerate(SEL)]
TAREFA = ("Pontue cada problema para um projeto SÓ COMPUTACIONAL (Python, dados públicos TESS/Gaia via MAST, "
          "CPU comum, sem novas observações). dificuldade 1=fácil..5=muito difícil; verificabilidade 1..5 "
          "(5=resultado checável por número/métrica objetiva); novidade 1..5. Proponha em 1 frase uma "
          "abordagem mínima verificável. Formato: {\"itens\":[{\"cid\":..,\"dificuldade\":..,"
          "\"verificabilidade\":..,\"novidade\":..,\"abordagem\":\"<pt>\"}]}")
entrada = "\n".join(f"{c['cid']} [{c['id']}] {c['problema']} | trecho: {c['trecho']}" for c in cand)
r, tok = ask(TAREFA, entrada, max_tokens=2500)
nota = {x["cid"]: x for x in r["itens"]}
for c in cand: c.update({k: nota[c["cid"]][k] for k in ("dificuldade", "verificabilidade", "novidade", "abordagem")})
cand.sort(key=lambda c: (c["dificuldade"], -c["verificabilidade"], -c["novidade"]))
json.dump(cand, open("garimpo/candidatos.json", "w"), ensure_ascii=False, indent=1)
print("tokens", tok)
for c in cand: print(c["cid"], c["id"], f'D{c["dificuldade"]} V{c["verificabilidade"]} N{c["novidade"]}', c["problema"][:90], "\n    ->", c["abordagem"])
