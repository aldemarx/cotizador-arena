"""Pasa los puntos del plano PDF de ventas (rojos = vendidos, rosados = bloqueados) a los lotes del SVG.
1. Alinea el plano PDF con el SVG: busca la semejanza (escala, giro, desplazamiento) que más hace coincidir los lotes del SVG con las
   zonas blancas del PDF (intersección sobre unión).
2. Cada punto cae dentro de un lote del SVG; si queda en un borde, se asigna al lote más cercano y se avisa.
Uso: python -I scripts/plano/21_estados_desde_pdf.py <plano.pdf> <puntos.json> <arenas.svg> <salida.json> <comprobacion.png>"""
import sys, re, json
import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFilter
from shapely.geometry import Polygon, Point

pdf, puntos_json, svg, salida, png = sys.argv[1:6]
P = json.load(open(puntos_json))
x0, y0, x1, y1 = P["clip"]

# --- Lotes del SVG
s = open(svg, encoding="utf8").read()
lotes = {}
for m in re.finditer(r'<path id="lote-([^"]+)" d="([^"]+)"', s):
    n = list(map(float, re.findall(r"-?\d+\.?\d*", m.group(2))))
    lotes[m.group(1)] = Polygon(list(zip(n[0::2], n[1::2]))).buffer(0)
print("lotes SVG:", len(lotes))
bx0 = min(p.bounds[0] for p in lotes.values()); by0 = min(p.bounds[1] for p in lotes.values())
bx1 = max(p.bounds[2] for p in lotes.values()); by1 = max(p.bounds[3] for p in lotes.values())

# --- Máscara de lotes del PDF (zonas blancas), a poca resolución
DPI = 60
pix = pymupdf.open(pdf)[0].get_pixmap(dpi=DPI, clip=pymupdf.Rect(x0, y0, x1, y1))
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
blanco = (img.min(axis=2) > 215)
m = Image.fromarray((blanco * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
objetivo = np.array(m) > 127
# Quita el margen blanco exterior (fuera del plano): solo cuenta lo que está rodeado de plano (lo conectado al borde superior se descarta).
H, W = objetivo.shape
print("máscara PDF", W, "x", H)

def mascara_svg(esc, tx, ty, giro):
    """Dibuja los lotes del SVG en la rejilla del PDF: x_pdf = esc*(R·p) + t."""
    c, sn = np.cos(giro), np.sin(giro)
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    for pol in lotes.values():
        pts = [((c * x - sn * y) * esc + tx, (sn * x + c * y) * esc + ty) for x, y in pol.exterior.coords]
        d.polygon(pts, fill=255)
    return np.array(im) > 127

def iou(a, b):
    u = (a | b).sum()
    return (a & b).sum() / u if u else 0

# Valor inicial: cajas envolventes de los lotes (SVG) y de la zona blanca (PDF)
ys, xs = np.nonzero(objetivo)
px0, px1, py0, py1 = np.percentile(xs, 0.5), np.percentile(xs, 99.5), np.percentile(ys, 0.5), np.percentile(ys, 99.5)
# La escala inicial usa la dimensión más restrictiva (si no, el ajuste cae en un óptimo local desplazado una manzana).
esc0 = min((px1 - px0) / (bx1 - bx0), (py1 - py0) / (by1 - by0))
mejor = None
for giro in (0.0,):
    tx0 = (px0 + px1) / 2 - esc0 * (bx0 + bx1) / 2
    ty0 = (py0 + py1) / 2 - esc0 * (by0 + by1) / 2
    est = [esc0, tx0, ty0, giro]
    f = iou(mascara_svg(*est), objetivo)
    paso = [esc0 * 0.04, 10.0, 10.0, 0.02]
    for ronda in range(60):
        mejorado = False
        for i in range(4):
            for sg in (-1, 1):
                cand = est.copy(); cand[i] += sg * paso[i]
                fc = iou(mascara_svg(*cand), objetivo)
                if fc > f + 1e-6:
                    est, f, mejorado = cand, fc, True
        if not mejorado:
            paso = [p / 2 for p in paso]
            if paso[1] < 0.15: break
    print(f"giro inicial {giro}: IoU {f:.3f} · escala {est[0]:.4f} px/m · giro {est[3]:.4f}")
    if mejor is None or f > mejor[0]: mejor = (f, est)
f, (esc, tx, ty, giro) = mejor
print(f"alineación final: IoU {f:.3f}")
if f < 0.5:
    print("¡ATENCIÓN! La alineación es mala: revisa la comprobación antes de usar el resultado.")

# --- Puntos -> lotes
c, sn = np.cos(giro), np.sin(giro)
def pdf_a_svg(xp, yp):
    u, v = ((xp - x0) * DPI / 72 - tx) / esc, ((yp - y0) * DPI / 72 - ty) / esc
    # inversa de la rotación
    return c * u + sn * v, -sn * u + c * v

def asignar(lista):
    res, borde, huerfanos = {}, [], []
    for xp, yp, d in lista:
        x, y = pdf_a_svg(xp, yp)
        pt = Point(x, y)
        dentro = [k for k, pol in lotes.items() if pol.contains(pt)]
        if dentro:
            k = dentro[0]
        else:
            k, dist = min(((k, pol.distance(pt)) for k, pol in lotes.items()), key=lambda t: t[1])
            if dist > 6:
                huerfanos.append((round(x, 1), round(y, 1), round(dist, 1)))
                continue
            borde.append((k, round(dist, 1)))
        res.setdefault(k, 0)
        res[k] += 1
    return sorted(res), borde, huerfanos

rojos, b1, h1 = asignar(P["rojos"])
rosas, b2, h2 = asignar(P["rosas"])
print(f"rojos: {len(P['rojos'])} puntos -> {len(rojos)} lotes (en borde: {len(b1)}, sin lote: {len(h1)})")
print(f"rosados: {len(P['rosas'])} puntos -> {len(rosas)} lotes (en borde: {len(b2)}, sin lote: {len(h2)})")
dobles = len(P["rojos"]) - len(b1) - len(h1) - len(rojos)
print("lotes con más de un punto rojo:", dobles)
json.dump({"alineacion": {"iou": f, "escala": esc, "tx": tx, "ty": ty, "giro": giro}, "vendidos": rojos, "bloqueados": rosas,
           "en_borde": {"rojos": b1, "rosas": b2}, "sin_lote": {"rojos": h1, "rosas": h2}}, open(salida, "w"), indent=1)

# --- Comprobación visual: lotes del SVG sobre el PDF; vendidos en rojo, bloqueados en rosa
ESC_V = 4  # ampliación de la comprobación
big = pymupdf.open(pdf)[0].get_pixmap(dpi=DPI * ESC_V, clip=pymupdf.Rect(x0, y0, x1, y1))
vista = Image.frombytes("RGB", (big.width, big.height), big.samples).convert("RGBA")
capa = Image.new("RGBA", vista.size, (0, 0, 0, 0))
d = ImageDraw.Draw(capa)
for k, pol in lotes.items():
    pts = [((c * x - sn * y) * esc + tx, (sn * x + c * y) * esc + ty) for x, y in pol.exterior.coords]
    pts = [(a * ESC_V, b * ESC_V) for a, b in pts]
    col = (255, 0, 0, 120) if k in rojos else (255, 0, 160, 120) if k in rosas else None
    d.polygon(pts, fill=col, outline=(0, 90, 255, 200))
Image.alpha_composite(vista, capa).convert("RGB").save(png)
