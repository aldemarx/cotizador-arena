"""Afina la alineación PDF -> SVG usando SOLO los lotes del SVG que salen del DWG tal cual (no los reconstruidos): un lote del DWG debe quedar entero
dentro del interior de su manzana en el PDF (ni sobre la calle ni sobre la acera verde). Se parte de la alineación de 21_estados_desde_pdf.py y se
mueven escala, giro y desplazamiento hasta que la fracción de lotes que cae en terreno libre sea máxima y el terreno libre cercano quede cubierto.
Uso: python -I scripts/plano/27_afinar_alineacion.py <plano.pdf> <estados.json con la alineación de partida> <puntos.json con el clip> <arenas.svg> <salida.json>
La salida tiene el mismo formato (clave «alineacion») y la leen 21, 22 y 25."""
import sys, re, json
import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFilter
from shapely.geometry import Polygon

pdf, est_json, puntos_json, svg, salida = sys.argv[1:6]
al = json.load(open(est_json))["alineacion"]
x0, y0, x1, y1 = json.load(open(puntos_json))["clip"]
APROX = ("R7-", "R11-", "R12-", "R13-1", "R18-2")  # reconstruidos: no sirven de referencia (R13-10..R13-19 empiezan igual que R13-1: se excluye con coincidencia exacta abajo)
s = open(svg, encoding="utf8").read()
lotes = {}
for m in re.finditer(r'<path id="lote-([^"]+)" d="([^"]+)"', s):
    k = m.group(1)
    if k.startswith(("R7-", "R11-", "R12-")) or k in ("R13-1", "R18-2"):
        continue
    n = list(map(float, re.findall(r"-?\d+\.?\d*", m.group(2))))
    lotes[k] = list(zip(n[0::2], n[1::2]))
print("lotes de referencia:", len(lotes))

DPI = 80
pix = pymupdf.open(pdf)[0].get_pixmap(dpi=DPI, clip=pymupdf.Rect(x0, y0, x1, y1))
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(int)
R, G, B = img[:, :, 0], img[:, :, 1], img[:, :, 2]
verde = (G > R + 35) & (G > B + 20)
oscuro = (R < 150) & (G < 150) & (B < 150) & ~verde
calle = np.array(Image.fromarray((oscuro * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(7))) > 127
gris = (abs(R - G) < 14) & (abs(G - B) < 14) & (R > 70) & (R < 175)
libre = ~(verde | calle | gris)
H, W = libre.shape

def mascara(p):
    esc, giro, tx, ty = p
    c, sn = np.cos(giro), np.sin(giro)
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    for pts in lotes.values():
        d.polygon([(((c * x - sn * y) * esc + tx) * DPI / 60 * 1.0, ((sn * x + c * y) * esc + ty) * DPI / 60 * 1.0) for x, y in pts], fill=255)
    return np.array(im) > 127

def puntaje(p):
    m = mascara(p)
    dentro = (m & libre).sum() / max(m.sum(), 1)  # el lote cae en terreno libre
    cerca = np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 127
    cubre = (m & libre).sum() / max((libre & cerca).sum(), 1)  # el terreno libre cercano queda cubierto
    return dentro * cubre

# La alineación de partida está en píxeles de 60 dpi: aquí el mapa de 80 dpi la escala sola (DPI / 60)
p = [al["escala"], al["giro"], al["tx"], al["ty"]]
f = puntaje(p)
print(f"puntaje de partida: {f:.4f}")
paso = [al["escala"] * 0.01, 0.004, 2.0, 2.0]
for _ in range(120):
    mejoro = False
    for i in range(4):
        for sg in (-1, 1):
            q = p.copy()
            q[i] += sg * paso[i]
            fq = puntaje(q)
            if fq > f + 1e-6:
                p, f, mejoro = q, fq, True
    if not mejoro:
        paso = [v / 2 for v in paso]
        if paso[2] < 0.05:
            break
print(f"puntaje final: {f:.4f} · escala {p[0]:.5f} (antes {al['escala']:.5f}) · giro {p[1]:.5f} (antes {al['giro']:.5f}) · tx {p[2]:.2f} (antes {al['tx']:.2f}) · ty {p[3]:.2f} (antes {al['ty']:.2f})")
json.dump({"alineacion": {"escala": p[0], "giro": p[1], "tx": p[2], "ty": p[3], "iou": f}}, open(salida, "w"))
