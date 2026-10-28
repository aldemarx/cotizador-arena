"""Recupera los lotes de una zona del plano PDF de ventas (19-10-2026 plano arena.pdf) como celdas: el PDF trae las líneas azules que separan
cada lote y el borde verde de la manzana; cada región blanca entre ellas es un lote. Las convierte a coordenadas del SVG con la misma
alineación PDF -> SVG que usa 21_estados_desde_pdf.py.
Uso: python -I scripts/plano/22_celdas_desde_pdf.py <plano.pdf> <estados.json con la alineación> <puntos.json con el clip> <arenas.svg> <manzanas: R10,R11,...> <salida.json> <comprobacion.png>
Salida: JSON con una celda por lote (polígono en metros del SVG, área, lote del SVG con el que más se solapa) y una imagen de comprobación."""
import sys, re, json
import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from shapely.geometry import Polygon, MultiPoint
from shapely.ops import unary_union

pdf, est_json, puntos_json, svg, manzanas, salida, png = sys.argv[1:8]
manzanas = manzanas.split(",")
TODAS = manzanas == ["TODAS"]
al = json.load(open(est_json))["alineacion"]
x0, y0, x1, y1 = json.load(open(puntos_json))["clip"]
DPI_ALINEACION = 60
c, sn = np.cos(al["giro"]), np.sin(al["giro"])

# --- Lotes actuales del SVG (para delimitar la zona y comparar)
s = open(svg, encoding="utf8").read()
lotes = {}
for m in re.finditer(r'<path id="lote-([^"]+)" d="([^"]+)"', s):
    n = list(map(float, re.findall(r"-?\d+\.?\d*", m.group(2))))
    lotes[m.group(1)] = Polygon(list(zip(n[0::2], n[1::2]))).buffer(0)
zona = unary_union([p for k, p in lotes.items() if TODAS or k.split("-")[0] in manzanas]).buffer(8)

def svg_a_pagina(x, y):
    return (((c * x - sn * y) * al["escala"] + al["tx"]) * 72 / DPI_ALINEACION + x0,
            ((sn * x + c * y) * al["escala"] + al["ty"]) * 72 / DPI_ALINEACION + y0)

def pagina_a_svg(X, Y):
    u = ((X - x0) * DPI_ALINEACION / 72 - al["tx"]) / al["escala"]
    v = ((Y - y0) * DPI_ALINEACION / 72 - al["ty"]) / al["escala"]
    return c * u + sn * v, -sn * u + c * v

esq = [svg_a_pagina(x, y) for x, y in [(zona.bounds[0], zona.bounds[1]), (zona.bounds[2], zona.bounds[3]), (zona.bounds[0], zona.bounds[3]), (zona.bounds[2], zona.bounds[1])]]
X0, X1 = min(p[0] for p in esq), max(p[0] for p in esq)
Y0, Y1 = min(p[1] for p in esq), max(p[1] for p in esq)
import os
DPI = int(os.environ.get("DPI_CELDAS", 600))  # 300 basta para alinear todo el plano; 600 para la forma de una manzana
pix = pymupdf.open(pdf)[0].get_pixmap(dpi=DPI, clip=pymupdf.Rect(X0, Y0, X1, Y1))
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(int)
H, W = img.shape[:2]
R, G, B = img[:, :, 0], img[:, :, 1], img[:, :, 2]

def filtro(mascara, f, n):
    im = Image.fromarray((mascara * 255).astype(np.uint8))
    return np.array(im.filter(f(n))) > 127

# Líneas azules finas (las gruesas son las letras «R-11» del rótulo de la manzana)
azul = (B > 130) & (B - R > 55) & (B - G > 30)  # incluye el azul claro de las líneas de R10 y R13
gruesas = filtro(filtro(azul, ImageFilter.MinFilter, 5), ImageFilter.MaxFilter, 7)
finas = azul & ~gruesas
# Borde de la manzana: la acera verde y la calle gris
verde = (G > R + 35) & (G > B + 20)
gris = (abs(R - G) < 14) & (abs(G - B) < 14) & (R > 70) & (R < 175)

def curar_bajo_el_rotulo(finas, gruesas):
    """Las letras gruesas del rótulo de la manzana (R-11, R-12) tapan tramos de las líneas azules y funden varios lotes en una celda.
    Se buscan las rectas que forman las líneas visibles (transformada de Hough) y se dibujan solo debajo de las letras."""
    ys, xs = np.nonzero(finas)
    if len(xs) == 0:
        return np.zeros_like(finas)
    angulos = np.deg2rad(np.arange(0, 180, 0.5))
    diag = int(np.hypot(*finas.shape)) + 2
    acum = np.zeros((len(angulos), 2 * diag), dtype=np.int32)
    for i, t in enumerate(angulos):
        rho = np.round(xs * np.cos(t) + ys * np.sin(t)).astype(int) + diag
        acum[i] = np.bincount(rho, minlength=2 * diag)[: 2 * diag]
    # La votación se suaviza un poco en rho: las rectas del plano no son perfectas
    acum = acum + np.roll(acum, 1, axis=1) + np.roll(acum, -1, axis=1)
    sobre = filtro(gruesas, ImageFilter.MaxFilter, 7)
    curadas = Image.new("L", (finas.shape[1], finas.shape[0]), 0)
    d = ImageDraw.Draw(curadas)
    lineas = 0
    for _ in range(400):
        i, j = np.unravel_index(np.argmax(acum), acum.shape)
        if acum[i, j] < 150:  # 150 votos ≈ 50 px de línea visible
            break
        acum[max(0, i - 8): i + 9, max(0, j - 10): j + 11] = 0
        t, rho = angulos[i], j - diag
        # recta x·cos + y·sin = rho, trazada de borde a borde
        if abs(np.sin(t)) > 0.5:
            pts = [(x, (rho - x * np.cos(t)) / np.sin(t)) for x in (0, finas.shape[1])]
        else:
            pts = [((rho - y * np.sin(t)) / np.cos(t), y) for y in (0, finas.shape[0])]
        d.line(pts, fill=255, width=2)
        lineas += 1
    print("rectas halladas bajo el rótulo:", lineas)
    return (np.array(curadas) > 127) & sobre

