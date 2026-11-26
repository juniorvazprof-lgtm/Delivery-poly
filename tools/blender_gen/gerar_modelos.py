#!/usr/bin/env python3
"""Orquestrador: o DeepSeek escreve scripts do Blender e o Blender gera os modelos GLB.

Para cada modelo de specs.py:
  1. pede ao DeepSeek um script bpy usando os helpers do harness_header.py;
  2. roda `blender -b` com cabeçalho + script + rodapé (exporta GLB e renderiza prévia PNG);
  3. valida: erro de Python, nº de triângulos, tamanho e nomes obrigatórios;
  4. se falhar, devolve o erro ao DeepSeek e tenta de novo (até 4 tentativas).
O código aprovado fica em scripts/<nome>.py (pode ser revisado à mão) e
`--rebuild` regera os GLB a partir desses scripts sem chamar a API.

Uso:
  DEEPSEEK_API_KEY=... python3 tools/blender_gen/gerar_modelos.py [nome ...] [--feedback "texto"]
  python3 tools/blender_gen/gerar_modelos.py --rebuild [nome ...]
Saída: capivara-explora/models/<nome>.glb, previews e scripts em tools/blender_gen/out/.
"""
import argparse, concurrent.futures as cf, json, os, re, subprocess, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT_MODELS = ROOT / 'capivara-explora' / 'models'
WORK = HERE / 'out'
SCRIPTS = HERE / 'scripts'
sys.path.insert(0, str(HERE))
from specs import SPECS, STYLE  # noqa: E402

API = 'https://api.deepseek.com/chat/completions'
MODEL = os.environ.get('DEEPSEEK_MODEL', 'deepseek-flash')
KEY = os.environ.get('DEEPSEEK_API_KEY', 'proxy')

SYSTEM = """Você é um artista técnico de Blender 4.0 que escreve scripts Python (bpy) para gerar modelos 3D low poly de um jogo mobile.
O script roda DEPOIS de um cabeçalho que já limpou a cena e definiu estes helpers (use-os; não redefina):
  prim(kind, name, loc=(x,y,z), scale=(sx,sy,sz), rot=(rx,ry,rz em radianos), color='#rrggbb', parent=None, **kw) -> objeto
     kind: 'cube' (kw: size, padrão 2 = cubo de lado 2), 'sphere' (kw: radius, segments, ring_count),
           'ico' (kw: radius, subdivisions 1-2), 'cylinder' (kw: radius, depth, vertices),
           'cone' (kw: radius1, radius2, depth, vertices), 'torus' (kw: major_radius, minor_radius, major_segments, minor_segments)
     Com parent, loc/rot/scale são LOCAIS ao pai (os empties não têm rotação nem escala).
  empty(name, loc=(x,y,z), parent=None) -> empty (para pivôs de animação)
  mat(hex) -> material; math, bpy e Vector já estão importados.
Regras: Z para cima; a frente do modelo aponta para -Y; a base fica em z=0 centrada em x=y=0; unidades em metros.
Não exporte, não renderize, não limpe a cena, não crie câmeras ou luzes. Não use bmesh nem modificadores.
Use poucas faces (segments/vertices 5-10, subdivisions 1). Nomeie todos os objetos de forma clara.
Responda SOMENTE com um bloco ```python contendo o código."""


