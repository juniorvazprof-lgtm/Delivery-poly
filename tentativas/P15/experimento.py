"""P15 — injeção-recuperação em curvas TGLC reais (setor 1, 600 estrelas aleatórias).
T<=16: ruído real. T=16-18: curvas reais de T 15-16 + ruído branco extra até o rms previsto
pelo ajuste rms(T) (aproximação documentada). Uso: python3 experimento.py <dir_fits>"""
import glob, json, sys, numpy as np
from astropy.io import fits
from injrec import run_curve
rng = np.random.default_rng(2026)
def carrega(f):
    h = fits.open(f); d = h[1].data; T = h[0].header["TESSMAG"]
    ok = (d["TGLC_flags"] == 0) & (d["TESS_flags"] == 0) & np.isfinite(d["cal_aper_flux"]) & (d["cal_aper_flux"] > 0)
    return T, d["time"][ok], d["cal_aper_flux"][ok]
curvas = [c for c in map(carrega, sorted(glob.glob(sys.argv[1] + "/*.fits"))) if c[1].size > 500]
# ruído ponto-a-ponto robusto (MAD das diferenças / sqrt2) — insensível a variabilidade lenta
rms = np.array([1.4826*np.median(np.abs(np.diff(f/np.median(f))))/np.sqrt(2) for _, _, f in curvas])
Ts = np.array([c[0] for c in curvas])
a, b = np.polyfit(Ts[Ts > 12], np.log10(rms[Ts > 12]), 1)      # log rms = a T + b
rows = []
for (T, t, f), r in zip(curvas, rms):
    for x in run_curve(t, f, rng, n_inj=20): rows.append(dict(x, T=T, sim=False))
base = [(c, r) for c, r in zip(curvas, rms) if 15 <= c[0] < 16]
for Talvo in [16.25, 16.75, 17.25, 17.75]:
    for (T, t, f), r in base[:60]:
        alvo = 10**(a*Talvo + b) * 10**(a*(T - 15.5) * 0)   # rms previsto em Talvo
        extra = np.sqrt(max(alvo**2 - r**2, 0))
        g = f/np.median(f) + rng.normal(0, extra, f.size)
        for x in run_curve(t, g, rng, n_inj=20): rows.append(dict(x, T=Talvo, sim=True))
json.dump({"ajuste_logrms": [a, b], "n_curvas": len(curvas),
           "rows": [{k: (float(v) if isinstance(v, (np.floating, float)) else v) for k, v in r.items()} for r in rows]},
          open("saida_bruta.json", "w"))
# resumo
bins = [10, 12, 13, 14, 15, 16, 16.5, 17, 17.5, 18]; amps = [(5e-4, 2e-3), (2e-3, 1e-2), (1e-2, 5e-2)]
res = {"ajuste": f"log10(rms) = {a:.3f} T + {b:.3f}", "n_curvas_reais": len(curvas), "tabela": []}
for lo, hi in zip(bins[:-1], bins[1:]):
    sel = [x for x in rows if lo <= x["T"] < hi]
    if not sel: continue
    lin = {"T": f"{lo}-{hi}", "sim": bool(sel[0]["sim"]), "n_curvas": sum(not x["inj"] for x in sel),
           "FPR": round(np.mean([x["res"] == "fp" for x in sel if not x["inj"]]), 3)}
    for al, ah in amps:
        s = [x for x in sel if x["inj"] and al <= x["A"] < ah]
        lin[f"C(A={al*1e3:g}-{ah*1e3:g}ppt)"] = round(np.mean([x["res"] == "ok" for x in s]), 3)
        lin[f"alias(A={al*1e3:g}-{ah*1e3:g}ppt)"] = round(np.mean([x["res"] in ("meio", "dobro") for x in s]), 3)
    res["tabela"].append(lin)
json.dump(res, open("saida_resumo.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))
