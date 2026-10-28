"""Dibuja primero la manzana COMPLETA y la reparte después entre sus lotes, para que la forma de la manzana no dependa de cómo salió cada lote.
1. La manzana es la región del PDF encerrada por su acera verde (con las líneas azules y los números adentro).
2. Cada lote numerado (23_numerar_celdas.py) siembra su zona; las zonas crecen hasta llenar toda la manzana, sin huecos ni solapes.
3. Cada zona se vuelve el polígono final del lote.
Uso: python -I scripts/plano/25_manzana_completa.py <plano.pdf> <estados.json con la alineación> <puntos.json con el clip> <num-Rxx.json> <salida.json> <comprobacion.png>"""
import sys, json
import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFilter
from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union

pdf, est_json, puntos_json, num_json, salida, png = sys.argv[1:7]
al = json.load(open(est_json))["alineacion"]
x0, y0, x1, y1 = json.load(open(puntos_json))["clip"]
num = json.load(open(num_json))
M = num["manzana"]
semillas = {lt: Polygon(c) for lt, c in num["poligonos"].items()}
c, sn = np.cos(al["giro"]), np.sin(al["giro"])
DPI_AL = 60

def svg_a_pagina(x, y):
    return (((c * x - sn * y) * al["escala"] + al["tx"]) * 72 / DPI_AL + x0,
            ((sn * x + c * y) * al["escala"] + al["ty"]) * 72 / DPI_AL + y0)

def pagina_a_svg(X, Y):
    u = ((X - x0) * DPI_AL / 72 - al["tx"]) / al["escala"]
    v = ((Y - y0) * DPI_AL / 72 - al["ty"]) / al["escala"]
    return c * u + sn * v, -sn * u + c * v

zona = unary_union(list(semillas.values())).buffer(6)
esq = [svg_a_pagina(*p) for p in [(zona.bounds[0], zona.bounds[1]), (zona.bounds[2], zona.bounds[3]), (zona.bounds[0], zona.bounds[3]), (zona.bounds[2], zona.bounds[1])]]
X0, X1 = min(p[0] for p in esq), max(p[0] for p in esq)
Y0, Y1 = min(p[1] for p in esq), max(p[1] for p in esq)
DPI = 600
pix = pymupdf.open(pdf)[0].get_pixmap(dpi=DPI, clip=pymupdf.Rect(X0, Y0, X1, Y1))
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(int)
H, W = img.shape[:2]
R, G, B = img[:, :, 0], img[:, :, 1], img[:, :, 2]
px_de = lambda x, y: ((svg_a_pagina(x, y)[0] - X0) * DPI / 72, (svg_a_pagina(x, y)[1] - Y0) * DPI / 72)

def filtro(m, f, n):
    return np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(f(n))) > 127

# --- 1. La manzana: región encerrada por la acera verde y la calle gris (las líneas azules y el texto quedan adentro)
verde = (G > R + 35) & (G > B + 20)
gris = (abs(R - G) < 14) & (abs(G - B) < 14) & (R > 70) & (R < 175)
# La calle es una zona ancha y oscura (el texto y las líneas negras de adentro son finos): se detecta por su grosor
oscuro = (R < 150) & (G < 150) & (B < 150) & ~verde
calle = filtro(filtro(oscuro, ImageFilter.MinFilter, 17), ImageFilter.MaxFilter, 21)
muros = filtro(verde | gris | calle, ImageFilter.MaxFilter, 5)
libre = ~muros
# Las zonas de la manzana no pueden alejarse de los lotes sembrados más de 3 m (evita que se escape por una abertura de la acera)
cerca = Image.new("L", (W, H), 0)
ImageDraw.Draw(cerca).polygon([px_de(x, y) for x, y in unary_union(list(semillas.values())).buffer(3).convex_hull.exterior.coords], fill=255)
libre_cerca = libre & (np.array(cerca) > 127)

# Componente conexa que contiene a los lotes sembrados (relleno por inundación con una pila sobre una malla reducida x2 y luego refinada no hace falta: se etiqueta por tramos)
etiqueta = np.zeros((H, W), dtype=np.int32)
padre = [0]
def raiz(a):
    while padre[a] != a:
        padre[a] = padre[padre[a]]
        a = padre[a]
    return a
prev = []
for y in range(H):
    d = np.diff(np.concatenate(([0], libre_cerca[y].astype(np.int8), [0])))
    ini, fin = np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]
    act = []
    for a, b in zip(ini, fin):
        et = 0
        for pa, pb, pe in prev:
            if pa < b and a < pb:
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
        act.append((a, b, et))
    prev = act
mapa = np.array([raiz(i) for i in range(len(padre))])
etiqueta = mapa[etiqueta]

