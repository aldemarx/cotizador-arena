"""Gira el plano 90° a la derecha (queda vertical, como en el AutoCAD: es el inverso de 16_rotar_horizontal.py).
Uso: python -I scripts/plano/29_rotar_vertical.py public/plano/arenas.svg   (solo sobre el SVG horizontal; se detiene si ya está vertical).
Los scripts 17–28 trabajan sobre el plano horizontal: si hay que rehacer algo, partir de una copia horizontal y volver a correr este al final."""
import re, sys
ruta = sys.argv[1]
s = open(ruta, encoding="utf8").read()
if 'data-orientacion="vertical"' in s:
    sys.exit("ya está vertical")
if 'data-orientacion="horizontal"' not in s:
    sys.exit("el SVG no declara su orientación")

f = lambda v: ("%.1f" % v).rstrip("0").rstrip(".")
rot = lambda x, y: (-y, x)

def d_path(m):
    def par(p):
        a, b = rot(float(p.group(1)), float(p.group(2)))
        return f"{f(a)} {f(b)}"
    return ' d="' + re.sub(r"(-?[\d.]+)[ ,](-?[\d.]+)", par, m.group(1)) + '"'

s = re.sub(r' d="([^"]*)"', d_path, s)

def ins(m):
    lote, dm, cuerpo = m.group(1), m.group(2).split(), m.group(3)
    x, y = rot(float(dm[0]), float(dm[1]))
    giro = (float(dm[2]) + 90 + 90) % 180 - 90
    dm = [f(x), f(y), f(giro)] + dm[3:]
    cue = re.search(r'class="cue" cx="([-\d.]+)" cy="([-\d.]+)"', cuerpo)
    cx, cy = rot(float(cue.group(1)), float(cue.group(2)))
    cuerpo = re.sub(r'(class="som" cx=")[-\d.]+(" cy=")[-\d.]+', lambda k: f"{k.group(1)}{f(cx-0.5)}{k.group(2)}{f(cy+0.8)}", cuerpo)
    cuerpo = re.sub(r'(class="(?:cue|aro)" cx=")[-\d.]+(" cy=")[-\d.]+', lambda k: f"{k.group(1)}{f(cx)}{k.group(2)}{f(cy)}", cuerpo)
    cuerpo = re.sub(r'<text x="[-\d.]+" y="[-\d.]+"', f'<text x="{f(cx)}" y="{f(cy+0.9)}"', cuerpo)
    return f'<g class="ins" data-lote="{lote}" data-m="{" ".join(dm)}">{cuerpo}</g>'

s = re.sub(r'<g class="ins" data-lote="([^"]+)" data-m="([^"]+)">(.*?)</g>', ins, s)

# La ilustración del parque es una imagen: se gira sobre su centro.
im = re.search(r'<image id="parque"[^>]*>', s)
if im:
    t = im.group(0)
    x, y, w, h = (float(re.search(rf'\s{k}="([-\d.]+)"', t).group(1)) for k in ("x", "y", "width", "height"))
    cx, cy = x + w / 2, y + h / 2
    nx, ny = rot(cx, cy)
    t2 = t.replace("<image ", f'<image transform="translate({f(nx)} {f(ny)}) rotate(90) translate({f(-cx)} {f(-cy)})" ', 1)
    s = s.replace(t, t2)
elif 'id="parque"' in s:
    sys.exit("el parque no es una imagen: revisar a mano")

def vb(m):
    x, y, w, h = map(float, m.group(1).split())
    return f'viewBox="{f(-(y+h))} {f(x)} {f(h)} {f(w)}" data-orientacion="vertical"'
s = re.sub(r'viewBox="([^"]+)" data-orientacion="horizontal"', vb, s, count=1)
open(ruta, "w", encoding="utf8").write(s)
