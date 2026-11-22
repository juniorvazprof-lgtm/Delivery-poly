import json, subprocess, sys
D = 'ed'; FPS = 30; XF = 0.3
L = json.load(open('legendas.json'))
# trechos (s, e, zoom inicial, zoom final, foco x, foco y)
SEG = [(0.00, 3.15, 1.16, 1.26, .45, .12), (3.62, 6.80, 1.00, 1.05, .5, .4), (8.10, 10.00, 1.14, 1.20, .45, .15),
       (11.15, 14.45, 1.00, 1.06, .5, .4), (14.45, 18.25, 1.12, 1.19, .45, .15), (18.95, 22.00, 1.00, 1.06, .5, .35),
       (22.65, 26.28, 1.00, 1.16, .45, .2)]
CRUZ_ORIG = 25.64; FIM_EXTRA = 3.2
# início de cada trecho na linha do tempo nova (xfade sobrepõe XF)
ini = []; t = 0
for i, (s, e, *_) in enumerate(SEG):
    ini.append(t); t += (e - s) - (XF if i < len(SEG) - 1 else 0)
DUR_FALA = t
def novo(to):
    for i, (s, e, *_) in enumerate(SEG):
        if s <= to < e: return ini[i] + (to - s)
    return None
FGW, FGH, FGY = 1080, 690, 500
f = []
f.append(f"[0:v]crop=360:230:0:152,"
         f"scale={FGW}:{FGH}:flags=lanczos,eq=saturation=0.82:contrast=1.06:brightness=0.01,colorbalance=rs=0.05:gs=0.01:bs=-0.06,split={len(SEG)}" +
         ''.join(f'[f{i}]' for i in range(len(SEG))))
f.append(f"[0:v]crop=360:230:0:152,scale=-2:1920,crop=1080:1920,boxblur=40:2,eq=brightness=-0.2:saturation=0.55,vignette=PI/3.2,split={len(SEG)}" +
         ''.join(f'[g{i}]' for i in range(len(SEG))))
f.append(f"[0:a]asplit={len(SEG)}" + ''.join(f'[a{i}]' for i in range(len(SEG))))
for i, (s, e, z0, z1, fx, fy) in enumerate(SEG):
    n = int(round((e - s) * FPS))
    f.append(f"[f{i}]trim={s}:{e},setpts=PTS-STARTPTS,fps={FPS},zoompan=z='{z0}+({z1}-{z0})*on/{n}':x='(iw-iw/zoom)*{fx}':y='(ih-ih/zoom)*{fy}':d=1:s={FGW}x{FGH}:fps={FPS}[z{i}]")
    f.append(f"[g{i}]trim={s}:{e},setpts=PTS-STARTPTS,fps={FPS}[b{i}]")
    f.append(f"[b{i}][z{i}]overlay=0:{FGY},format=yuv420p[c{i}]")
    f.append(f"[a{i}]atrim={s}:{e},asetpts=PTS-STARTPTS[d{i}]")
v, a = 'c0', 'd0'
for i in range(1, len(SEG)):
    off = ini[i]
    f.append(f"[{v}][c{i}]xfade=transition=fade:duration={XF}:offset={off:.3f}[x{i}]"); v = f'x{i}'
    f.append(f"[{a}][d{i}]acrossfade=d={XF}[y{i}]"); a = f'y{i}'
# final: escurece na "cruz" e estende com o cartão
tc = novo(CRUZ_ORIG); TOT = DUR_FALA + FIM_EXTRA
f.append(f"[{v}]tpad=stop_mode=clone:stop_duration={FIM_EXTRA},fade=t=out:st={tc + .15:.2f}:d=0.7:color=black[vf]")
f.append(f"[{a}]apad=whole_dur={TOT:.2f}[af]")
entradas = ['-i', 'orig.mp4']
def png(p): entradas.extend(['-loop', '1', '-t', f'{TOT:.2f}', '-i', p]); return len([x for x in entradas if x == '-i']) - 1
cur = 'vf'; k = 0
def sobre(img, x, y, t0, t1, fade_in=0.0, fade_out=0.0):
    global cur, k
    idx = png(img); src = f'[{idx}:v]format=rgba'
    if fade_in: src += f',fade=t=in:st={t0:.2f}:d={fade_in}:alpha=1'
    if fade_out: src += f',fade=t=out:st={t1 - fade_out:.2f}:d={fade_out}:alpha=1'
    f.append(f"{src}[p{k}]"); f.append(f"[{cur}][p{k}]overlay={x}:{y}:enable='between(t,{t0:.2f},{t1:.2f})'[o{k}]"); cur = f'o{k}'; k += 1
# gancho: palavras entram uma a uma (0–1,4 s) e somem em 3,0 s
tw = [0.0, 0.22, 0.45, 0.7, 1.0, 1.25]
for n in range(6):
    sobre(f'{D}/hook{n + 1}.png', 0, 150, tw[n], tw[n + 1] if n < 5 else 3.0, fade_out=0 if n < 5 else 0.35)
# legendas (re-tempadas), sem a última palavra "cruz" ficar sobre o cartão
for i, g in enumerate(L):
    t0 = novo(g['ini']); t1 = novo(min(L[i + 1]['ini'] if i + 1 < len(L) else 26.2, g['fim'] + 1.0) - 0.01)
    if t0 is None: continue
    if t1 is None or t1 < t0: t1 = t0 + (g['fim'] - g['ini']) + .4
    t1 = min(t1, tc + .8)
    if t0 < 3.0: t0 = max(t0, 0)  # convive com o gancho (gancho no alto, legenda embaixo)
    sobre(f'{D}/leg/{i}.png', 0, 1300, t0, t1)
# selo discreto durante a fala
sobre(f'{D}/selo.png', '(W-w)/2', 1760, 0, tc + .15, fade_out=.4)
# cartão final: cruz, frase, logo
sobre(f'{D}/cruz.png', '(W-w)/2', 520, tc + .45, TOT, fade_in=.8)
sobre(f'{D}/frase.png', 0, 1020, tc + 1.05, TOT, fade_in=.7)
sobre(f'{D}/logo.png', '(W-w)/2', 1300, tc + 2.0, TOT, fade_in=.6)
# som grave suave no gancho (1,2 s)
entradas += ['-i', '/home/user/Delivery-poly/.claude/skills/video-fabrica/motor/sons/boom.wav']; ib = entradas.count('-i') - 1
f.append(f"[{ib}:a]volume=0.35,lowpass=f=180,adelay=1200|1200[bm]")
f.append("[af][bm]amix=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.84:level=false,aresample=48000[aout]")
out = sys.argv[1]
cmd = ['ffmpeg', '-y', '-loglevel', 'error', *entradas, '-filter_complex', ';'.join(f), '-map', f'[{cur}]', '-map', '[aout]',
       '-t', f'{TOT:.2f}', '-r', str(FPS), '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]
subprocess.run(cmd, check=True)
print(f'ok {out} dur={TOT:.2f} cruz={tc:.2f}')
