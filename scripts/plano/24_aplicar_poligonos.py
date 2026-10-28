"""Reemplaza en el SVG los contornos y los marcadores de los lotes cuyos polígonos salieron del plano PDF (22 y 23).
Uso: python -I scripts/plano/24_aplicar_poligonos.py public/plano/arenas.svg <num-R11.json> [<num-R12.json> ...]
Después hay que volver a correr 19_vias_veredas.py (las calles se deducen de los lotes). Es repetible: vuelve a escribir los mismos lotes."""
import sys, re, json, math
from shapely.geometry import Polygon

ruta, *archivos = sys.argv[1:]
s = open(ruta, encoding="utf8").read()
f = lambda v: ("%.1f" % v).rstrip("0").rstrip(".") if abs(v - round(v)) > 1e-9 else str(int(round(v)))

def d_path(coords):
    pts = coords[:-1] if coords[0] == coords[-1] else coords
    return "M" + "L".join(f"{f(x)} {f(y)}" for x, y in pts) + "Z"

def marcador(lote, n, pol):
    """Mismo marcador que 07_generar_svg.py + 16_rotar_horizontal.py: círculo algo a la izquierda del centro y el metraje (texto vertical) a su derecha."""
    rp = pol.representative_point()
    rect = pol.minimum_rotated_rectangle
    p = list(rect.exterior.coords)[:4]
    e = [math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]) for i in range(3)]
    corto = min(e[0], e[1])
    rad = max(1.7, min(2.9, corto * 0.3))
    fs = rad * 0.9
    cx, cy = rp.x - 0.55 * rad, rp.y
    ancho = max(2.0, corto * 0.9)
    return (f'<g class="ins" data-lote="{lote}" data-m="{f(cx + rad + 0.4)} {f(cy)} -90 {f(ancho)} 1.6 0">'
            f'<circle class="cue" cx="{f(cx)}" cy="{f(cy)}" r="{f(rad)}"/><text x="{f(cx)}" y="{f(cy + 0.9)}" font-size="{f(fs)}">{n}</text></g>')

total = 0
for arch in archivos:
    d = json.load(open(arch))
    M = d["manzana"]
    for n, coords in d["poligonos"].items():
        lote = f"{M}-{n}"
        pol = Polygon(coords).buffer(0)
        if pol.is_empty:
            continue
        s, k1 = re.subn(rf'<path id="lote-{lote}" d="[^"]*"/>', f'<path id="lote-{lote}" d="{d_path(coords)}"/>', s)
        s, k2 = re.subn(rf'<g class="ins" data-lote="{lote}" data-m="[^"]*">.*?</g>', lambda _m: marcador(lote, n, pol), s, count=1, flags=re.S)
        if k1 != 1 or k2 != 1:
            sys.exit(f"{lote}: no se encontró en el SVG (contorno {k1}, marcador {k2})")
        total += 1
open(ruta, "w", encoding="utf8").write(s)
print("lotes reemplazados:", total)
