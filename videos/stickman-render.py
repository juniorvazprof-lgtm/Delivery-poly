# Trecho de 10s: "Como sobreviver a um super ciberataque" — gancho + passo 1.
import math, os, random
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 720, 1280, 30, 10.0
FONTES = '/tmp/claude-0/-home-user-Delivery-poly/7d23cf2e-3bbb-5f9b-9ad6-aa634ad9e757/scratchpad/skills-video/stickman-video-director/skills/directing-stickman-videos/assets/fonts/'
F_BIG = ImageFont.truetype(FONTES + 'ArchivoBlack.ttf', 66)
F_MED = ImageFont.truetype(FONTES + 'ArchivoBlack.ttf', 46)
F_NUM = ImageFont.truetype(FONTES + 'ArchivoBlack.ttf', 380)
F_HAND = ImageFont.truetype(FONTES + 'Caveat.ttf', 44)
OUT = os.path.dirname(__file__) + '/frames'
os.makedirs(OUT, exist_ok=True)

TINTA, PAPEL, VERM, VERDE, AZUL = (20, 20, 24), (248, 245, 238), (225, 40, 50), (40, 170, 90), (50, 110, 230)
LW = 11

def lerp(a, b, t): return a + (b - a) * t
def ease(t): t = max(0, min(1, t)); return t * t * (3 - 2 * t)
def seg(t, a, b): return ease((t - a) / (b - a))

# Pose: ângulos (graus, 0 = para baixo) de braço sup/inf e perna sup/inf, esquerda/direita
POSES = {
    'parado':  dict(ae=(15, 10), ad=(-15, -10), pe=(8, 0), pd=(-8, 0), cab=0),
    'celular': dict(ae=(20, 120), ad=(-20, -120), pe=(8, 0), pd=(-8, 0), cab=8),
    'susto':   dict(ae=(150, 170), ad=(-150, -170), pe=(20, 5), pd=(-20, -5), cab=-10),
    'corre1':  dict(ae=(-50, -100), ad=(60, 20), pe=(-40, 30), pd=(45, 70), cab=10),
    'corre2':  dict(ae=(60, 20), ad=(-50, -100), pe=(45, 70), pd=(-40, 30), cab=10),
    'puxa':    dict(ae=(-70, -90), ad=(-60, -95), pe=(-25, 5), pd=(30, 10), cab=-5),
    'vitoria': dict(ae=(160, 175), ad=(-120, -60), pe=(10, 0), pd=(-10, 0), cab=-8),
}
def mix(p, q, t):
    return {k: (tuple(lerp(a, b, t) for a, b in zip(p[k], q[k])) if isinstance(p[k], tuple) else lerp(p[k], q[k], t)) for k in p}

def membro(d, x, y, ang, comp, cor=TINTA):
    a1, a2 = math.radians(ang[0]), math.radians(ang[1])
    x1, y1 = x + math.sin(a1) * comp, y + math.cos(a1) * comp
    x2, y2 = x1 + math.sin(a2) * comp, y1 + math.cos(a2) * comp
    d.line([(x, y), (x1, y1), (x2, y2)], fill=cor, width=LW, joint='curve')
    for px, py in ((x1, y1), (x2, y2)): d.ellipse([px - LW/2, py - LW/2, px + LW/2, py + LW/2], fill=cor)
    return x2, y2

