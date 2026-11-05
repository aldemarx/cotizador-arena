"""Pasa al plano original (public/plano/arenas.svg) la posición de los puntos (marcadores numerados) de los lotes que se movieron en Illustrator.
Mueve juntos el círculo, el número y el lugar del metraje (data-m) del mismo desplazamiento. No cambia el estilo (lo pinta el sistema según el estado).
Cada punto de Illustrator se asigna al lote que tiene ese número y está más cerca; solo se acepta si el punto queda DENTRO de la forma del lote.
Los lotes sin punto en Illustrator conservan el suyo.
Uso: python -I scripts/plano/32_aplicar_puntos_illustrator.py <arenas-illustrator.svg> public/plano/arenas.svg [--aplicar]
"""
import math
import re
import sys

ai, destino = sys.argv[1], sys.argv[2]
aplicar = "--aplicar" in sys.argv
nuevo = open(ai, encoding="utf8").read()
orig = open(destino, encoding="utf8").read()
vb = re.search(r'viewBox="([-\d.]+) ([-\d.]+)', orig)
OX, OY = float(vb.group(1)), float(vb.group(2))
UMBRAL = 0.15  # unidades (≈ metros): menos que eso no se toca
MAX_DIST = 12.0


def num(t):
    return re.findall(r"-?\d*\.?\d+(?:e-?\d+)?", t)


def vertices(d):
    pts, cur = [], (0.0, 0.0)
    for cmd, args in re.findall(r"([MmLlHhVvZz])([^MmLlHhVvZz]*)", d):
        n = [float(x) for x in num(args)]
        rel, c = cmd.islower(), cmd.upper()
        if c == "Z":
            continue
        if c == "M":
            cur = (n[0] + (cur[0] if rel else 0), n[1] + (cur[1] if rel else 0))
            pts.append(cur)
            n, c = n[2:], "L"
        if c == "L":
            for q in range(0, len(n), 2):
                cur = (cur[0] + n[q], cur[1] + n[q + 1]) if rel else (n[q], n[q + 1])
                pts.append(cur)
    return pts


def dentro(x, y, P):
    d, j = False, len(P) - 1
    for i in range(len(P)):
        xi, yi = P[i]
        xj, yj = P[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            d = not d
        j = i
    return d


poligonos = {m.group(1): vertices(m.group(2)) for m in re.finditer(r'<path id="lote-([^"]+)"[^>]*? d="([^"]*)"', orig)}

puntos = {}  # lote → (cx, cy, r, número)
patron = re.compile(r'<g class="ins" data-lote="([^"]+)" data-m="([-\d.]+) ([-\d.]+) ([^"]*)"><circle class="cue" cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/><text x="([-\d.]+)" y="([-\d.]+)"([^>]*)>([^<]*)</text></g>')
for m in patron.finditer(orig):
    puntos[m.group(1)] = (float(m.group(5)), float(m.group(6)), m.group(11))
assert len(puntos) == 654, len(puntos)

# puntos de Illustrator
seg = nuevo[nuevo.index('<g id="insignias"'):]
ai_pts = []
for b in seg.split("<g>")[1:]:
    c = re.search(r'<circle[^>]*cx="([-\d.]+)" cy="([-\d.]+)"', b)
    t = re.search(r'<text[^>]*transform="translate\(([-\d.]+) ([-\d.]+)\)"[^>]*><tspan[^>]*>([^<]*)</tspan>', b)
    if c and t:
        ai_pts.append((float(c.group(1)) + OX, float(c.group(2)) + OY, t.group(3)))
print("puntos en Illustrator:", len(ai_pts), "| puntos en el original:", len(puntos))

# asignación: primero por cercanía a un punto del mismo número; los más cercanos primero
pares = []
for k, (x, y, t) in puntos.items():
    for j, (a, b, tt) in enumerate(ai_pts):
        if tt == t:
            d = math.hypot(a - x, b - y)
            if d <= MAX_DIST:
                pares.append((d, k, j))
pares.sort()
asig, usados = {}, set()
for d, k, j in pares:
    if k in asig or j in usados:
        continue
    asig[k] = j
    usados.add(j)

cambios, fuera = [], []
for k, j in asig.items():
    x, y, t = puntos[k]
    a, b, _ = ai_pts[j]
    dx, dy = a - x, b - y
    if math.hypot(dx, dy) <= UMBRAL:
        continue
    if k in poligonos and not dentro(a, b, poligonos[k]):
        fuera.append((k, round(dx, 2), round(dy, 2)))
        continue
    cambios.append((k, dx, dy))
sin_punto = [k for k in puntos if k not in asig]
print("sin punto en Illustrator (se conservan):", sin_punto)
print("puntos de Illustrator sin lote:", [(ai_pts[j][2], round(ai_pts[j][0], 1), round(ai_pts[j][1], 1)) for j in range(len(ai_pts)) if j not in usados])
print("movidos:", len(cambios), "| descartados por quedar fuera de su lote:", fuera)
for k, dx, dy in cambios:
    print(f"   {k:8} dx {dx:+.2f}  dy {dy:+.2f}")

salida = orig
for k, dx, dy in cambios:
    pat = re.compile(rf'<g class="ins" data-lote="{re.escape(k)}" data-m="([-\d.]+) ([-\d.]+) ([^"]*)"><circle class="cue" cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/><text x="([-\d.]+)" y="([-\d.]+)"([^>]*)>([^<]*)</text></g>')
    m = pat.search(salida)
    assert m, k
    mx, my = float(m.group(1)) + dx, float(m.group(2)) + dy
    cx, cy = float(m.group(4)) + dx, float(m.group(5)) + dy
    tx, ty = float(m.group(7)) + dx, float(m.group(8)) + dy
    nuevo_g = (f'<g class="ins" data-lote="{k}" data-m="{mx:.1f} {my:.1f} {m.group(3)}"><circle class="cue" cx="{cx:.2f}" cy="{cy:.2f}" r="{m.group(6)}"/>'
               f'<text x="{tx:.2f}" y="{ty:.2f}"{m.group(9)}>{m.group(10)}</text></g>')
    salida = salida[: m.start()] + nuevo_g + salida[m.end():]

if aplicar:
    open(destino, "w", encoding="utf8").write(salida)
    print("plano actualizado.")