def deepseek(messages):
    body = json.dumps({'model': MODEL, 'messages': messages, 'max_tokens': 12000}).encode()
    req = urllib.request.Request(API, body, {'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)['choices'][0]['message']['content']


def extract_code(txt):
    m = re.search(r'```(?:python)?\s*\n(.*?)```', txt, re.S)
    return (m.group(1) if m else txt).strip()


def run_blender(name, code):
    WORK.mkdir(exist_ok=True)
    script = WORK / f'{name}.py'
    script.write_text((HERE / 'harness_header.py').read_text() + '\n' + code + '\n\n' + (HERE / 'harness_footer.py').read_text())
    glb, png = OUT_MODELS / f'{name}.glb', WORK / f'{name}.png'
    p = subprocess.run(['blender', '-b', '--factory-startup', '-P', str(script), '--', str(glb), str(png)],
                       capture_output=True, text=True, timeout=300)
    log = p.stdout + p.stderr
    stats = next((json.loads(l[6:]) for l in log.splitlines() if l.startswith('STATS ')), None)
    err = None
    if 'Traceback' in log or stats is None:
        tb = log[log.find('Traceback'):] if 'Traceback' in log else log[-2500:]
        err = 'O script falhou no Blender:\n' + tb[:2500]
    return stats, err, glb, png


def validate(name, spec, stats):
    probs = []
    if stats['tris'] > spec['tris']:
        probs.append(f"tem {stats['tris']} triângulos; o limite é {spec['tris']}. Reduza segments/vertices e o número de peças.")
    size = [hi - lo for lo, hi in zip(stats['min'], stats['max'])]
    for axis, got, want in zip('XYZ', size, spec['dims']):
        if not (want * 0.55 <= got <= want * 1.6):
            probs.append(f'tamanho no eixo {axis} é {got:.2f} m, mas deveria ficar perto de {want} m.')
    if stats['min'][2] < -0.1 or stats['min'][2] > 0.15:
        probs.append(f"a base está em z={stats['min'][2]:.2f}; deveria encostar em z=0.")
    for req in re.findall(r"'([a-z_]+)'", spec['desc']):
        if req.startswith(('leg_', 'head_pivot', 'eye_', 'wing_', 'body')) and req not in stats['names']:
            probs.append(f"falta o objeto chamado exatamente '{req}'.")
    return probs


def generate(name, feedback=None, tries=4):
    spec = SPECS[name]
    user = (f"Modelo '{name}': {spec['desc']}\n{STYLE}\nTamanho aproximado (X, Y, Z): {spec['dims']} m. "
            f"Máximo de {spec['tris']} triângulos.")
    prev = SCRIPTS / f'{name}.py'
    if feedback and prev.exists():
        old = prev.read_text()
        user += f"\n\nVersão anterior do código:\n```python\n{old.strip()}\n```\nAjuste pedido pelo diretor de arte: {feedback}"
    msgs = [{'role': 'system', 'content': SYSTEM}, {'role': 'user', 'content': user}]
    for t in range(1, tries + 1):
        reply = deepseek(msgs)
        code = extract_code(reply)
        stats, err, glb, png = run_blender(name, code)
        probs = [err] if err else validate(name, spec, stats)
        if not probs:
            (SCRIPTS / f'{name}.py').write_text(code + '\n')
            return f'[ok] {name}: {stats["tris"]} tris, tentativa {t}'
        print(f'[..] {name} tentativa {t}: ' + ' | '.join(p.splitlines()[0] if p else '' for p in probs), flush=True)
        msgs += [{'role': 'assistant', 'content': f'```python\n{code}\n```'},
                 {'role': 'user', 'content': 'Corrija estes problemas e devolva o script completo:\n- ' + '\n- '.join(probs)}]
    return f'[!!] {name}: falhou após {tries} tentativas ({probs[0][:200]})'


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('nomes', nargs='*')
    ap.add_argument('--feedback')
    ap.add_argument('-j', type=int, default=4)
    ap.add_argument('--rebuild', action='store_true')
    a = ap.parse_args()
    OUT_MODELS.mkdir(parents=True, exist_ok=True)
    nomes = a.nomes or list(SPECS)
    if a.rebuild:
        for n in nomes:
            stats, err, _, _ = run_blender(n, (SCRIPTS / f'{n}.py').read_text())
            print(n, err or validate(n, SPECS[n], stats) or f'ok ({stats["tris"]} tris)', flush=True)
        sys.exit()
    with cf.ThreadPoolExecutor(a.j) as ex:
        for r in ex.map(lambda n: generate(n, a.feedback), nomes):
            print(r, flush=True)
