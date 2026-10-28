"""Detecta en el plano PDF de ventas (19-10-2026 plano arena.pdf) los puntos rojos (vendidos) y los puntos rosados (bloqueados).
Salida: JSON con el centro de cada punto en coordenadas de la página PDF (puntos tipográficos) y una imagen de comprobación.
Uso: python -I scripts/plano/20_detectar_puntos_pdf.py <plano.pdf> <salida.json> <comprobacion.png>"""
import sys, json
import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFilter

pdf, salida, png = sys.argv[1:4]
DPI = 330
# Zona de los lotes en la página (puntos): coincide con el recorte usado al revisar el plano a mano.
K = 72 / 110
CLIP = pymupdf.Rect(30 * K, 445 * K, 760 * K, 795 * K)
doc = pymupdf.open(pdf)
pix = doc[0].get_pixmap(dpi=DPI, clip=CLIP)
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(int)
R, G, B = img[:, :, 0], img[:, :, 1], img[:, :, 2]

ROJO = (R > 190) & (G < 70) & (B < 70)
ROSA = (R > 225) & (G > 90) & (G < 170) & (B > 90) & (B < 170) & (abs(G - B) < 35)

def componentes(mascara):
    """Etiquetado de componentes conexas (8 vecinos) sin scipy."""
    h, w = mascara.shape
    etiqueta = np.zeros((h, w), dtype=np.int32)
    ys, xs = np.nonzero(mascara)
    sig = 0
    cajas = []
    for y0, x0 in zip(ys, xs):
        if etiqueta[y0, x0]:
            continue
        sig += 1
        pila = [(y0, x0)]
        etiqueta[y0, x0] = sig
        pts = []
        while pila:
            y, x = pila.pop()
            pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mascara[ny, nx] and not etiqueta[ny, nx]:
                        etiqueta[ny, nx] = sig
                        pila.append((ny, nx))
        cajas.append(pts)
    return cajas

def cerrar(mascara):
    """Cierra las líneas finas (las azules del plano cruzan algunos puntos y los parten en dos)."""
    m = Image.fromarray((mascara * 255).astype(np.uint8))
    return np.array(m.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))) > 127

def tiene_nucleo(pts, d):
    """Un punto es un disco lleno; una letra es un trazo fino. Erosionando a la mitad del radio, el disco conserva su centro y la letra desaparece."""
    a = np.array(pts)
    y0, x0 = a[:, 0].min(), a[:, 1].min()
    caja = np.zeros((a[:, 0].max() - y0 + 3, a[:, 1].max() - x0 + 3), dtype=np.uint8)
    caja[a[:, 0] - y0 + 1, a[:, 1] - x0 + 1] = 255
    lado = max(3, int(d * 0.5) // 2 * 2 + 1)
    return (np.array(Image.fromarray(caja).filter(ImageFilter.MinFilter(lado))) > 127).sum() >= 4

def puntos(mascara, dmin, dmax):
    """Solo componentes redondas y llenas del tamaño de un punto: descarta las letras de «BLOQUEADO» y las líneas."""
    out = []
    for pts in componentes(cerrar(mascara)):
        a = np.array(pts)
        h = a[:, 0].max() - a[:, 0].min() + 1
        w = a[:, 1].max() - a[:, 1].min() + 1
        d = max(h, w)
        if not (dmin <= d <= dmax):
            continue
        if min(h, w) / d < 0.8:
            continue
        if len(pts) / (np.pi * (d / 2) ** 2) < 0.75:
            continue
        if not tiene_nucleo(pts, d):
            continue
        cy, cx = a[:, 0].mean(), a[:, 1].mean()
        out.append((float(cx), float(cy), int(d)))
    return out

rojos = puntos(ROJO, 7, 34)
rosas = puntos(ROSA, 12, 40)
print("rojos:", len(rojos), "rosados:", len(rosas))
esc = 72 / DPI  # píxel → punto tipográfico
def a_pagina(cx, cy):
    return [CLIP.x0 + cx * esc, CLIP.y0 + cy * esc]
json.dump(
    {
        "dpi": DPI,
        "clip": [CLIP.x0, CLIP.y0, CLIP.x1, CLIP.y1],
        "rojos": [a_pagina(cx, cy) + [d * esc] for cx, cy, d in rojos],
        "rosas": [a_pagina(cx, cy) + [d * esc] for cx, cy, d in rosas],
    },
    open(salida, "w"),
)
im = Image.fromarray(img.astype(np.uint8))
dib = ImageDraw.Draw(im)
for cx, cy, d in rojos:
    dib.ellipse([cx - d, cy - d, cx + d, cy + d], outline=(0, 0, 255), width=3)
for cx, cy, d in rosas:
    dib.ellipse([cx - d, cy - d, cx + d, cy + d], outline=(0, 160, 0), width=3)
im.save(png)
