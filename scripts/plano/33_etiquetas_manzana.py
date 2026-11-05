"""Escribe en public/plano/arenas.svg el nombre de cada manzana («R-4») como texto grande y muy transparente sobre la manzana.
Va en el grupo <g id="manzanas">, entre los lotes y los marcadores, sin recibir clics. Es repetible: reemplaza el grupo anterior.
Posición: el centro de la manzana (promedio de los centros de sus lotes, ponderado por área). Giro: el texto sigue el lado largo de la manzana.
Uso: python -I scripts/plano/33_etiquetas_manzana.py public/plano/arenas.svg"""
import math
import re
import sys

ruta = sys.argv[1]
s = open(ruta, encoding="utf8").read()
s = re.sub(r'<g id="manzanas".*?</g>\n?', "", s, flags=re.S)


def num(t):
    return [float(x) for x in re.findall(r"-?\d*\.?\d+", t)]


def centro_area(P):
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(P, P[1:] + P[:1]):
        c = x0 * y1 - x1 * y0
        a += c
        cx += (x0 + x1) * c
        cy += (y0 + y1) * c
    if abs(a) < 1e-9:
        return sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P), 0.0
    return cx / (3 * a), cy / (3 * a), abs(a) / 2


etiquetas = []
for m in re.finditer(r'<g id="mz-(R\d+)"[^>]*>(.*?)</g>', s, re.S):
    nombre, cuerpo = m.group(1), m.group(2)
    pts, A, X, Y = [], 0.0, 0.0, 0.0
    for d in re.findall(r' d="([^"]*)"', cuerpo):
        n = num(d)
        P = [(n[i], n[i + 1]) for i in range(0, len(n) - 1, 2)]
        cx, cy, a = centro_area(P)
        A += a
        X += cx * a
        Y += cy * a
        pts += P
    X, Y = X / A, Y / A
    # eje principal (mínimos cuadrados sobre los vértices) para girar el texto
    mx, my = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    sxx = sum((p[0] - mx) ** 2 for p in pts)
    syy = sum((p[1] - my) ** 2 for p in pts)
    sxy = sum((p[0] - mx) * (p[1] - my) for p in pts)
    ang = 0.5 * math.degrees(math.atan2(2 * sxy, sxx - syy))
    if ang > 90:
        ang -= 180
    if ang < -90:
        ang += 180
    lado_largo = math.sqrt(max(sxx, syy) / len(pts)) * 3.46  # ≈ largo de la manzana
    lado_corto = math.sqrt(min(sxx, syy) / len(pts)) * 3.46
    tam = max(7.0, min(18.0, lado_corto * 0.42, lado_largo * 0.2))
    etiquetas.append((nombre, X, Y, ang, tam))

texto = "".join(
    f'<text x="{x:.1f}" y="{y:.1f}" font-size="{t:.1f}" transform="rotate({a:.1f} {x:.1f} {y:.1f})">R-{n[1:]}</text>'
    for n, x, y, a, t in etiquetas
)
grupo = (
    '<g id="manzanas" font-family="Montserrat, Arial, sans-serif" font-weight="800" text-anchor="middle" dominant-baseline="central" '
    'fill="#6b6a62" fill-opacity="0.2" pointer-events="none" letter-spacing="0.5">' + texto + "</g>\n"
)
i = s.index('<g id="insignias"')
s = s[:i] + grupo + s[i:]
open(ruta, "w", encoding="utf8").write(s)
for e in etiquetas:
    print(f"R-{e[0][1:]:3} x {e[1]:7.1f} y {e[2]:8.1f} giro {e[3]:6.1f} tam {e[4]:.1f}")
