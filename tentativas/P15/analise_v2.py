"""v2: recuperabilidade sem portão FAP + limiar empírico. Lê saida_bruta.json (sem recomputar periodogramas)."""
import json, numpy as np
from injrec import classifica
D = json.load(open("saida_bruta.json")); R = D["rows"]; T_BASE = 27.0
bins = [10, 12, 13, 14, 15, 16, 16.5, 17, 17.5, 18]; amps = [(5e-4, 2e-3), (2e-3, 1e-2), (1e-2, 5e-2)]
out = {"nota": "C = fração em que o pico mais alto coincide com P_injetado (|Δf|<1/T), sem portão de FAP; "
       "frac_ctrl_FAP<1% = estrelas-controle com FAP Baluev<1%; sim=True: ruído degradado artificialmente", "tabela": []}
for lo, hi in zip(bins[:-1], bins[1:]):
    sel = [x for x in R if lo <= x["T"] < hi]
    ctrl = [x for x in sel if not x["inj"]]
    lin = {"T": f"{lo}-{hi}", "sim": sel[0]["sim"], "n": len(ctrl),
           "frac_ctrl_FAP<1%": round(np.mean([x["fap"] < 0.01 for x in ctrl]), 2)}
    for al, ah in amps:
        s = [x for x in sel if x["inj"] and al <= x["A"] < ah]
        lin[f"C {al*1e3:g}-{ah*1e3:g}ppt"] = round(np.mean([classifica(x["Pr"], x["P"], T_BASE) == "ok" for x in s]), 2)
    out["tabela"].append(lin)
# T50: magnitude em que C cai a 50%, por amplitude (interpolação linear nos centros de bin)
cent = [(lo+hi)/2 for lo, hi in zip(bins[:-1], bins[1:])]
for al, ah in amps:
    c = [l[f"C {al*1e3:g}-{ah*1e3:g}ppt"] for l in out["tabela"]]
    t50 = next((cent[i-1] + (0.5-c[i-1])*(cent[i]-cent[i-1])/(c[i]-c[i-1]) for i in range(1, len(c)) if c[i-1] >= .5 > c[i]), None)
    out[f"T50 {al*1e3:g}-{ah*1e3:g}ppt"] = None if t50 is None else round(t50, 2)
json.dump(out, open("saida_v2.json", "w"), ensure_ascii=False, indent=1)
for l in out["tabela"]: print(l)
print({k: v for k, v in out.items() if k.startswith("T50")})
