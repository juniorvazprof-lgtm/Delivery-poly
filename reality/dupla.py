#!/usr/bin/env python3
"""Dois bots sozinhos na casa, cada passo decidido por uma chamada ao DeepSeek.

Cada turno (15 min do reality) um bot recebe: hora, onde está, onde o outro está,
o que ouviu, a própria memória. Ele decide para onde vai, o que faz, o que fala
e o que pensa. Fala só é ouvida se os dois estiverem no mesmo cômodo.

    python3 dupla.py --a Duda --b Caio --inicio 9 --fim 23
Saída: dupla.json (linha do tempo que a página casa-dupla.html encena).
"""
import argparse, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from reality import llm, USO

AQUI = Path(__file__).parent
BIOS = {b["n"]: b for b in json.loads((AQUI / "casa_bios.json").read_text())}
COMODOS = {"quarto": "quarto com as camas", "lider": "quarto do líder (vazio, porta aberta)",
           "confess": "confessionário (sozinho com a câmera)", "sala": "sala com sofá",
           "cozinha": "cozinha", "jardim": "área externa com espreguiçadeiras", "piscina": "dentro da piscina"}

class Bot:
    def __init__(self, nome, local):
        self.n, self.b, self.local = nome, BIOS[nome], local
        self.diario, self.ouviu = [], []
        self.sinto, self.motivo = 0, "acabamos de nos conhecer"
        self.humor = "curioso(a)"

    def system(self):
        b = self.b
        return (f"Você é {self.n}, {b['idade']} anos, participante de um reality show brasileiro. "
                f"Sua história: {b['bio']} Seu jeito de falar: {b['jeito']}. "
                "Só existe mais uma pessoa na casa. Você quer ganhar, mas também é humano(a): tem carência, "
                "tédio, saudade, desejo, irritação. Fale como gente de verdade, frases curtas, português do Brasil.")

def turno(eu, outro, hora, ultimo_evento):
    junto = eu.local == outro.local
    ouvi = "\n".join(eu.ouviu[-6:]) or "(nada ainda)"
    mem = "\n".join(eu.diario[-8:]) or "(começo do dia)"
    cena = (f"{outro.n} está aqui com você, fazendo: {ultimo_evento.get('fazer', '?')}."
            if junto else f"{outro.n} está em: {COMODOS[outro.local]}. Vocês não se ouvem.")
    r = llm(eu.system(), f"""Hora: {hora}. Você está em: {COMODOS[eu.local]}. Humor: {eu.humor}.
{cena}
O que você sente por {outro.n}: {eu.sinto:+d}/10 ({eu.motivo}).

Conversa recente que você ouviu:
{ouvi}

Seu diário de hoje:
{mem}

Decida seu próximo passo (15 minutos). Pode ficar, ir atrás de {outro.n}, fugir, cuidar da vida.
Se estiverem juntos, responda ao que foi dito ou puxe assunto da sua vida; não repita assuntos.
Cômodos: {', '.join(COMODOS)}.
JSON: {{"ir_para": "cômodo", "fazer": "ação curta (ex: lavando louça, deitado no sofá)",
"fala": "o que você diz em voz alta (até 30 palavras) ou \\"\\" se ficar calado",
"pensamento": "o que pensa e não diz (até 20 palavras)",
"humor": "1-2 palavras", "sinto": -10..10, "motivo": "por quê, curto"}}""", temp=0.95, max_tokens=500)
    para = r.get("ir_para") if r.get("ir_para") in COMODOS else eu.local
    if para == "lider" and eu.local != "lider" and hora < "10:00":
        para = eu.local
    ev = {"hora": hora, "quem": eu.n, "de": eu.local, "para": para,
          "fazer": r.get("fazer", ""), "fala": r.get("fala", "") or "",
          "pensamento": r.get("pensamento", ""), "humor": r.get("humor", eu.humor),
          "sinto": max(-10, min(10, int(r.get("sinto", eu.sinto) or 0))), "motivo": r.get("motivo", "")}
    falou_junto = ev["fala"] and para == outro.local  # fala depois de chegar
    eu.local, eu.humor, eu.sinto, eu.motivo = para, ev["humor"], ev["sinto"], ev["motivo"] or eu.motivo
    ev["ouvido"] = bool(falou_junto)
    nota = f"[{hora}] fui para {para}, {ev['fazer']}" + (f'; eu disse: "{ev["fala"]}"' if ev["fala"] else "")
    eu.diario.append(nota)
    if ev["fala"]:
        eu.ouviu.append(f"{eu.n}: {ev['fala']}")
        if falou_junto:
            outro.ouviu.append(f"{eu.n}: {ev['fala']}")
    return ev

def relogio(minutos):
    return f"{minutos // 60:02d}:{minutos % 60:02d}"

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--a", default="Duda"); ap.add_argument("--b", default="Caio")
    ap.add_argument("--inicio", type=int, default=9); ap.add_argument("--fim", type=int, default=23)
    ap.add_argument("--passo", type=int, default=15, help="minutos por turno")
    args = ap.parse_args()
    A, B = Bot(args.a, "quarto"), Bot(args.b, "cozinha")
    linha, ult = [], {A.n: {"fazer": "acordando"}, B.n: {"fazer": "fazendo café"}}
    t = args.inicio * 60
    while t < args.fim * 60:
        for eu, outro in ((A, B), (B, A)):
            ev = turno(eu, outro, relogio(t), ult[outro.n])
            ult[eu.n] = ev
            linha.append(ev)
            onde = f"{ev['de']}→{ev['para']}" if ev["de"] != ev["para"] else ev["para"]
            print(f"{ev['hora']} {ev['quem']:7} [{onde}] {ev['fazer']} | {ev['fala'] or '…'}  ({ev['sinto']:+d})")
            t += args.passo // 2 if eu is A else args.passo - args.passo // 2
    out = {"bots": [{"n": x.n, "idade": x.b["idade"], "bio": x.b["bio"]} for x in (A, B)],
           "inicio": {A.n: "quarto", B.n: "cozinha"}, "eventos": linha, "uso": USO}
    (AQUI / "dupla.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"✔ {len(linha)} turnos · {USO}")