def boneco(d, x, y, pose, esc=1.0, rosto='normal', dir=1):
    c = 70 * esc  # comprimento do segmento
    quadril = (x, y)
    pesc = (x + pose['cab'] * dir * 0.6, y - 2.1 * c)
    d.line([quadril, pesc], fill=TINTA, width=LW)
    hx, hy, r = pesc[0] + pose['cab'] * dir * 0.4, pesc[1] - 0.75 * c, 0.75 * c
    d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=PAPEL, outline=TINTA, width=LW)
    # rosto
    if rosto == 'susto':
        for ox in (-0.3, 0.3): d.ellipse([hx + ox*r - 9, hy - 14, hx + ox*r + 9, hy + 4], fill=TINTA)
        d.ellipse([hx - 12, hy + 16, hx + 12, hy + 40], outline=TINTA, width=6)
    elif rosto == 'feliz':
        for ox in (-0.3, 0.3): d.arc([hx + ox*r - 11, hy - 14, hx + ox*r + 11, hy + 4], 200, 340, fill=TINTA, width=6)
        d.arc([hx - 26, hy, hx + 26, hy + 36], 20, 160, fill=TINTA, width=6)
    else:
        for ox in (-0.3, 0.3): d.ellipse([hx + ox*r - 6 + dir*6, hy - 10, hx + ox*r + 6 + dir*6, hy + 2], fill=TINTA)
        d.line([hx - 14 + dir*6, hy + 24, hx + 14 + dir*6, hy + 24], fill=TINTA, width=6)
    om = (lerp(quadril[0], pesc[0], 0.85), lerp(quadril[1], pesc[1], 0.85))
    s = lambda a: (a[0] * dir, a[1] * dir)
    mao_e = membro(d, *om, s(pose['ae']), c * 0.95)
    mao_d = membro(d, *om, s(pose['ad']), c * 0.95)
    membro(d, *quadril, s(pose['pe']), c * 1.1)
    membro(d, *quadril, s(pose['pd']), c * 1.1)
    return mao_e, mao_d, (hx, hy, r)

def texto(d, xy, s, fonte, cor=TINTA, contorno=PAPEL, borda=8, ancora='mm'):
    d.text(xy, s, font=fonte, fill=cor, anchor=ancora, stroke_width=borda, stroke_fill=contorno)

def celular(d, x, y, esc, hack, t):
    w, h = 70 * esc, 120 * esc
    d.rounded_rectangle([x - w/2, y - h/2, x + w/2, y + h/2], 12, fill=TINTA)
    cor = VERM if hack and int(t * 8) % 2 == 0 else ((60, 0, 0) if hack else (120, 190, 255))
    d.rounded_rectangle([x - w/2 + 7, y - h/2 + 12, x + w/2 - 7, y + h/2 - 12], 6, fill=cor)
    if hack:  # caveira simples
        cx, cy = x, y - 6
        d.ellipse([cx - 18*esc/1, cy - 20, cx + 18, cy + 12], fill=PAPEL)
        d.rectangle([cx - 10, cy + 8, cx + 10, cy + 20], fill=PAPEL)
        for ox in (-8, 8): d.ellipse([cx + ox - 5, cy - 8, cx + ox + 5, cy + 2], fill=TINTA)

def roteador(d, x, y, desligado, t):
    d.rounded_rectangle([x - 90, y - 35, x + 90, y + 35], 14, fill=PAPEL, outline=TINTA, width=LW)
    for ax in (-55, 55): d.line([x + ax, y - 35, x + ax * 1.2, y - 110], fill=TINTA, width=LW)
    for i in range(4):
        on = (not desligado) and int(t * 6 + i) % 3
        cx = x - 45 + i * 30
        d.ellipse([cx - 8, y - 8, cx + 8, y + 8], fill=(VERDE if on else (190, 190, 190)), outline=TINTA, width=3)
    # ondas wi-fi
    for k in range(3):
        r = 40 + k * 32
        cor = (170, 170, 170) if desligado else AZUL
        d.arc([x - r, y - 150 - r, x + r, y - 150 + r], 225, 315, fill=cor, width=9)
    d.ellipse([x - 9, y - 159, x + 9, y - 141], fill=(170, 170, 170) if desligado else AZUL)
    if desligado:
        d.line([x - 85, y - 230, x + 85, y - 90], fill=VERM, width=14)

def faisca(d, x, y, t, seed):
    rnd = random.Random(seed)
    for _ in range(9):
        a, l = rnd.uniform(0, 6.28), rnd.uniform(20, 60) * (1 - t)
        d.line([x, y, x + math.cos(a) * l, y + math.sin(a) * l], fill=(255, 190, 30), width=6)

