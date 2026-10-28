"""Dibuja pistas (asfalto) y veredas como en el plano de Altos de Sacta: calzada gris, vereda clara pegada a cada manzana y un borde blanco fino.
No hay un dibujo de las calles en el DWG (solo líneas sueltas), así que se deducen de los lotes: el campo de manzanas se rellena con una
operación de cierre (los huecos entre manzanas son las calles) y se le resta la vereda que rodea cada lote.
Uso: python -I scripts/plano/19_vias_veredas.py public/plano/arenas.svg   (después de 16, 17 y 18; se puede repetir)."""
import re, sys
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

RADIO_CIERRE = 70.0  # el campo del conjunto: todo hueco entre manzanas de menos de 140 m es calle o parque
ANCHO_VEREDA = 2.2   # m de vereda entre el lote y la calzada
MARGEN_EXTERIOR = 7  # calle que rodea el conjunto
RADIO_PARQUE = 14.0  # un hueco donde cabe un círculo de este radio no es calle sino parque/plaza (las calles miden 20 m o menos)
AREA_PARQUE = 1500   # m² mínimos para dibujarlo como área verde
COLOR_CALZADA = "#a9aaae"
COLOR_VEREDA = "#ecebe5"
COLOR_PARQUE = "#8db853"

ruta = sys.argv[1]
s = open(ruta, encoding="utf8").read()
s = re.sub(r'<g id="(?:calzadas|veredas|parques-planos)".*?</g><!--/(?:calzadas|veredas|parques-planos)-->\n?', "", s, flags=re.S)

lotes = []
for m in re.finditer(r'<path id="lote-[^"]+" d="([^"]+)"', s):
    n = list(map(float, re.findall(r"-?\d+\.?\d*", m.group(1))))
    lotes.append(Polygon(list(zip(n[0::2], n[1::2]))).buffer(0))
U = unary_union(lotes)

# El casco convexo cierra las bocas abiertas del borde (p. ej. el hueco de abajo, entre las manzanas del centro).
campo = U.buffer(RADIO_CIERRE, join_style=1).buffer(-RADIO_CIERRE, join_style=1)
campo = unary_union([campo, U.convex_hull, U.buffer(MARGEN_EXTERIOR, join_style=1)])
vereda = U.buffer(ANCHO_VEREDA, join_style=1)
huecos = campo.difference(vereda)
gordo = huecos.buffer(-RADIO_PARQUE).buffer(RADIO_PARQUE)
parques = unary_union([p for p in (gordo.geoms if hasattr(gordo, "geoms") else [gordo]) if p.area >= AREA_PARQUE])
calzada = huecos.difference(parques.buffer(0.01))

def d(geom):
    out = []
    for p in (geom.geoms if hasattr(geom, "geoms") else [geom]):
        if p.is_empty or p.geom_type != "Polygon":
            continue
        for anillo in [p.exterior, *p.interiors]:
            c = list(anillo.simplify(0.05).coords)
            out.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in c) + "Z")
    return "".join(out)

capa = (
    f'<g id="calzadas" fill="{COLOR_CALZADA}" fill-rule="evenodd" stroke="#ffffff" stroke-width="0.35" stroke-opacity="0.85" stroke-linejoin="round">'
    f'<path d="{d(calzada)}"/></g><!--/calzadas-->\n'
    f'<g id="parques-planos" fill="{COLOR_PARQUE}"><path d="{d(parques)}"/></g><!--/parques-planos-->\n'
    f'<g id="veredas" fill="{COLOR_VEREDA}" fill-rule="evenodd"><path d="{d(vereda.difference(U))}"/></g><!--/veredas-->\n'
)
# Se quitan las líneas sueltas del DWG (las calles ahora están dibujadas) y la capa nueva va antes de las manzanas y del parque.
s = re.sub(r'<g id="vias-dwg".*?</g>\n?', "", s, flags=re.S)
i = s.index('<image id="parque"') if '<image id="parque"' in s else s.index('<g id="mz-')
s = s[:i] + capa + s[i:]
open(ruta, "w", encoding="utf8").write(s)