muros = filtro(finas | verde | gris | curar_bajo_el_rotulo(finas, gruesas), ImageFilter.MaxFilter, 3)  # cierra huecos de 1 px entre trazos

# --- Etiquetado de regiones libres por tramos de fila (sin scipy)
libre = ~muros
etiqueta = np.zeros((H, W), dtype=np.int32)
padre = [0]
def raiz(a):
    while padre[a] != a:
        padre[a] = padre[padre[a]]
        a = padre[a]
    return a
tramos_prev = []
for y in range(H):
    fila = libre[y]
    d = np.diff(np.concatenate(([0], fila.astype(np.int8), [0])))
    ini, fin = np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]
    actuales = []
    for a, b in zip(ini, fin):
        et = 0
        for (pa, pb, pe) in tramos_prev:
            if pa < b and a < pb:  # solapa con un tramo de la fila anterior
                if et == 0:
                    et = raiz(pe)
                else:
                    ra, rb = raiz(et), raiz(pe)
                    if ra != rb:
                        padre[rb] = ra
        if et == 0:
            padre.append(len(padre))
            et = len(padre) - 1
        etiqueta[y, a:b] = et
        actuales.append((a, b, et))
    tramos_prev = actuales
mapa = np.array([raiz(i) for i in range(len(padre))])
etiqueta = mapa[etiqueta]

# --- Celdas: regiones del tamaño de un lote (≈100–500 m²) dentro de la zona
M_POR_PX = (72 / DPI) * (1 / (al["escala"] * 72 / DPI_ALINEACION))  # metros del SVG por píxel
print("m por píxel:", round(M_POR_PX, 4))
celdas = []
ids, cuentas = np.unique(etiqueta[etiqueta > 0], return_counts=True)
for i, n in zip(ids, cuentas):
    area_m2 = n * M_POR_PX ** 2
    if not (25 <= area_m2 <= 700):  # los trozos pequeños (<130 m²) son lotes cortados por una línea de más: 23_numerar_celdas.py los reintegra
        continue
    ys, xs = np.nonzero(etiqueta == i)
    pts = np.column_stack([xs, ys])
    paso = max(1, len(pts) // 3000)
    hull = MultiPoint(pts[::paso]).convex_hull
    if hull.geom_type != "Polygon":
        continue
    hull = hull.buffer(1.0, join_style=2)  # medio espesor del muro: deja el área del lote en el valor del Excel
    coords = [pagina_a_svg(X0 + px * 72 / DPI, Y0 + py * 72 / DPI) for px, py in hull.exterior.coords]
    poligono = Polygon(coords).simplify(0.25)
    if not poligono.is_valid or poligono.is_empty:
        continue
    # ¿qué lote actual del SVG se solapa más?
    mejor, mejor_a = None, 0
    for k, p in lotes.items():
        if TODAS or k.split("-")[0] in manzanas:
            a = p.intersection(poligono).area
            if a > mejor_a:
                mejor, mejor_a = k, a
    celdas.append({"poligono": [[round(x, 2), round(y, 2)] for x, y in poligono.exterior.coords], "area_m2": round(poligono.area, 1),
                   "solapa_con": mejor, "solape_m2": round(mejor_a, 1), "pix": int(n)})
print("celdas:", len(celdas), "· lotes actuales en las manzanas:", sum(1 for k in lotes if k.split('-')[0] in manzanas))
json.dump({"manzanas": manzanas, "celdas": celdas}, open(salida, "w"), indent=0)

# --- Comprobación: celdas en colores sobre el PDF
vista = Image.fromarray(img.astype(np.uint8)).convert("RGBA")
capa = Image.new("RGBA", vista.size, (0, 0, 0, 0))
d = ImageDraw.Draw(capa)
rng = np.random.default_rng(3)
for ce in celdas:
    pts = [(((svg_a_pagina(x, y)[0] - X0) * DPI / 72), ((svg_a_pagina(x, y)[1] - Y0) * DPI / 72)) for x, y in ce["poligono"]]
    d.polygon(pts, fill=tuple(int(v) for v in rng.integers(60, 255, 3)) + (90,), outline=(0, 0, 0, 200))
Image.alpha_composite(vista, capa).convert("RGB").save(png)
