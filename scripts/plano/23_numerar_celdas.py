"""Numera las celdas sacadas del PDF (22_celdas_desde_pdf.py) para una manzana de dos hileras (R11, R12): cada hilera lleva una mitad de los lotes,
en orden creciente o decreciente a lo largo de la manzana. Se prueba cada combinación (qué mitad va en qué hilera y en qué sentido) y se
queda la que mejor encaja el área de cada celda con el metraje del Excel. Si falta una celda, se avisa.
Uso: python -I scripts/plano/23_numerar_celdas.py <celdas.json> <arenas-lotes.json> <manzana> <salida.json>"""
import sys, json, itertools
import numpy as np
from shapely.geometry import Polygon

celdas_json, lotes_json, M, salida = sys.argv[1:5]
celdas = [c for c in json.load(open(celdas_json))["celdas"]]
excel = {l["lt"]: l["metraje_m2"] for l in json.load(open(lotes_json, encoding="utf8"))["lotes"] if l["mz"] == M}
n = len(excel)
print(M, "lotes en el Excel:", n)

# Celdas de la manzana: las que solapan con sus lotes actuales o caen dentro de su casco (las filtra el llamador pasando el json ya recortado)
AREA_MIN_LOTE = 130  # lo más pequeño son trozos de un lote cortado por una línea de más
geo = [(Polygon(c["poligono"]), c) for c in celdas if c.get("manzana") == M and c["area_m2"] >= AREA_MIN_LOTE]
trozos = [Polygon(c["poligono"]) for c in celdas if c.get("manzana") == M and c["area_m2"] < AREA_MIN_LOTE]
print("celdas de la manzana:", len(geo))
cent = np.array([[p.centroid.x, p.centroid.y] for p, _ in geo])
areas = np.array([c["area_m2"] for _, c in geo])
mu = cent.mean(axis=0)
_, _, vt = np.linalg.svd(cent - mu)
u_eje, v_eje = vt[0], vt[1]
u = (cent - mu) @ u_eje
v = (cent - mu) @ v_eje
# Dos hileras: se parte por el valor de v que deja el mayor hueco entre ellas
orden_v = np.sort(v)
corte = (orden_v[np.argmax(np.diff(orden_v))] + orden_v[np.argmax(np.diff(orden_v)) + 1]) / 2
filas = [np.where(v <= corte)[0], np.where(v > corte)[0]]
filas = [f[np.argsort(u[f])] for f in filas]
print("celdas por hilera:", [len(f) for f in filas])

