"""Motor de injeção-recuperação (P15). Uso: from injrec import run_curve"""
import numpy as np
from astropy.timeseries import LombScargle
FMIN, FMAX = 1/20.0, 12.0          # grade de busca > faixa injetada (0,1–13 d) para evitar efeito de borda
def periodo(t, y, dy=None):
    ls = LombScargle(t, y, dy)
    f, p = ls.autopower(minimum_frequency=FMIN, maximum_frequency=FMAX, samples_per_peak=10)
    i = np.argmax(p); return 1/f[i], ls.false_alarm_probability(p[i], method="baluev",
                                       minimum_frequency=FMIN, maximum_frequency=FMAX)
def classifica(Pr, Pi, T):
    """acerto se |f_rec - f_alvo| < 1/T (1 elemento de resolução do periodograma)"""
    for nome, fator in (("ok", 1), ("meio", 0.5), ("dobro", 2)):
        if abs(1/Pr - 1/(fator*Pi)) < 1/T: return nome
    return "erro"
def run_curve(t, flux, rng, n_inj=20, fap_lim=0.01):
    """flux normalizado (~1). Retorna lista de dicts por injeção + 1 linha de controle (sem injeção)."""
    y0 = flux/np.nanmedian(flux) - 1
    Pc, fapc = periodo(t, y0)
    out = [{"inj": False, "P": np.nan, "A": 0.0, "Pr": Pc, "fap": fapc, "res": "fp" if fapc < fap_lim else "nd"}]
    for _ in range(n_inj):
        P = 10**rng.uniform(-1, np.log10(13)); A = 10**rng.uniform(np.log10(5e-4), np.log10(5e-2))
        y = y0 + A*np.sin(2*np.pi*t/P + rng.uniform(0, 2*np.pi))
        Pr, fap = periodo(t, y)
        out.append({"inj": True, "P": P, "A": A, "Pr": Pr, "fap": fap,
                    "res": classifica(Pr, P, t.max()-t.min()) if fap < fap_lim else "nd"})
    return out
