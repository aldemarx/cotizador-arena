"""Pasa las medidas de linderos de «medidas arenas del valle.xlsx» (hoja «Lotes») a src/data/arenas-medidas.json, por código de lote («R4-17»).
Son datos del plano (sin precios): el plano general los muestra como información del lote.
Uso: python -I scripts/generar-medidas.py "<medidas arenas del valle.xlsx>" """
import json
import sys

import openpyxl

xlsx = sys.argv[1]
salida = {}
for r in openpyxl.load_workbook(xlsx, data_only=True)["Lotes"].iter_rows(min_row=2, values_only=True):
    if not (r[0] and str(r[0]).startswith("R-")):
        continue
    clave = f"{r[0].replace('-', '')}-{int(r[1])}"
    salida[clave] = {
        "frente": r[4],
        "fondo": r[5],
        "derecha": r[6],
        "izquierda": r[7],
        "chaflan": r[8],  # None si el lote no tiene chaflán
        "perimetro": r[10],
    }
json.dump(salida, open("src/data/arenas-medidas.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(len(salida), "lotes")
