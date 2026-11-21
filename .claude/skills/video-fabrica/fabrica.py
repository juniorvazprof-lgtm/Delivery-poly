#!/usr/bin/env python3
"""Fábrica de vídeos verticais (Shorts/Reels/TikTok) a partir de uma narração.

Divisão de custo: o DeepSeek planeja e escreve código; scripts transcrevem, checam, renderizam e mixam;
o Claude só orquestra e olha UMA folha de prévia por vídeo.

Uso (JOB é uma pasta de trabalho, ex. trabalho/ep2):
  python3 fabrica.py transcrever JOB AUDIO     # Whisper local -> palavras.json, transcricao.txt, legendas
  python3 fabrica.py planejar    JOB [--tema T] [--estilo cyber|vox] [--max-novas 3]   # DeepSeek -> plano.json
  python3 fabrica.py cenas       JOB           # DeepSeek escreve as cenas 'novo:*' do plano
  python3 fabrica.py checar      JOB [--rodadas 2]   # quadros vazios/erros -> DeepSeek corrige sozinho
  python3 fabrica.py previa      JOB           # folha.png (12 quadros) para revisão humana/Claude
  python3 fabrica.py render      JOB [--fps 30] [--proc 3]   # MP4 final com áudio, efeitos e loudness
  python3 fabrica.py tudo        JOB AUDIO [--tema T] ...    # transcrever+planejar+cenas+checar+previa (para antes do render)
"""
import argparse, json, os, re, shutil, subprocess, sys, urllib.request, glob, math

AQUI = os.path.dirname(os.path.abspath(__file__))
MOTOR = os.path.join(AQUI, 'motor')
MODELO = os.path.join(AQUI, 'modelo', 'small')

def log(*a): print('[fabrica]', *a, file=sys.stderr, flush=True)
def sh(cmd, **kw): return subprocess.run(cmd, shell=isinstance(cmd, str), check=True, **kw)