def quadro(i):
    t = i / FPS
    img = Image.new('RGB', (W, H), PAPEL)
    d = ImageDraw.Draw(img)
    # chão desenhado à mão
    d.line([(40, 1010), (W - 40, 1012)], fill=TINTA, width=6)
    shake = 0
    if t < 3.2:
        # ---- GANCHO: celular hackeado
        hack = t > 0.6
        if hack and t < 1.1 and int(t * 20) % 2 == 0:
            d.rectangle([0, 0, W, H], fill=(255, 225, 225))
        pose = mix(POSES['celular'], POSES['susto'], seg(t, 1.2, 1.5)) if t > 1.2 else POSES['celular']
        shake = (math.sin(t * 70) * 8) if 0.6 < t < 2.0 else 0
        bx = W / 2 + shake
        mao_e, mao_d, _ = boneco(d, bx, 856, pose, rosto='susto' if t > 1.2 else 'normal')
        if t < 1.3:
            celular(d, bx + 95, 700, 1.2, hack, t)
        else:  # celular voa da mão
            k = seg(t, 1.3, 2.0)
            cx, cy = lerp(bx + 95, W - 120, k), lerp(700, 420, k) - math.sin(k * 3.14) * 120
            celular(d, cx, cy, 1.4, True, t)
        if hack:
            for k, lin in enumerate(['SEU CELULAR', 'FOI HACKEADO']):
                texto(d, (W/2 + shake, 170 + k * 80), lin, F_BIG, cor=VERM if k else TINTA)
        if t > 2.0:
            texto(d, (W/2, 1120), 'e agora?!', F_HAND, borda=0)
    elif t < 4.4:
        # ---- "5 passos"
        k = seg(t, 3.2, 3.5)
        s = lerp(0.3, 1.0, k) + math.sin(t * 12) * 0.02
        fonte = ImageFont.truetype(FONTES + 'ArchivoBlack.ttf', max(10, int(380 * s)))
        texto(d, (W/2, 330), '5', fonte, cor=VERM, borda=14)
        texto(d, (W/2, 590), 'PASSOS PRA', F_BIG)
        texto(d, (W/2, 665), 'SOBREVIVER', F_BIG, cor=VERM)
        boneco(d, W/2, 902, POSES['vitoria'], esc=0.7, rosto='feliz')
    else:
        # ---- PASSO 1: desconecte tudo
        texto(d, (W/2, 150), 'PASSO 1', F_MED, cor=VERM)
        texto(d, (W/2, 225), 'DESCONECTE TUDO', F_MED)
        rx, ry = 500, 965
        desligado = t > 7.3
        roteador(d, rx, ry, desligado, t)
        # cabo até a tomada
        tomada = (680, 900)
        d.rounded_rectangle([tomada[0] - 22, tomada[1] - 40, tomada[0] + 22, tomada[1] + 40], 6, fill=PAPEL, outline=TINTA, width=6)
        if t < 5.8:  # corre da esquerda até o roteador
            k = (t - 4.4) / 1.4
            x = lerp(60, 380, k)
            pose = POSES['corre1'] if int(t * 8) % 2 else POSES['corre2']
            boneco(d, x, 856 - abs(math.sin(t * 25)) * 14, pose, rosto='susto')
            d.line([(rx + 90, ry), tomada], fill=TINTA, width=6)
        else:
            k = seg(t, 5.8, 7.3)
            pose = mix(POSES['parado'], POSES['puxa'], seg(t, 5.8, 6.2))
            x = 400 - (k * 60 if t > 6.6 else 0)
            mao_e, mao_d, _ = boneco(d, x, 856, pose, rosto='susto' if not desligado else 'feliz', dir=-1)
            # cabo puxado: vai da traseira do roteador até a mão
            if not desligado:
                d.line([(rx - 90, ry), mao_d], fill=TINTA, width=6)
                d.line([(rx + 90, ry), tomada], fill=TINTA, width=6)
            else:
                d.line([(rx - 90, ry), mao_d], fill=TINTA, width=6)
                d.rectangle([mao_d[0] - 14, mao_d[1] - 10, mao_d[0] + 6, mao_d[1] + 10], fill=TINTA)
                if t < 7.8: faisca(d, *tomada, (t - 7.3) / 0.5, 7)
            if desligado:
                texto(d, (W/2, 420), 'Wi-Fi e dados: OFF', F_HAND, cor=VERDE, borda=0)
                texto(d, (W/2, 480), 'o hacker perde o acesso', F_HAND, borda=0)
        if t > 8.6:
            a = seg(t, 8.6, 8.9)
            texto(d, (W/2, 1140), 'FEITO!', F_MED, cor=VERDE)
    return img

for i in range(int(DUR * FPS)):
    quadro(i).save(f'{OUT}/f{i:04d}.png')
print('ok')