# La manzana = la región que más lotes sembrados contiene
votos = {}
for lt, p in semillas.items():
    # El centro de un lote suele caer sobre su número (texto = no libre): se prueban varios puntos de cada lote y se ignora la etiqueta 0
    x_min, y_min, x_max, y_max = p.bounds
    for fx in np.linspace(0.2, 0.8, 7):
        for fy in np.linspace(0.2, 0.8, 7):
            q = Point(x_min + fx * (x_max - x_min), y_min + fy * (y_max - y_min))
            if not p.contains(q):
                continue
            cx, cy = px_de(q.x, q.y)
            e = etiqueta[int(min(max(cy, 0), H - 1)), int(min(max(cx, 0), W - 1))]
            if e:
                votos[e] = votos.get(e, 0) + 1
bloque_id = max(votos, key=votos.get)
bloque = etiqueta == bloque_id
# Contorno limpio: se cierran los agujeros que dejan los números y las líneas negras, y se quitan las rebabas del borde
bloque = filtro(filtro(bloque, ImageFilter.MaxFilter, 15), ImageFilter.MinFilter, 15)
bloque = filtro(filtro(bloque, ImageFilter.MinFilter, 11), ImageFilter.MaxFilter, 11)
import os
if os.environ.get("DEPURAR"):
    pr = np.zeros((H, W, 3), dtype=np.uint8)
    pr[libre] = (255, 255, 255); pr[muros] = (0, 0, 0); pr[bloque] = (255, 120, 120)
    Image.fromarray(pr).save(os.environ["DEPURAR"])
print(M, "manzana:", int(bloque.sum() * (72 / DPI) ** 2 / (al["escala"] * 72 / DPI_AL) ** 2), "m2 aprox")

# --- 2. Cada lote siembra su zona (su polígono encogido un poco) y las zonas crecen hasta llenar la manzana
def lt_primero(lt):
    return 0 if lt in [str(x) for x in num.get("sin_celda", [])] else 1

ids = {lt: i + 1 for i, lt in enumerate(sorted(semillas, key=int))}
lab = Image.new("I", (W, H), 0)
dib = ImageDraw.Draw(lab)
# Los lotes reconstruidos (sin celda propia) se dibujan primero: sus vecinos, que sí salieron del PDF, les pisan el solapamiento
for lt, p in sorted(semillas.items(), key=lambda t: lt_primero(t[0])):
    nucleo = p.buffer(-0.8) if p.buffer(-0.8).area > 20 else p
    geom = nucleo if nucleo.geom_type == "Polygon" else max(nucleo.geoms, key=lambda g: g.area)
    dib.polygon([px_de(x, y) for x, y in geom.exterior.coords], fill=ids[lt])
L = np.array(lab).astype(np.int32)
L[~bloque] = 0
for _ in range(400):
    vacio = bloque & (L == 0)
    if not vacio.any():
        break
    # cada píxel vacío toma la etiqueta mayor de sus 8 vecinos (da igual el empate: el borde queda a mitad de camino)
    vec = np.zeros_like(L)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy or dx:
                vec = np.maximum(vec, np.roll(np.roll(L, dy, axis=0), dx, axis=1))
    nuevo = vacio & (vec > 0)
    if not nuevo.any():
        break
    L[nuevo] = vec[nuevo]
print("píxeles de la manzana sin lote:", int((bloque & (L == 0)).sum()))

# Fronteras suaves: cada píxel va al lote cuya zona, difuminada, pesa más a su alrededor (incluye el fuera de la manzana como una zona más).
# Así los bordes comunes y el contorno de la manzana quedan lisos y sin huecos ni solapes, sin el escalonado del píxel.
etiquetas = [0] + list(ids.values())
mejor = np.zeros((H, W), dtype=np.uint8)
suave = np.zeros((H, W), dtype=np.int32)
for e in etiquetas:
    peso = np.array(Image.fromarray(((L == e) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)))
    sube = peso > mejor
    mejor[sube] = peso[sube]
    suave[sube] = e
L = suave

# --- 3. Polígono de cada zona (a mitad de resolución, unión de cuadritos) en coordenadas del SVG
PASO = 2
poligonos = {}
for lt, i in ids.items():
    m = (L == i)
    ys, xs = np.nonzero(m[::PASO, ::PASO])
    cuadros = [box(x * PASO, y * PASO, (x + 1) * PASO, (y + 1) * PASO) for x, y in zip(xs, ys)]
    if not cuadros:
        continue
    u = unary_union(cuadros)
    if u.geom_type != "Polygon":
        u = max(u.geoms, key=lambda g: g.area)
    coords = [pagina_a_svg(X0 + px * 72 / DPI, Y0 + py * 72 / DPI) for px, py in u.exterior.coords]
    p = Polygon(coords).simplify(0.15)
    poligonos[lt] = [[round(a, 2), round(b, 2)] for a, b in p.exterior.coords]