mitades = [list(range(1, n // 2 + 1)), list(range(n // 2 + 1, n + 1))]
FACTOR = 1.0  # las celdas se calibran (22_celdas_desde_pdf.py) para que su área quede en el valor del Excel

def alinear(idx, secuencia):
    """Empareja las celdas (en orden a lo largo de la hilera) con la secuencia de lotes. Si faltan celdas, los lotes que se saltan son los que
    caen en los huecos más grandes entre celdas consecutivas (la celda que falta deja un hueco del doble de ancho); el área solo decide el sentido."""
    faltan = len(secuencia) - len(idx)
    if faltan < 0:
        return 1e9, []
    huecos = np.diff(u[idx]) if len(idx) > 1 else np.array([])
    saltar = set(int(k) + 1 for k in np.argsort(huecos)[::-1][:faltan])  # posición del lote que se salta (0 = primero)
    res, k, costo = [], 0, 0.0
    for pos, lote in enumerate(secuencia):
        if pos in saltar or k >= len(idx):
            res.append((None, lote))
            costo += 0.6
            continue
        costo += abs(areas[idx[k]] / FACTOR - excel[lote]) / excel[lote]
        res.append((idx[k], lote))
        k += 1
    return costo, res

mejor = None
for orden_mitades in ((0, 1), (1, 0)):
    for inv0, inv1 in itertools.product((False, True), repeat=2):
        s0 = mitades[orden_mitades[0]][::-1] if inv0 else mitades[orden_mitades[0]]
        s1 = mitades[orden_mitades[1]][::-1] if inv1 else mitades[orden_mitades[1]]
        c0, r0 = alinear(filas[0], s0)
        c1, r1 = alinear(filas[1], s1)
        if mejor is None or c0 + c1 < mejor[0]:
            mejor = (c0 + c1, r0 + r1)
costo, asign = mejor
print(f"costo del mejor encaje: {costo:.3f} (por lote {costo / n:.3f})")
out = {}
for i, lt in asign:
    if i is None:
        print(f"  lote {lt}: SIN CELDA (Excel {excel[lt]})")
        continue
    p, c = geo[i]
    out[lt] = c["poligono"]
    print(f"  lote {lt:>2}: celda {c['area_m2']:6.1f} m2 · Excel {excel[lt]:6.1f}")
# Lote sin celda: el hueco entre sus vecinos de la hilera (casco de ambos menos ambos)
from shapely.ops import unary_union
for fila_cels in filas:
    pass
poligonos_por_lote = {lt: Polygon(poli) for lt, poli in out.items()}
for i, lt in asign:
    if i is not None:
        continue
    pos = [k for _, k in asign].index(lt)
    anterior = next((asign[q] for q in range(pos - 1, -1, -1) if asign[q][0] is not None), None)
    siguiente = next((asign[q] for q in range(pos + 1, len(asign)) if asign[q][0] is not None), None)
    if not anterior or not siguiente:
        print(f"  lote {lt}: no se puede reconstruir (no tiene vecinos a ambos lados)")
        continue
    a, b = poligonos_por_lote[anterior[1]], poligonos_por_lote[siguiente[1]]
    hueco = unary_union([a, b]).convex_hull.difference(a.buffer(0.05)).difference(b.buffer(0.05))
    partes = [g for g in (hueco.geoms if hasattr(hueco, "geoms") else [hueco]) if g.geom_type == "Polygon"]
    if not partes:
        continue
    g = max(partes, key=lambda x: x.area).simplify(0.2)
    poligonos_por_lote[lt] = g
    out[lt] = [[round(x, 2), round(y, 2)] for x, y in g.exterior.coords]
    print(f"  lote {lt}: reconstruido entre {anterior[1]} y {siguiente[1]} · {g.area:.1f} m2 (Excel {excel[lt]:.1f})")
# Reintegra los trozos: un lote que quedó por debajo de su metraje se completa con el trozo pegado a él que más lo acerque al Excel
from shapely.geometry import Point
for lt, pol in list(poligonos_por_lote.items()):
    mejor = (abs(pol.area - excel[lt]), pol)
    for t in trozos:
        if pol.distance(t) < 0.8 or lt in [k for _, k in asign if _ is None] and pol.buffer(1.0).contains(t.centroid):
            union = unary_union([pol, t]).convex_hull
            e = abs(union.area - excel[lt])
            if e < mejor[0] - 1.0:
                mejor = (e, union)
    if mejor[1] is not pol:
        poligonos_por_lote[lt] = mejor[1]
        out[lt] = [[round(x, 2), round(y, 2)] for x, y in mejor[1].exterior.coords]
        print(f"  lote {lt}: completado con un trozo -> {mejor[1].area:.1f} m2 (Excel {excel[lt]:.1f})")
# Huecos entre lotes (una línea de más dejó un trozo sin dueño): se cierran con la manzana entera y se entregan al lote vecino que quedó corto
cierre = unary_union(list(poligonos_por_lote.values())).buffer(1.5, join_style=2).buffer(-1.5, join_style=2)
huecos = cierre.difference(unary_union(list(poligonos_por_lote.values())))
piezas = [g for g in (huecos.geoms if hasattr(huecos, "geoms") else [huecos]) if g.geom_type == "Polygon" and g.area > 2]
for g in sorted(piezas, key=lambda x: -x.area):
    candidatos = [(lt, pol) for lt, pol in poligonos_por_lote.items() if pol.area < excel[lt] * 0.97 and pol.distance(g) < 0.4]
    if not candidatos:
        continue
    lt, pol = max(candidatos, key=lambda t: excel[t[0]] - t[1].area)  # el más corto respecto a su metraje
    nuevo = unary_union([pol, g.buffer(0.05)])
    if nuevo.geom_type != "Polygon" or nuevo.area > excel[lt] * 1.04:
        continue
    poligonos_por_lote[lt] = nuevo.simplify(0.1)
    out[lt] = [[round(x, 2), round(y, 2)] for x, y in poligonos_por_lote[lt].exterior.coords]
    print(f"  lote {lt}: hueco de {g.area:.1f} m2 cerrado -> {nuevo.area:.1f} m2 (Excel {excel[lt]:.1f})")
json.dump({"manzana": M, "poligonos": {str(k): v for k, v in out.items()}, "sin_celda": [lt for i, lt in asign if i is None]}, open(salida, "w"))