# ---------------- DeepSeek ----------------
def deepseek(prompt, max_partes=6, temperatura=0.4):
    texto = ''
    for i in range(max_partes):
        msgs = [{"role": "user", "content": prompt}]
        if texto:
            msgs += [{"role": "assistant", "content": texto},
                     {"role": "user", "content": "A resposta foi cortada. Continue EXATAMENTE de onde parou, sem repetir e sem markdown. Últimos caracteres:\n" + texto[-1500:]}]
        body = json.dumps({"model": "deepseek-chat", "messages": msgs, "max_tokens": 8192, "temperature": temperatura}).encode()
        req = urllib.request.Request("https://api.deepseek.com/chat/completions", body,
                                     {"Authorization": "Bearer proxy-injected", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=600) as r: j = json.load(r)
        c = j["choices"][0]
        texto += "\n".join(l for l in c["message"]["content"].split("\n") if not l.strip().startswith("```"))
        if c["finish_reason"] != "length": break
    return texto

def extrair_json(txt):
    i, j = txt.find('{'), txt.rfind('}')
    return json.loads(txt[i:j + 1])

# ---------------- 1. transcrição ----------------
def garantir_modelo():
    if os.path.exists(os.path.join(MODELO, 'model.bin')): return
    log('baixando Whisper small (via npm, ~210 MB)...')
    tmp = os.path.join(AQUI, 'modelo', 'tmp'); os.makedirs(tmp, exist_ok=True)
    for i in range(4): sh(f'cd "{tmp}" && npm pack @skillninja/shortmovie-telop-model-p{i} --silent', stdout=subprocess.DEVNULL)
    for f in glob.glob(f'{tmp}/*.tgz'): sh(['tar', 'xzf', f, '-C', tmp]); os.rename(f'{tmp}/package', f'{tmp}/' + os.path.basename(f)[:-4])
    os.makedirs(MODELO, exist_ok=True)
    p0 = glob.glob(f'{tmp}/*p0*')[0]
    for n in ['config.json', 'tokenizer.json', 'vocabulary.json', 'preprocessor_config.json']: shutil.copy(f'{p0}/{n}', MODELO)
    with open(f'{MODELO}/model.bin', 'wb') as out:
        for i in range(4): out.write(open(glob.glob(f'{tmp}/*p{i}*/model.bin.part{i}')[0], 'rb').read())
    shutil.rmtree(tmp)

def agrupar_legendas(ws):
    """Agrupa palavras em legendas de 1–3 palavras (quebra em pontuação, pausa ou tamanho)."""
    grupos, atual = [], []
    junt = []  # junta pedaços que o Whisper separa ("cyber" + "-ataque")
    for w in ws:
        if junt and (w['w'].startswith('-') or junt[-1]['w'].endswith('-')):
            junt[-1] = dict(w=junt[-1]['w'] + w['w'], s=junt[-1]['s'], e=w['e'])
        else: junt.append(dict(w))
    ws = junt
    for i, w in enumerate(ws):
        atual.append(w)
        txt = ' '.join(x['w'] for x in atual)
        prox = ws[i + 1] if i + 1 < len(ws) else None
        quebra = (re.search(r'[.,!?;:]$', w['w']) or len(atual) >= 3 or len(txt) >= 16 or
                  (prox and prox['s'] - w['e'] > .25) or not prox)
        presa = re.fullmatch(r'(\d+|de|da|do|das|dos|na|no|nas|nos|a|o|as|os|e|um|uma|para|pra|com|em|que|por)', w['w'].lower()) and prox and len(atual) < 4
        if presa and not re.search(r'[.,!?;:]$', w['w']): quebra = False
        if quebra:
            grupos.append({'t': atual[0]['s'], 'fim': atual[-1]['e'], 'txt': re.sub(r'[.,!?;:]', '', txt).upper()}); atual = []
    leg = []
    for k, gr in enumerate(grupos):
        leg.append([round(gr['t'], 2), gr['txt']])
        nxt = grupos[k + 1]['t'] if k + 1 < len(grupos) else gr['fim'] + .6
        if nxt - gr['fim'] > .45: leg.append([round(gr['fim'] + .3, 2), ''])
    return leg

def transcrever(job, audio):
    os.makedirs(job, exist_ok=True)
    dst = os.path.join(job, 'audio' + os.path.splitext(audio)[1])
    if os.path.abspath(audio) != os.path.abspath(dst): shutil.copy(audio, dst)
    garantir_modelo()
    raw = os.path.join(job, 'audio.raw')
    sh(['ffmpeg', '-y', '-loglevel', 'error', '-i', dst, '-ac', '1', '-ar', '16000', '-f', 's16le', raw])
    import numpy as np
    from faster_whisper import WhisperModel
    a = np.frombuffer(open(raw, 'rb').read(), np.int16).astype(np.float32) / 32768
    m = WhisperModel(MODELO, device='cpu', compute_type='int8')
    segs, _ = m.transcribe(a, language='pt', word_timestamps=True, vad_filter=False)
    ws, linhas = [], []
    for s in segs:
        linhas.append(f'{s.start:6.2f}-{s.end:6.2f} {s.text.strip()}')
        ws += [dict(w=w.word.strip(), s=round(w.start, 2), e=round(w.end, 2)) for w in s.words]
    os.remove(raw)
    dur = len(a) / 16000
    json.dump(ws, open(os.path.join(job, 'palavras.json'), 'w'), ensure_ascii=False)
    open(os.path.join(job, 'transcricao.txt'), 'w').write('\n'.join(linhas))
    json.dump({'dur': round(dur, 2), 'audio': os.path.basename(dst), 'legendas': agrupar_legendas(ws)},
              open(os.path.join(job, 'base.json'), 'w'), ensure_ascii=False, indent=0)
    log(f'transcrição: {len(ws)} palavras, {dur:.1f}s'); print('\n'.join(linhas))

# ---------------- 2. planejamento (DeepSeek) ----------------
def catalogo():
    out = []
    for f in sorted(glob.glob(f'{MOTOR}/cenas/*.js')):
        cab = [l[2:].strip() for l in open(f).read().split('\n') if l.startswith('//')][:4]
        out.append(f"- {os.path.basename(f)[:-3]}: " + ' '.join(cab))
    return '\n'.join(out)

def planejar(job, tema='', estilo='cyber', max_novas=3):
    base = json.load(open(f'{job}/base.json')); trans = open(f'{job}/transcricao.txt').read()
    prompt = f"""Você é diretor de vídeos verticais virais (Shorts) em estilo "tech thriller" 3D {estilo}.
Monte o PLANO de cenas para esta narração (duração {base['dur']}s). Tema/observações: {tema or '(deduza da fala)'}.

TRANSCRIÇÃO (tempos em segundos):
{trans}

CENAS DA BIBLIOTECA (prontas, use o máximo possível; params entre chaves):
{catalogo()}

Regras:
- "cenas": lista CONTÍGUA cobrindo de 0 até {base['dur']}: cada item {{"mod": nome, "ini": s, "fim": s, "params": {{...}}}}. Cortes nos inícios de frases. Cada cena 2–8 s; gancho forte nos primeiros 3 s.
- Use a biblioteca com params diferentes para variar (ex.: relogio como separador de capítulos, mapa com países/pinos reais, celular com textos da fala, titulo para frases de impacto).
- No máximo {max_novas} cenas NOVAS, só quando a biblioteca não serve: "mod": "novo:<nome_curto>" e um briefing em "novas": {{"<nome_curto>": "descrição visual detalhada com os eventos e seus tempos ABSOLUTOS (palavras-chave da fala)"}}. Uma cena nova pode ser reutilizada em mais de um trecho.
- "destaques": {{"PALAVRA": "vm"|"am"}} — até 15 palavras-chave da fala (MAIÚSCULAS, como aparecem) para pintar de vermelho (perigo) ou amarelo (ênfase) na legenda.
- "sfx": lista de {{"t": s, "som": "boom"|"glitch"|"riser"}} nos impactos e cortes (boom em palavras de impacto, glitch nos cortes, riser 1 s antes de uma revelação). 10–25 itens.
- "musica": "bgm-decisions" (tensão) ou "bgm-cipher" (tecnologia).
Responda SOMENTE o JSON: {{"cenas":[...], "novas":{{...}}, "destaques":{{...}}, "sfx":[...], "musica":"..."}}"""
    plano = extrair_json(deepseek(prompt, temperatura=.5))
    # legendas determinísticas + destaques do DeepSeek
    dest = {k.upper(): v for k, v in plano.get('destaques', {}).items()}
    leg = []
    for t, txt in base['legendas']:
        for w, cls in dest.items():
            txt = re.sub(rf'\b{re.escape(w)}\b', f'<{cls}>{w}</{cls}>', txt) if w in txt else txt
        leg.append([t, txt])
    plano.update({'dur': base['dur'], 'audio': base['audio'], 'legendas': leg})
    # saneamento: contiguidade e limites
    cs = sorted(plano['cenas'], key=lambda c: c['ini']); cs[0]['ini'] = 0
    for a, b in zip(cs, cs[1:]): a['fim'] = b['ini']
    cs[-1]['fim'] = base['dur'] + .1; plano['cenas'] = cs
    os.makedirs(f'{job}/briefs', exist_ok=True)
    for nome, brief in plano.get('novas', {}).items(): open(f'{job}/briefs/{nome}.txt', 'w').write(brief)
    json.dump(plano, open(f'{job}/plano.json', 'w'), ensure_ascii=False, indent=1)
    for c in cs: log(f"{c['ini']:6.2f}-{c['fim']:6.2f} {c['mod']} {json.dumps(c.get('params', {}), ensure_ascii=False)[:90]}")

# ---------------- 3. cenas novas (DeepSeek) ----------------
def contrato(): return open(f'{MOTOR}/contrato-cena.md').read()
def checar_sintaxe(f):
    r = subprocess.run(['node', '--check', '--input-type=module'], stdin=open(f), capture_output=True, text=True)
    proib = re.findall(r'Math\.random|Date\.now|performance\.now|requestAnimationFrame|^import ', open(f).read(), re.M)
    return (r.stderr.strip().split('\n')[0] if r.returncode else '') + (f' Proibido: {proib}' if proib else '')

def escrever_cena(job, nome, extra=''):
    brief = open(f'{job}/briefs/{nome}.txt').read()
    exemplo = open(f'{MOTOR}/cenas/celular.js').read()
    atual = open(f'{job}/cenas/{nome}.js').read() if extra and os.path.exists(f'{job}/cenas/{nome}.js') else ''
    prompt = contrato() + f"\n\n## Exemplo de cena da biblioteca (estilo e API)\n{exemplo}\n\n## Sua cena: {nome}\n{brief}\n"
    if atual: prompt += f"\n## Código atual (seu)\n{atual}\n\n## Problemas detectados automaticamente\n{extra}\nCorrija e responda com o arquivo COMPLETO."
    os.makedirs(f'{job}/cenas', exist_ok=True)
    for tent in range(3):
        open(f'{job}/cenas/{nome}.js', 'w').write(deepseek(prompt))
        err = checar_sintaxe(f'{job}/cenas/{nome}.js')
        if not err: return
        log(f'{nome}: erro de sintaxe, pedindo correção: {err[:120]}')
        prompt += f"\n\nSeu código anterior tinha este erro: {err}. Responda o arquivo COMPLETO corrigido."
    log(f'AVISO: {nome} ainda com erro: {err}')

def cenas(job):
    plano = json.load(open(f'{job}/plano.json'))
    nomes = sorted({c['mod'][5:] for c in plano['cenas'] if c['mod'].startswith('novo:')})
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(6) as ex: list(ex.map(lambda n: escrever_cena(job, n), nomes))
    log('cenas novas:', nomes)

# ---------------- captura (node + playwright) ----------------
def capturar(job, saida, quadros=None, fps=30, ini=0, fim=None, escala=1.5, diag=None):
    cmd = ['node', f'{MOTOR}/captura.js', os.path.abspath(job), os.path.abspath(saida), str(fps), str(escala)]
    env = dict(os.environ, QUADROS=','.join(map(str, quadros)) if quadros else '', INI=str(ini), FIM=str(fim or ''), DIAG=','.join(map(str, diag or [])))
    r = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if r.returncode: log(r.stderr[-800:])
    return r.stdout

def vazio(png):
    from PIL import Image
    im = Image.open(png).convert('RGB'); w, h = im.size
    reg = im.crop((0, int(h * .08), w, int(h * .56))).resize((180, 240))
    px = list(reg.get_flattened_data() if hasattr(reg, 'get_flattened_data') else reg.getdata()); claro = sum(1 for p in px if max(p) > 70)
    return claro / len(px)

# ---------------- 4. checagem automática + correção pelo DeepSeek ----------------
def checar(job, rodadas=2):
    plano = json.load(open(f'{job}/plano.json'))
    for rod in range(rodadas + 1):
        ts = []
        for c in plano['cenas']:
            d = c['fim'] - c['ini']
            ts += [round(c['ini'] + d * .35, 2), round(c['ini'] + d * .8, 2)]
        pasta = f'{job}/check'; shutil.rmtree(pasta, ignore_errors=True)
        out = capturar(job, pasta, quadros=[int(t * 30) for t in ts], fps=30, escala=.5, diag=ts)
        erros = json.loads(re.search(r'ERROS (.*)', out).group(1)) if 'ERROS' in out else []
        diags = dict(re.findall(r'DIAG ([\d.]+)\n(.*?)\nFIMDIAG', out, re.S))
        problemas = {}
        for t in ts:
            f = f'{pasta}/f{int(t * 30):05d}.jpg'; frac = vazio(f) if os.path.exists(f) else 0
            c = next(c for c in plano['cenas'] if c['ini'] <= t < c['fim'])
            if frac < .015:
                problemas.setdefault(c['mod'], []).append(f"t={t}: tela quase VAZIA na metade de cima ({frac:.1%} de pixels acesos). Objetos e posições na tela:\n{diags.get(str(t), '?')}")
        for e in erros:
            m = re.match(r'cena (\S+): (.*)', e)
            if m: problemas.setdefault(m.group(1), []).append('Erro de execução ao carregar: ' + m.group(2))
        log(f'rodada {rod}: problemas em {list(problemas) or "nenhuma cena"}')
        novos = {k: v for k, v in problemas.items() if k.startswith('novo:')}
        for k, v in problemas.items():
            if not k.startswith('novo:'): log(f'AVISO (biblioteca) {k}: ' + ' | '.join(x.split('\n')[0] for x in v))
        if not novos or rod == rodadas: break
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(6) as ex:
            list(ex.map(lambda kv: escrever_cena(job, kv[0][5:], '\n\n'.join(kv[1]) +
                 '\nLembre: o assunto deve aparecer na metade de cima da tela (y entre 10% e 55%), dentro de x 5–95%, na frente da câmera.'), novos.items()))
    json.dump(problemas, open(f'{job}/problemas.json', 'w'), ensure_ascii=False, indent=1)

# ---------------- 5. prévia ----------------
def previa(job, n=12):
    from PIL import Image
    plano = json.load(open(f'{job}/plano.json')); dur = plano['dur']
    ts = [round(dur * (i + .5) / n, 2) for i in range(n)]
    pasta = f'{job}/previa'; shutil.rmtree(pasta, ignore_errors=True)
    capturar(job, pasta, quadros=[int(t * 30) for t in ts], fps=30, escala=.5)
    ims = [Image.open(f).resize((216, 384)) for f in sorted(glob.glob(f'{pasta}/*.jpg'))]
    folha = Image.new('RGB', (216 * 6, 384 * math.ceil(len(ims) / 6)))
    for k, im in enumerate(ims): folha.paste(im, ((k % 6) * 216, (k // 6) * 384))
    folha.save(f'{job}/folha.png'); log(f'folha: {job}/folha.png  tempos: {ts}')

# ---------------- 6. render final ----------------
def render(job, fps=30, proc=3):
    plano = json.load(open(f'{job}/plano.json')); dur = plano['dur']; total = int(dur * fps) + 1
    pasta = f'{job}/quadros'; shutil.rmtree(pasta, ignore_errors=True); os.makedirs(pasta)
    from concurrent.futures import ThreadPoolExecutor
    passo = math.ceil(total / proc)
    with ThreadPoolExecutor(proc) as ex:
        list(ex.map(lambda i: capturar(job, pasta, fps=fps, ini=i * passo, fim=min(total, (i + 1) * passo)), range(proc)))
    sons = f'{MOTOR}/sons'; arq = {'boom': 'boom.wav', 'glitch': 'glitch.ogg', 'riser': 'riser.wav'}
    entradas = ['-framerate', str(fps), '-i', f'{pasta}/f%05d.jpg', '-i', f"{job}/{plano['audio']}",
                '-i', f"{sons}/{plano.get('musica', 'bgm-decisions')}.mp3"]
    filtros, rot = ['[1]volume=1.0[V]', f"[2]aloop=loop=-1:size=2e9,atrim=0:{dur},volume=0.15,afade=t=out:st={max(0, dur - 1.5)}:d=1.5[M]"], ['[V]', '[M]']
    for i, s in enumerate(plano.get('sfx', [])):
        if s.get('som') not in arq: continue
        entradas += ['-i', f"{sons}/{arq[s['som']]}"]; n = len(entradas) // 2 - 1; ms = int(max(0, s['t'] - (1 if s['som'] == 'riser' else 0)) * 1000)
        filtros.append(f"[{n}]adelay={ms}|{ms},volume={.7 if s['som'] == 'boom' else .9}[S{i}]"); rot.append(f'[S{i}]')
    filtros.append(f"{''.join(rot)}amix={len(rot)}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=0:{dur}[au]")
    final = f'{job}/final.mp4'
    sh(['ffmpeg', '-y', '-loglevel', 'error', *entradas, '-filter_complex', ';'.join(filtros), '-map', '0', '-map', '[au]',
        '-c:v', 'libx264', '-preset', 'medium', '-b:v', '8M', '-maxrate', '10M', '-bufsize', '16M', '-pix_fmt', 'yuv420p', '-r', str(fps),
        '-c:a', 'aac', '-b:a', '192k', '-t', str(dur), '-movflags', '+faststart', final])
    shutil.rmtree(pasta)
    log(f'pronto: {final} ({os.path.getsize(final) / 1e6:.1f} MB)')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('etapa'); ap.add_argument('job'); ap.add_argument('audio', nargs='?')
    ap.add_argument('--tema', default=''); ap.add_argument('--estilo', default='cyber'); ap.add_argument('--max-novas', type=int, default=3)
    ap.add_argument('--rodadas', type=int, default=2); ap.add_argument('--fps', type=int, default=30); ap.add_argument('--proc', type=int, default=3)
    a = ap.parse_args(); e = a.etapa
    if e in ('transcrever', 'tudo'): transcrever(a.job, a.audio)
    if e in ('planejar', 'tudo'): planejar(a.job, a.tema, a.estilo, a.max_novas)
    if e in ('cenas', 'tudo'): cenas(a.job)
    if e in ('checar', 'tudo'): checar(a.job, a.rodadas)
    if e in ('previa', 'tudo'): previa(a.job)
    if e == 'render': render(a.job, a.fps, a.proc)