# Contorno de la manzana liso: el borde sale de un recorte a mano alzada de píxeles; se suaviza el contorno completo (sin tocar las divisiones
# entre lotes) y cada lote se recorta con él.
pols = {lt: Polygon(c) for lt, c in poligonos.items()}
cuerpo = unary_union(list(pols.values()))
def alisar(poligono, paso=0.3, ventana=15):
    """Remuestrea el contorno cada `paso` metros y promedia cada punto con sus vecinos (media móvil circular): quita el temblor del píxel y redondea
    las esquinas apenas, sin mover el borde de la manzana."""
    anillo = poligono.exterior
    n = max(8, int(anillo.length / paso))
    pts = np.array([anillo.interpolate(i * anillo.length / n).coords[0] for i in range(n)])
    k = ventana // 2
    suave = np.mean([np.roll(pts, d, axis=0) for d in range(-k, k + 1)], axis=0)
    return Polygon(suave).buffer(0)

if cuerpo.geom_type != "Polygon":
    cuerpo = max(cuerpo.geoms, key=lambda g: g.area)
cuerpo = Polygon(cuerpo.exterior)  # sin agujeros
liso = alisar(cuerpo).simplify(0.12)
for lt, p in pols.items():
    r = p.intersection(liso)
    if r.is_empty:
        continue
    if r.geom_type != "Polygon":
        r = max((g for g in r.geoms if g.geom_type == "Polygon"), key=lambda g: g.area)
    pols[lt] = r
# Divisiones rectas: la frontera común de cada par de lotes vecinos (con el zigzag del píxel) se reemplaza por su recta, y la manzana se vuelve a
# partir con esas rectas (polygonize), de modo que los dos vecinos comparten exactamente la misma línea.
from shapely.geometry import LineString
from shapely.ops import linemerge, polygonize
def prolongar(linea, m):
    pts = list(linea.coords)
    (ax, ay), (bx, by) = pts[1], pts[0]
    (cx, cy), (dx, dy) = pts[-2], pts[-1]
    la, lb = np.hypot(bx - ax, by - ay) or 1, np.hypot(dx - cx, dy - cy) or 1
    return LineString([(bx + (bx - ax) / la * m, by + (by - ay) / la * m)] + pts[1:-1] + [(dx + (dx - cx) / lb * m, dy + (dy - cy) / lb * m)])
lineas = [liso.exterior]
ordenados = sorted(pols)
for a_i, a in enumerate(ordenados):
    for b in ordenados[a_i + 1:]:
        comun = pols[a].boundary.intersection(pols[b].boundary)
        if comun.is_empty or comun.length < 1.0:
            continue
        partes = list(comun.geoms) if hasattr(comun, "geoms") else [comun]
        lineales = [g for g in partes if g.geom_type in ("LineString", "MultiLineString")]
        if not lineales:
            continue
        unido = unary_union(lineales)
        if unido.geom_type == "MultiLineString":
            unido = linemerge(unido)
        for ln in (list(unido.geoms) if hasattr(unido, "geoms") else [unido]):
            if ln.length < 1.0:
                continue
            recta = ln.simplify(0.8, preserve_topology=False)
            if len(recta.coords) >= 2:
                lineas.append(prolongar(recta, 2.0))
caras = [f for f in polygonize(unary_union(lineas)) if f.area > 1.0]
nuevos = {}
for f in caras:
    lt = max(pols, key=lambda k: pols[k].intersection(f).area)
    if pols[lt].intersection(f).area < 0.3 * f.area:
        continue  # cara fuera de la manzana
    nuevos[lt] = f if lt not in nuevos else unary_union([nuevos[lt], f])
for lt, g in nuevos.items():
    if g.geom_type != "Polygon":
        g = max(g.geoms, key=lambda x: x.area)
    poligonos[lt] = [[round(a, 2), round(b, 2)] for a, b in g.simplify(0.05).exterior.coords]
# Si al enderezar un lote su área se aparta más de un 8 % de la del polígono de píxeles, la recta salió mal (línea que nunca existió en el PDF):
# ese lote conserva su contorno de píxeles, apenas alisado.
for lt in list(pols):
    g = nuevos.get(lt)
    if g is None or g.geom_type != "Polygon" or abs(g.area / pols[lt].area - 1) > 0.08:
        print(f"  lote {lt}: la recta no encaja ({'sin cara' if g is None else round(g.area / pols[lt].area, 2)}); se queda con el contorno de píxeles")
        nuevos.pop(lt, None)
        poligonos[lt] = [[round(a, 2), round(b, 2)] for a, b in pols[lt].simplify(0.25).exterior.coords]
print("lotes con polígono recto:", len(nuevos), "de", len(pols), "· vértices:", sum(len(v) for v in poligonos.values()))

json.dump({"manzana": M, "poligonos": poligonos, "sin_celda": num.get("sin_celda", [])}, open(salida, "w"))

# --- comprobación
vista = Image.fromarray(img.astype(np.uint8)).convert("RGBA")
capa = Image.new("RGBA", vista.size, (0, 0, 0, 0))
dd = ImageDraw.Draw(capa)
rng = np.random.default_rng(5)
for lt, coords in poligonos.items():
    pts = [px_de(x, y) for x, y in coords]
    dd.polygon(pts, fill=tuple(int(v) for v in rng.integers(60, 255, 3)) + (95,), outline=(0, 0, 0, 220))
Image.alpha_composite(vista, capa).convert("RGB").save(png)
