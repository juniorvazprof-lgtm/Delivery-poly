"""Teste de sanidade: ruído branco gaussiano, 1 setor (27 d, cadência 200 s). Completude deve subir com SNR."""
import numpy as np, json
from injrec import run_curve
rng = np.random.default_rng(42)
t = np.arange(0, 27, 200/86400); t = t[(t < 13) | (t > 14)]   # lacuna de downlink
res = {}
for sigma in [1e-3, 1e-2, 1e-1]:
    rows = []
    for _ in range(10): rows += run_curve(t, 1 + rng.normal(0, sigma, t.size), rng, n_inj=20)
    inj = [r for r in rows if r["inj"]]
    # SNR teórico do pico: A^2 N / (4 sigma^2); detectável ~ SNR > ~30 (FAP 1%)
    for lo, hi in [(5e-4,2e-3),(2e-3,1e-2),(1e-2,5e-2)]:
        sel = [r for r in inj if lo <= r["A"] < hi]
        c = np.mean([r["res"] == "ok" for r in sel]) if sel else np.nan
        res[f"sigma={sigma:g} A=[{lo:g},{hi:g})"] = {"n": len(sel), "completude": round(float(c), 3),
             "SNR_med": round(float(np.median([r['A']**2*t.size/(4*sigma**2) for r in sel])), 1)}
    res[f"sigma={sigma:g} FPR"] = float(np.mean([r["res"] == "fp" for r in rows if not r["inj"]]))
json.dump(res, open("sanidade_saida.json", "w"), indent=1); print(json.dumps(res, indent=1))
