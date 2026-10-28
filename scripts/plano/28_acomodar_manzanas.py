"""Acomoda en el marco del DWG las manzanas dibujadas desde el PDF (25_manzana_completa.py).
El PDF de ventas (19-10) y el DWG (20-10) no coinciden rígidamente: entre manzanas vecinas hay desfases de 5 a 12 m. La FORMA de la manzana sale del PDF,
pero su POSICIÓN debe encajar con las manzanas del DWG que la rodean. Se desplaza cada manzana (sin girarla ni deformarla) hasta que las calles con
sus vecinas valgan lo que valen las demás calles del plano (≈ 9.5 m).
Uso: python -I scripts/plano/28_acomodar_manzanas.py <arenas.svg con las manzanas vecinas del DWG> <calle_m> <manzana:vecinas,...> <full-R11.json> <full-R12.json> ...
Ejemplo de manzana:vecinas: R11:R10,R15,R7,R12  R12:R7,R13,R14,R15,R11   (las vecinas que también se acomodan se mueven en la misma pasada)
Sobrescribe cada json con los polígonos desplazados y escribe el desplazamiento aplicado."""
import sys, re, json
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely import affinity

svg, calle, vecinos, *archivos = sys.argv[1:]
CALLE = float(calle)
vec = {par.split(":")[0]: par.split(":")[1].split(",") for par in vecinos.split()}
s = open(svg, encoding="utf8").read()
fijas = {}
for m in re.finditer(r'<path id="lote-([^"]+)" d="([^"]+)"', s):
    n = list(map(float, re.findall(r"-?\d+\.?\d*", m.group(2))))
    fijas.setdefault(m.group(1).split("-")[0], []).append(Polygon(list(zip(n[0::2], n[1::2]))).buffer(0))
fijas = {k: unary_union(v) for k, v in fijas.items()}
datos = {}
for a in archivos:
    d = json.load(open(a))
    datos[d["manzana"]] = (a, d, unary_union([Polygon(c).buffer(0) for c in d["poligonos"].values()]))
desp = {M: np.zeros(2) for M in datos}
giro = {M: 0.0 for M in datos}  # grados, alrededor del centro de la manzana

def geom(M):
    g = affinity.rotate(datos[M][2], giro[M], origin=datos[M][2].centroid)
    return affinity.translate(g, *desp[M])

def costo(M):
    t = 0.0
    for v in vec[M]:
        g = geom(v) if v in datos else fijas[v]
        t += (geom(M).distance(g) - CALLE) ** 2
    return t

for _ in range(6):
    for M in datos:
        mejor = (costo(M), *desp[M], giro[M])
        for th in np.arange(giro[M] - 4, giro[M] + 4.01, 0.5):
            for dx in np.arange(desp[M][0] - 10, desp[M][0] + 10.01, 1.0):
                for dy in np.arange(desp[M][1] - 10, desp[M][1] + 10.01, 1.0):
                    a_d, a_g = desp[M].copy(), giro[M]
                    desp[M][:], giro[M] = (dx, dy), th
                    c = costo(M)
                    desp[M][:], giro[M] = a_d, a_g
                    if c < mejor[0]:
                        mejor = (c, dx, dy, th)
        desp[M][:], giro[M] = (mejor[1], mejor[2]), mejor[3]
for M in datos:
    print(f"{M}: desplazamiento ({desp[M][0]:.1f}, {desp[M][1]:.1f}) m, giro {giro[M]:.1f}° · calles con sus vecinas:",
          {v: round(geom(M).distance(geom(v) if v in datos else fijas[v]), 1) for v in vec[M]})
    a, d, _ = datos[M]
    centro = datos[M][2].centroid
    def mover(c):
        g = affinity.translate(affinity.rotate(Polygon(c), giro[M], origin=centro), *desp[M])
        return [[round(x, 2), round(y, 2)] for x, y in g.exterior.coords]
    d["poligonos"] = {lt: mover(c) for lt, c in d["poligonos"].items()}
    d["desplazamiento"] = [float(desp[M][0]), float(desp[M][1]), float(giro[M])]
    json.dump(d, open(a, "w"))
