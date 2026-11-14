"""Monta src/data/catecismo.json: texto italiano de 1912 (domínio público) + tradução própria (rascunho, em revisão)
+ notas da conferência com o CIC (só referências e paráfrases curtas, nada copiado do CIC)."""
import csv, json, re, os
D = os.path.dirname(os.path.abspath(__file__))
it = json.load(open(f"{D}/catecismo-pio-x-1912-it.json"))["perguntas"]
pt = {x["n"]: x for x in json.load(open(f"{D}/traducao-ptbr-rascunho.json"))}
CAP = {"Prime nozioni della fede cristiana": "Primeiras noções da fé", "CAPO I: I Misteri principali": "Os mistérios principais", "CAPO II: Unità e Trinità": "Deus uno e trino",
 "CAPO III: Creazione": "Criação e queda do homem", "CAPO IV:Incarnazione": "Encarnação, Paixão e Morte de Jesus", "CAPO V: Venuta": "A volta de Jesus e o juízo",
 "CAPO VI: Chiesa": "A Igreja e a comunhão dos santos", "CAPO VII: Remissione": "Perdão dos pecados e o pecado", "CAPO VIII: Resurrezione": "Ressurreição e vida eterna",
 "CAPO I: Comandamenti": "Os mandamentos de Deus", "CAPO II: Precetti": "Os preceitos da Igreja", "CAPO III: Virtù": "As virtudes",
 "CAPO I: Sacramenti": "Os sacramentos", "CAPO II Battesimo": "Batismo", "CAPO III Cresima": "Crisma", "CAPO IV Eucaristia": "Eucaristia e Missa",
 "CAPO V: Penitenza": "Confissão", "CAPO VI Estrema": "Extrema-Unção (Unção dos Enfermos)", "CAPO VII Ordine": "Ordem", "CAPO VIII: Matrimonio": "Matrimônio", "CAPO UNICO": "A oração"}
PARTE = {"Prime": "Introdução", "PARTE I": "O Credo", "Parte II": "Os mandamentos", "PARTE III": "Sacramentos e oração"}
TEMA = {"Batismo": "sacramentos", "Crisma": "sacramentos", "Eucaristia e Missa": "missa", "Confissão": "sacramentos", "Ordem": "sacramentos", "Matrimônio": "sacramentos",
 "Os sacramentos": "sacramentos", "A oração": "oracoes", "Extrema-Unção (Unção dos Enfermos)": "sacramentos"}
ORD = ["PRIMO", "SECONDO", "TERZO", "QUARTO", "QUINTO", "SESTO", "SETTIMO", "OTTAVO", "NONO", "DECIMO"]
OPT = ["Primeiro", "Segundo", "Terceiro", "Quarto", "Quinto", "Sexto", "Sétimo", "Oitavo", "Nono", "Décimo"]
SUB = {"FEDE": "Fé", "SPERANZA": "Esperança", "CARITA": "Caridade", "§1. Comandamenti di Dio in generale": "Os mandamentos em geral",
 "§ 2. Comandamenti di Dio in particolare": "Cada mandamento", "§ 1. Virtù in generale — Virtù teologali": "Virtudes teologais",
 "§ 2 — Esercizio degli atti di fede, di speranza e di carità — Consigli evangelici": "Atos de fé, esperança e caridade · conselhos evangélicos",
 "§ 3. Virtù morale e vizio — Beatitudini evangeliche": "Virtudes morais, vícios e bem-aventuranças", "§ 1 — Sacramento, istituzione, fine": "O sacramento",
 "§ 2 — Presenza reale di Gesù Cristo nell'Eucaristia": "A presença real de Jesus", "§ 3. Santa comunione, disposizioni, obbligo, effetti": "A comunhão",
 "§ 4. Santo Sacrificio della Messa": "O santo sacrifício da Missa", "§ 1. Sacramento e sue parti — Esame di coscienza": "O sacramento e o exame de consciência",
 "§ 2 — Dolore e proponimento": "Arrependimento e propósito", "§ 3 — Confessione dei peccati": "A confissão dos pecados", "§ 4. Assoluzione — Soddisfazione — Indulgenze": "Absolvição, penitência e indulgências"}
def sub(x):
  s = x["sottotitolo"] or x["paragrafo"]
  if not s: return None
  for o, p in zip(ORD, OPT):
    if s == f"{o} COMANDAMENTO": return f"{p} mandamento"
    if s == f"{o} PRECETTO": return f"{p} preceito"
  return SUB[s]
def faixa(t):
  ns = set()
  for a in re.findall(r"\d+(?:-\d+)?", t.split("(")[0]):
    x, _, y = a.partition("-"); ns |= set(range(int(x), int(y or x) + 1))
  return ns
notas = []
for row in csv.DictReader(open(f"{D}/conferencia-cic.csv")):
  if row["edicao"] != "1912": continue
  notas.append({"perguntas": sorted(faixa(row["perguntas_pio_x"])), "tema": row["tema"], "tipo": row["tipo"], "texto": row["resumo_diferenca_ptbr"],
    "cic": row["cic_paragrafos"], "outras": re.sub(r":? ?https?://\S+", "", row["outras_referencias"]).strip()})
EXCLUIR = {409, 410, 411}  # Concordata italiana de 1929: não se aplica ao Brasil
out, caps = [], []
for x in it:
  if x["numero"] in EXCLUIR: continue
  cap = next(v for k, v in CAP.items() if (x["capo"] or x["parte"]).startswith(k))
  if cap not in caps: caps.append(cap)
  parte = next(v for k, v in PARTE.items() if x["parte"].startswith(k)); t = pt[x["numero"]]
  nota = [i for i, n in enumerate(notas) if x["numero"] in n["perguntas"]]
  q = {"n": x["numero"], "c": caps.index(cap), "p": t["p"].replace("'", "\""), "r": t["r"].replace("'", "\"")}
  if sub(x): q["s"] = sub(x)
  if nota: q["d"] = nota[0]
  if t.get("nota"): q["ne"] = t["nota"]
  out.append(q)
capitulos = []
for i, c in enumerate(caps):
  x = next(y for y in it if (next(v for k, v in CAP.items() if (y["capo"] or y["parte"]).startswith(k))) == c)
  capitulos.append({"nome": c, "parte": next(v for k, v in PARTE.items() if x["parte"].startswith(k)), "tema": TEMA.get(c, "catequese")})
json.dump({"fonte": "Catecismo da Doutrina Cristã de São Pio X (1912), texto italiano em domínio público (clerus.org). Tradução própria do Lumen Católico, em revisão.",
  "capitulos": capitulos, "notas": notas, "perguntas": out}, open(f"{D}/../../src/data/catecismo.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "perguntas,", len(capitulos), "capítulos,", len(notas), "notas,", sum(1 for q in out if "d" in q), "com nota")
