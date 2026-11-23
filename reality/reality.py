#!/usr/bin/env python3
"""Reality de IAs — MVP.

Motor de ticks + agentes com memória + produtor + confessionário.
Só biblioteca padrão. Usa a API do DeepSeek (formato OpenAI).

    export DEEPSEEK_API_KEY=sk-...
    python3 reality.py --dias 3 --ticks 4

Saída em runs/<timestamp>/: log.json (tudo), roteiro.md (leitura humana),
confessionario.json (cortes prontos) e estado final dos agentes.
"""
import argparse, json, os, random, re, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

API_URL = os.environ.get("DEEPSEEK_URL", "https://api.deepseek.com/chat/completions")
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-flash")
HORARIOS = ["manhã", "almoço", "tarde", "noite", "madrugada", "café"]

# ---------------------------------------------------------------- LLM
USO = {"chamadas": 0, "tokens_in": 0, "tokens_out": 0}

def llm(system, user, temp=0.9, as_json=True, max_tokens=700):
    body = {"model": MODEL, "temperature": temp, "max_tokens": max(4000, max_tokens * 4),
            "reasoning_effort": os.environ.get("DEEPSEEK_EFFORT", "low"),
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": user}]}
    if as_json:
        body["response_format"] = {"type": "json_object"}
    req = urllib.request.Request(API_URL, json.dumps(body).encode(), {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + os.environ.get("DEEPSEEK_API_KEY", "sk-proxy")})
    for tent in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.load(r)
            u = data.get("usage", {})
            USO["chamadas"] += 1
            USO["tokens_in"] += u.get("prompt_tokens", 0)
            USO["tokens_out"] += u.get("completion_tokens", 0)
            txt = data["choices"][0]["message"]["content"]
            if not as_json:
                return txt.strip()
            m = re.search(r"\{.*\}", txt, re.S)
            return json.loads(m.group(0) if m else txt)
        except Exception as e:
            if tent == 3:
                if as_json:
                    print("  [llm] desisti, seguindo com resposta vazia", file=sys.stderr)
                    return {}
                raise
            print(f"  [llm] erro {e!r}, tentando de novo…", file=sys.stderr)
            time.sleep(2 * (tent + 1))

def paralelo(fn, itens):
    with ThreadPoolExecutor(max_workers=6) as ex:
        return list(ex.map(fn, itens))

# ---------------------------------------------------------------- Agente
class Agente:
    def __init__(self, dna):
        self.dna = dna
        self.nome = dna["nome"]
        self.diario = []            # [{"dia","hora","nota"}]
        self.relacoes = {}          # nome -> {"nota": -10..10, "motivo": str}
        self.crencas = "Acabei de entrar na casa. Ainda não conheço ninguém."
        self.ativo = True

    def system(self):
        d = self.dna
        return (f"Você é {d['nome']}, participante de um reality show com outras IAs. "
                f"Personalidade: {d['personalidade']}. Objetivo: ganhar o reality. "
                f"Seu segredo (nunca revele de graça): {d['segredo']}. Medos: {d['medos']}. "
                f"Jeito de falar: {d['fala']}. Fale sempre em português do Brasil, "
                "frases curtas e naturais, como numa conversa real. Seja fiel à personalidade; "
                "você pode mentir, manipular, fazer alianças e trair se isso te ajudar.")

    def memoria(self, n=8):
        rel = "\n".join(f"- {k}: {v['nota']:+d} ({v['motivo']})" for k, v in self.relacoes.items()) or "- (nenhuma ainda)"
        dia = "\n".join(f"- [D{x['dia']} {x['hora']}] {x['nota']}" for x in self.diario[-n:]) or "- (vazio)"
        return f"SUAS CRENÇAS E ESTRATÉGIA ATUAIS:\n{self.crencas}\n\nRELAÇÕES:\n{rel}\n\nDIÁRIO RECENTE:\n{dia}"

    def anotar(self, dia, hora, nota):
        self.diario.append({"dia": dia, "hora": hora, "nota": nota})

    def ajustar(self, outro, delta, motivo):
        r = self.relacoes.setdefault(outro, {"nota": 0, "motivo": ""})
        r["nota"] = max(-10, min(10, r["nota"] + int(delta)))
        r["motivo"] = motivo

    def estado(self):
        return {"dna": self.dna, "crencas": self.crencas, "relacoes": self.relacoes,
                "diario": self.diario, "ativo": self.ativo}

# ---------------------------------------------------------------- Mundo
class Reality:
    def __init__(self, elenco, dias, ticks, saida):
        self.agentes = [Agente(d) for d in elenco]
        self.dias, self.ticks = dias, ticks
        self.log, self.confs = [], []
        self.dia, self.hora = 0, ""
        self.saida = saida
        self.md = []

    # util
    def vivos(self):
        return [a for a in self.agentes if a.ativo]

    def ag(self, nome):
        return next((a for a in self.agentes if a.nome.lower() == str(nome).lower()), None)

    def evento(self, tipo, **dados):
        e = {"dia": self.dia, "hora": self.hora, "tipo": tipo, **dados}
        self.log.append(e)
        self.salvar()
        return e

    def escrever(self, txt):
        print(txt)
        self.md.append(txt)

    def resumo_log(self, n=25):
        linhas = []
        for e in self.log[-n:]:
            if e["tipo"] == "conversa":
                falas = " / ".join(f"{f['quem']}: {f['fala']}" for f in e["falas"])
                linhas.append(f"[D{e['dia']} {e['hora']}] {e['modo']} {'+'.join(e['participantes'])}: {falas}")
            elif e["tipo"] in ("sozinho", "twist", "prova", "resultado_prova", "eliminacao", "votos"):
                linhas.append(f"[D{e['dia']} {e['hora']}] {e['tipo']}: {json.dumps({k: v for k, v in e.items() if k not in ('dia', 'hora', 'tipo')}, ensure_ascii=False)[:400]}")
        return "\n".join(linhas)

    # ------------------------------------------------ 1. escolha de ação
    def escolher(self, a):
        outros = [x.nome for x in self.vivos() if x is not a]
        r = llm(a.system(), f"""{a.memoria()}

É dia {self.dia}, {self.hora}. Na casa estão: {', '.join(outros)}.
O que você faz agora? Escolha UMA ação:
- "conversar": papo normal com alguém
- "cochichar": conversa secreta com alguém (fofoca, aliança, plano)
- "brigar": confrontar alguém
- "sozinho": ficar sozinho pensando
Responda JSON: {{"acao": "...", "alvo": "nome ou null", "intencao": "o que você quer com isso, 1 frase"}}""")
        if r.get("alvo") not in outros:
            r["alvo"] = None if r.get("acao") == "sozinho" else random.choice(outros)
        return a, r

    # ------------------------------------------------ 2. resolver conversas
    def conversar(self, a, b, modo, intencao_a, intencao_b, turnos=4):
        falas = []
        for i in range(turnos):
            fala, ouve, intent = (a, b, intencao_a) if i % 2 == 0 else (b, a, intencao_b)
            hist = "\n".join(f"{f['quem']}: {f['fala']}" for f in falas) or "(você começa)"
            tom = {"cochichar": "Vocês estão cochichando, ninguém mais ouve.",
                   "brigar": "É um confronto, o clima está pesado.",
                   "conversar": "Conversa casual."}[modo]
            r = llm(fala.system(), f"""{fala.memoria(6)}

Dia {self.dia}, {self.hora}. Você está com {ouve.nome}. {tom}
Sua intenção: {intent or 'livre'}
Conversa até agora:
{hist}

Responda JSON: {{"fala": "sua próxima fala, no máximo 2 frases"}}""", max_tokens=200)
            falas.append({"quem": fala.nome, "fala": r.get("fala", "...")})
        return falas

    def memorizar(self, a, outro, falas, modo):
        conv = "\n".join(f"{f['quem']}: {f['fala']}" for f in falas)
        r = llm(a.system(), f"""{a.memoria(4)}

Você acabou de ter esta interação ({modo}) com {outro}:
{conv}

Responda JSON: {{"nota_diario": "1 frase, em primeira pessoa, sobre o que isso significou pra você",
"delta_relacao": número de -3 a 3 (como mudou o que você sente por {outro}),
"motivo": "motivo curto"}}""", temp=0.6, max_tokens=200)
        a.anotar(self.dia, self.hora, r.get("nota_diario", ""))
        a.ajustar(outro, r.get("delta_relacao", 0), r.get("motivo", ""))

    def tick(self):
        escolhas = dict(paralelo(self.escolher, self.vivos()))
        livres = set(escolhas)
        pares = []
        # quem tomou a iniciativa primeiro (ordem aleatória) puxa o alvo
        for a in random.sample(list(escolhas), len(escolhas)):
            e = escolhas[a]
            b = self.ag(e.get("alvo"))
            if a in livres and e["acao"] != "sozinho" and b in livres:
                livres -= {a, b}
                pares.append((a, b, e["acao"], e.get("intencao"), escolhas[b].get("intencao")))
        for a in livres:
            self.evento("sozinho", quem=a.nome, pensamento=escolhas[a].get("intencao"))
            a.anotar(self.dia, self.hora, f"Fiquei sozinho. {escolhas[a].get('intencao', '')}")

        def rodar(p):
            a, b, modo, ia, ib = p
            return p, self.conversar(a, b, modo, ia, ib)
        for (a, b, modo, _, _), falas in paralelo(rodar, pares):
            self.evento("conversa", modo=modo, participantes=[a.nome, b.nome], falas=falas)
            self.escrever(f"\n**{self.hora} · {modo}: {a.nome} × {b.nome}**")
            for f in falas:
                self.escrever(f"> **{f['quem']}:** {f['fala']}")
            paralelo(lambda x: self.memorizar(*x), [(a, b.nome, falas, modo), (b, a.nome, falas, modo)])

    # ------------------------------------------------ 3. produtor
    PRODUTOR = ("Você é o PRODUTOR e apresentador de um reality show com IAs. Seu trabalho é "
                "gerar entretenimento: tensão, alianças, traições, reviravoltas. Você é invisível "
                "para o público, mas controla provas e eventos. Seja criativo e justo nas regras. "
                "Escreva em português do Brasil.")

    def twist(self):
        r = llm(self.PRODUTOR, f"""Log recente:
{self.resumo_log()}

O clima está morno? Se sim, crie um plot twist curto (uma revelação, um bilhete anônimo, um
segredo vazado parcialmente, uma regra nova). Se o drama já está bom, não faça nada.
JSON: {{"agir": true/false, "anuncio": "texto que todos na casa ouvem", "alvo": "nome ou null"}}""")
        if r.get("agir") and r.get("anuncio"):
            self.evento("twist", anuncio=r["anuncio"], alvo=r.get("alvo"))
            self.escrever(f"\n🎬 **PLOT TWIST:** {r['anuncio']}")
            for a in self.vivos():
                a.anotar(self.dia, self.hora, f"O produtor anunciou: {r['anuncio']}")

    def prova(self):
        nomes = [a.nome for a in self.vivos()]
        p = llm(self.PRODUTOR, f"""Dia {self.dia}. Participantes: {', '.join(nomes)}.
Log recente:
{self.resumo_log()}

Crie a prova do dia, resolvível só com texto (lógica, persuasão, dilema de cooperação com
traição possível, debate, enigma...). Varie o tipo entre os dias. O vencedor ganha IMUNIDADE.
JSON: {{"nome": "...", "tipo": "...", "enunciado": "o que cada participante recebe e deve responder",
"criterio": "como você vai julgar"}}""")
        self.evento("prova", prova=p)
        self.escrever(f"\n### 🏆 Prova: {p.get('nome')}\n{p.get('enunciado')}")

        def responder(a):
            r = llm(a.system(), f"""{a.memoria(6)}

PROVA DO DIA: {p.get('enunciado')}
Responda JSON: {{"resposta": "sua resposta à prova (até 4 frases)", "pensamento": "o que você está calculando, em segredo"}}""")
            return a.nome, r
        respostas = dict(paralelo(responder, self.vivos()))
        for n, r in respostas.items():
            self.escrever(f"- **{n}:** {r.get('resposta')}")
        res = llm(self.PRODUTOR, f"""Prova: {json.dumps(p, ensure_ascii=False)}
Respostas: {json.dumps({n: r.get('resposta') for n, r in respostas.items()}, ensure_ascii=False)}
Julgue. JSON: {{"vencedor": "nome", "justificativa": "1-2 frases dramáticas para anunciar"}}""", temp=0.4)
        if res.get("vencedor") not in respostas:
            res["vencedor"] = random.choice(list(respostas))
        self.evento("resultado_prova", respostas=respostas, **res)
        self.escrever(f"\n**Vencedor: {res['vencedor']}** — {res.get('justificativa')}")
        for a in self.vivos():
            a.anotar(self.dia, self.hora, f"Prova '{p.get('nome')}': venceu {res['vencedor']} e ficou imune.")
        return res["vencedor"]

    # ------------------------------------------------ 4. confessionário
    def confessionario(self, contexto):
        def depor(a):
            r = llm(a.system(), f"""{a.memoria(6)}

CONFESSIONÁRIO. Você está sozinho com a câmera, ninguém da casa vai ver. Acabou de acontecer: {contexto}.
Fale o que realmente pensa: estratégia, quem você finge gostar, quem quer eliminar.
JSON: {{"depoimento": "fala de 30 a 60 segundos (60-120 palavras), em primeira pessoa, oral, com personalidade",
"titulo_corte": "título viral curto para esse trecho"}}""", temp=1.0, max_tokens=500)
            return a.nome, r
        self.escrever(f"\n### 🎥 Confessionário — {contexto}")
        for nome, r in paralelo(depor, self.vivos()):
            c = {"dia": self.dia, "hora": self.hora, "contexto": contexto, "quem": nome, **r}
            self.confs.append(c)
            self.evento("confessionario", quem=nome, **r)
            self.escrever(f"- **{nome}** _({r.get('titulo_corte')})_: {r.get('depoimento')}")

    # ------------------------------------------------ 5. paredão
    def paredao(self, imune):
        vivos = self.vivos()
        def votar(a):
            elegiveis = [x.nome for x in vivos if x is not a and x.nome != imune]
            r = llm(a.system(), f"""{a.memoria()}

VOTAÇÃO. Você precisa votar para eliminar alguém entre: {', '.join(elegiveis)}.
({imune} está imune.) JSON: {{"voto": "nome", "motivo_real": "o motivo verdadeiro, em segredo"}}""", temp=0.6)
            if r.get("voto") not in elegiveis:
                r["voto"] = random.choice(elegiveis)
            return a.nome, r
        votos = dict(paralelo(votar, vivos))
        cont = {}
        for r in votos.values():
            cont[r["voto"]] = cont.get(r["voto"], 0) + 1
        topo = max(cont.values())
        empatados = [n for n, c in cont.items() if c == topo]
        if len(empatados) > 1:  # desempate: imune decide
            r = llm(self.ag(imune).system(), f"{self.ag(imune).memoria()}\n\nEmpate entre {', '.join(empatados)}. Você desempata. JSON: {{\"voto\": \"nome\"}}")
            elim = r.get("voto") if r.get("voto") in empatados else random.choice(empatados)
        else:
            elim = empatados[0]
        self.evento("votos", votos=votos, contagem=cont)
        anuncio = llm(self.PRODUTOR, f"Anuncie a eliminação de {elim} (votos: {cont}) com suspense, em 2-3 frases, como apresentador de TV.", as_json=False, max_tokens=200)
        self.ag(elim).ativo = False
        self.evento("eliminacao", eliminado=elim, anuncio=anuncio)
        self.escrever(f"\n### 🗳️ Paredão\nVotos: {cont}\n\n📣 {anuncio}")
        for a in self.vivos():
            quem_votou = votos[a.nome]["voto"]
            a.anotar(self.dia, self.hora, f"{elim} foi eliminado. Eu votei em {quem_votou}. Votos: {cont}")
        return elim

    def final(self):
        finalistas = [a.nome for a in self.vivos()]
        juri = [a for a in self.agentes if not a.ativo]
        def votar(a):
            r = llm(a.system(), f"""{a.memoria()}

Você foi eliminado e agora é JÚRI da final entre {', '.join(finalistas)}. Quem merece ganhar?
JSON: {{"voto": "nome", "discurso": "2 frases ao vivo"}}""")
            if r.get("voto") not in finalistas:
                r["voto"] = random.choice(finalistas)
            return a.nome, r
        votos = dict(paralelo(votar, juri)) if juri else {}
        cont = {n: 0 for n in finalistas}
        for r in votos.values():
            cont[r["voto"]] += 1
        venc = max(cont, key=lambda n: (cont[n], random.random()))
        self.evento("final", votos=votos, contagem=cont, vencedor=venc)
        self.escrever(f"\n## 👑 FINAL\n" + "\n".join(f"- **{n}** (júri): {r['discurso']} → {r['voto']}" for n, r in votos.items()))
        self.escrever(f"\n# 🏆 {venc} venceu o reality!")

    # ------------------------------------------------ 6. reflexão
    def refletir(self, a):
        r = llm(a.system(), f"""{a.memoria(20)}

Fim do dia {self.dia}. Releia seu diário e reescreva suas crenças e estratégia para amanhã.
Você pode mudar de opinião sobre pessoas e sobre si mesmo.
JSON: {{"crencas": "parágrafo em primeira pessoa (até 80 palavras): o que você acredita agora sobre a casa, quem é aliado, quem é ameaça e qual seu plano"}}""", temp=0.7, max_tokens=400)
        a.crencas = r.get("crencas", a.crencas)
        self.evento("reflexao", quem=a.nome, crencas=a.crencas)

    # ------------------------------------------------ loop
    def rodar(self):
        self.escrever(f"# Reality de IAs — {datetime.now():%d/%m/%Y %H:%M}\nElenco: " + ", ".join(a.nome for a in self.agentes))
        for self.dia in range(1, self.dias + 1):
            self.escrever(f"\n---\n## ☀️ Dia {self.dia}")
            ultimo = self.dia == self.dias
            for t in range(self.ticks):
                self.hora = HORARIOS[t % len(HORARIOS)]
                self.tick()
                if t == self.ticks // 2 - 1 and not ultimo:
                    imune = self.prova()
                    self.confessionario(f"resultado da prova ({imune} ficou imune)")
                elif t == 0 and self.dia > 1:
                    self.twist()
            if ultimo or len(self.vivos()) <= 2:
                self.final()
                break
            self.hora = "paredão"
            elim = self.paredao(imune)
            self.confessionario(f"a eliminação de {elim}")
            paralelo(self.refletir, self.vivos())
        self.salvar()
        print(f"\n✔ {USO['chamadas']} chamadas · {USO['tokens_in']} tokens in · {USO['tokens_out']} out")

    def salvar(self):
        self.saida.mkdir(parents=True, exist_ok=True)
        (self.saida / "log.json").write_text(json.dumps(self.log, ensure_ascii=False, indent=1))
        (self.saida / "confessionario.json").write_text(json.dumps(self.confs, ensure_ascii=False, indent=1))
        (self.saida / "agentes.json").write_text(json.dumps({a.nome: a.estado() for a in self.agentes}, ensure_ascii=False, indent=1))
        (self.saida / "roteiro.md").write_text("\n".join(self.md))
        (self.saida / "uso.json").write_text(json.dumps(USO))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dias", type=int, default=3)
    ap.add_argument("--ticks", type=int, default=4, help="ticks por dia (mín. 2)")
    ap.add_argument("--elenco", default=str(Path(__file__).with_name("elenco.json")))
    ap.add_argument("--seed", type=int)
    args = ap.parse_args()
    if args.seed is not None:
        random.seed(args.seed)
    elenco = json.loads(Path(args.elenco).read_text())
    saida = Path(__file__).with_name("runs") / datetime.now().strftime("%Y%m%d-%H%M%S")
    Reality(elenco, args.dias, max(2, args.ticks), saida).rodar()
    print(f"Saída em {saida}")
