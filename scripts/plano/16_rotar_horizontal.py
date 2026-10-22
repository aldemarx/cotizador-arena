"""Gira el plano 90° a la izquierda (queda horizontal, como el plano oficial: R-1 a la izquierda, club a la derecha).
Uso: python -I scripts/plano/16_rotar_horizontal.py public/plano/arenas.svg   (solo sobre el SVG vertical; es idempotente)."""
import re, sys
ruta = sys.argv[1]
s = open(ruta, encoding="utf8").read()
if 'data-orientacion="horizontal"' in s:
    sys.exit("ya está horizontal")

f = lambda v: ("%.1f" % v).rstrip("0").rstrip(".")
rot = lambda x, y: (y, -x)

def d_path(m):
    def par(p):
        a, b = rot(float(p.group(1)), float(p.group(2)))
        return f"{f(a)} {f(b)}"
    return 'd="' + re.sub(r"(-?[\d.]+)[ ,](-?[\d.]+)", par, m.group(1)) + '"'

s = re.sub(r'd="([^"]*)"', d_path, s)

def ins(m):
    lote, dm, cuerpo = m.group(1), m.group(2).split(), m.group(3)
    x, y = rot(float(dm[0]), float(dm[1]))
    giro = (float(dm[2]) - 90 + 90) % 180 - 90
    dm = [f(x), f(y), f(giro)] + dm[3:]
    cue = re.search(r'class="cue" cx="([-\d.]+)" cy="([-\d.]+)"', cuerpo)
    cx, cy = rot(float(cue.group(1)), float(cue.group(2)))
    cuerpo = re.sub(r'(class="som" cx=")[-\d.]+(" cy=")[-\d.]+', lambda k: f"{k.group(1)}{f(cx-0.5)}{k.group(2)}{f(cy+0.8)}", cuerpo)
    cuerpo = re.sub(r'(class="(?:cue|aro)" cx=")[-\d.]+(" cy=")[-\d.]+', lambda k: f"{k.group(1)}{f(cx)}{k.group(2)}{f(cy)}", cuerpo)
    cuerpo = re.sub(r'<text x="[-\d.]+" y="[-\d.]+"', f'<text x="{f(cx)}" y="{f(cy+0.9)}"', cuerpo)
    return f'<g class="ins" data-lote="{lote}" data-m="{" ".join(dm)}">{cuerpo}</g>'

s = re.sub(r'<g class="ins" data-lote="([^"]+)" data-m="([^"]+)">(.*?)</g>', ins, s)

def vb(m):
    x, y, w, h = map(float, m.group(1).split())
    return f'viewBox="{f(y)} {f(-(x+w))} {f(h)} {f(w)}" data-orientacion="horizontal"'
s = re.sub(r'viewBox="([^"]+)"', vb, s, count=1)
open(ruta, "w", encoding="utf8").write(s)
