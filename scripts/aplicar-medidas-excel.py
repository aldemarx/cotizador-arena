"""Aplica al JSON de lotes la lista de medidas nueva («medidas arenas del valle.xlsx», hoja «Lotes»): metraje (área) y ubicación.
Ubicaciones que quedan: FRENTE AL PARQUE · ESQUINA - FRENTE AL PARQUE · ESQUINA · ESTÁNDAR (sin «estándar - frente al parque»);
la marca «- AV PRINCIPAL» que ya traían algunos lotes se conserva (el Excel no considera avenidas).
Precio: precio_lista = metraje × tarifa. Si la ubicación cambia de categoría, la tarifa pasa a ser la de los demás lotes de esa
manzana con la misma categoría. Los lotes con promoción NO se reprecian (su promoción viene del Excel comercial): se listan aparte.

Uso: python -I scripts/aplicar-medidas-excel.py "<medidas arenas del valle.xlsx>" [--aplicar]
Sin --aplicar solo muestra los cambios. Después: node scripts/migrar-lotes-a-supabase.mjs (sube el JSON a Supabase).
"""
import collections
import json
import sys

import openpyxl

xlsx = sys.argv[1]
aplicar = "--aplicar" in sys.argv
RUTA = "src/data/arenas-lotes.json"

BASE = {
    "Frente a parque": "FRENTE AL PARQUE",
    "Esquina frente a parque": "ESQUINA - FRENTE AL PARQUE",
    "Esquina": "ESQUINA",
    "Estándar": "ESTÁNDAR",
}


def r2(x):
    return round(x + 1e-9, 2)


def categoria(u):
    esq, par = "ESQUINA" in u, "PARQUE" in u
    return "Esquina frente a parque" if esq and par else "Frente a parque" if par else "Esquina" if esq else "Estándar"


datos = json.load(open(RUTA, encoding="utf8"))
J = {l["lote"]: l for l in datos["lotes"]}

excel = {}
for r in openpyxl.load_workbook(xlsx, data_only=True)["Lotes"].iter_rows(min_row=2, values_only=True):
    if r[0] and str(r[0]).startswith("R-"):
        excel[f"{r[0].replace('-', '')}-{int(r[1])}"] = (r[3], float(r[9]))
assert set(excel) == set(J), "los lotes del Excel y del JSON no coinciden"

# tarifa por (manzana, categoría) de los lotes que NO cambian de categoría
tarifas = collections.defaultdict(collections.Counter)
for k, l in J.items():
    if categoria(l["ubicacion"]) == excel[k][0]:
        tarifas[(l["mz"], excel[k][0])][l["tarifa_m2"]] += 1

cambios = collections.defaultdict(list)
sin_tarifa, con_promo = [], []
for k, l in J.items():
    cat, area = excel[k]
    viejo_u, viejo_m = l["ubicacion"], l["metraje_m2"]
    nueva_u = BASE[cat] + (" - AV PRINCIPAL" if "AV PRINCIPAL" in viejo_u and cat in ("Esquina", "Estándar") else "")
    if "AV PRINCIPAL" in viejo_u and cat in ("Frente a parque", "Esquina frente a parque"):
        print("AVISO", k, "tenía AV PRINCIPAL y el Excel dice", cat, "→ se usa la categoría del Excel")
    cambia_cat = categoria(viejo_u) != cat
    cambia_u = nueva_u != viejo_u
    cambia_m = abs(area - viejo_m) > 0.005
    if not (cambia_u or cambia_m):
        continue
    tarifa = l["tarifa_m2"]
    if cambia_cat:
        opciones = tarifas.get((l["mz"], cat))
        if opciones:
            tarifa = opciones.most_common(1)[0][0]
        else:
            sin_tarifa.append(k)
    lista = r2(area * tarifa)
    inicial = l["inicial"]
    nuevo = dict(ubicacion=nueva_u, metraje_m2=area, tarifa_m2=tarifa)
    if l.get("promocion"):
        nuevo["tarifa_m2"] = l["tarifa_m2"]  # la promoción trae sus propios precios: no se toca la tarifa
        if cambia_cat or cambia_m:
            con_promo.append((k, viejo_u, nueva_u, viejo_m, area, l["tarifa_m2"], tarifa))
    else:
        nuevo.update(precio_lista=lista, precio_contado=r2(lista - inicial), cuota_60=r2((lista - inicial) / 60), cuota_80=r2((lista - inicial) / 80))
    for campo, valor in nuevo.items():
        if l.get(campo) != valor:
            cambios[k].append((campo, l.get(campo), valor))
    if aplicar:
        l.update(nuevo)

print(f"{len(cambios)} lotes cambian")
solo_u = [k for k, c in cambios.items() if any(x[0] == "ubicacion" for x in c) and not any(x[0] == "metraje_m2" for x in c)]
print("solo etiqueta de ubicación:", len(solo_u))
for k, c in cambios.items():
    pr = [x for x in c if x[0] == "precio_lista"]
    if pr:
        print(f"  {k}: m² {J[k]['metraje_m2'] if not aplicar else ''} precio {pr[0][1]} → {pr[0][2]}" + (f" · tarifa {[x for x in c if x[0]=='tarifa_m2']}" if any(x[0] == 'tarifa_m2' for x in c) else ""))
print("\nCon promoción y cambio de categoría o de área (solo se actualizan metraje y ubicación; precio y tarifa NO cambian; revisar con ventas):")
for t in con_promo:
    print("  ", t)
print("\nSin tarifa de referencia en su manzana (se mantuvo la tarifa):", sin_tarifa)

if aplicar:
    json.dump(datos, open(RUTA, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("\nJSON actualizado.")
