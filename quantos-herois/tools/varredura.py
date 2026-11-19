#!/usr/bin/env python3
"""Varredura de parâmetros da economia: roda tools/runs.mjs para cada configuração e resume os 4 robôs.
Uso: python3 tools/varredura.py [runs]   (rodar de dentro de quantos-herois/)"""
import json, subprocess, sys, tempfile, os

RUNS = sys.argv[1] if len(sys.argv) > 1 else '120'
CONFIGS = [
    ('atual (generosa)',          []),
    ('A: abate 0,6 · bônus 8+2r',  ['--multAbate', '0.6', '--bonusBase', '8', '--bonusPorRodada', '2']),
    ('B: A + inflação 20%',        ['--multAbate', '0.6', '--bonusBase', '8', '--bonusPorRodada', '2', '--inflacao', '0.2']),
    ('C: abate 0,5 · bônus 6+2r · infl 20%', ['--multAbate', '0.5', '--bonusBase', '6', '--bonusPorRodada', '2', '--inflacao', '0.2']),
    ('D: abate 0,5 · bônus 6+2r · infl 25%', ['--multAbate', '0.5', '--bonusBase', '6', '--bonusPorRodada', '2', '--inflacao', '0.25']),
    ('E: abate 0,4 · bônus 6+2r · infl 20%', ['--multAbate', '0.4', '--bonusBase', '6', '--bonusPorRodada', '2', '--inflacao', '0.2']),
]
if os.environ.get('CONFIGS'):
    CONFIGS = json.loads(os.environ['CONFIGS'])

print('| Configuração | Robô | Completa | Para em (mais comum) | Ouro final | Ouro ganho | Relíquias | Estrelas | Aperto (rodada) |')
print('|---|---|--:|---|--:|--:|--:|--:|--:|')
for nome, extra in CONFIGS:
    with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
        out = f.name
    subprocess.run(['node', 'tools/runs.mjs', '--runs', RUNS, '--json', out, *extra], check=True, stdout=subprocess.DEVNULL)
    j = json.load(open(out)); os.unlink(out)
    for robo in ['cauteloso', 'esperto', 'arriscado', 'exagerado']:
        r = j[robo]
        dist = {k: v for k, v in r['dist'].items() if v and str(k).lower() not in ('completa', 'completas')}
        para = max(dist, key=dist.get) if dist else '—'
        ap = r.get('apertoMedia')
        print(f"| {nome} | {robo} | {r['pctCompletas']:.0f}% | {para} | {r['ouroFinalMedio']:.0f} | {r['ouroTotalMedio']:.0f} | {r['reliquiasMedia']:.1f} | {r['estrelasMedia']:.2f} | {ap if ap is None else round(ap, 1)} |")
