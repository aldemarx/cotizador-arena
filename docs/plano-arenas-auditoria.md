# Plano de Arenas (DWG): lectura y auditoría contra el Excel

Archivo: `LOTE-35 ENTREGABLE 20-10-26.dwg` (90 MB), convertido a DXF con ODA File Converter (1.1 GB; no se guarda en el repo).
Scripts en `scripts/plano/` (se numeran en el orden de uso; leen el DXF en streaming porque no cabe cargado entero).

## Cómo viene el DWG
- Es una **importación de PDF**: no hay capas de CAD. Todo está en `PDF_Geometry` (2 millones de líneas sueltas), `PDF_Text` (10,647 textos) y `PDF_Solid Fills`. Los bloques y las capas por lote del procedimiento ideal no existen.
- Contiene **Arenas** (manzanas R-1 a R-24) y **Aura** (U-1 a U-28). Aura queda fuera del cotizador.
- Los lotes sí se recuperan: son polígonos cerrados, con el **área escrita adentro** y, en la mayoría, el **número de lote**.

## Resultado
- 1,596 lotes con polígono, área y número (Arenas + Aura). En Arenas, **19 manzanas coinciden por completo con el Excel** (mismo número de lote y mismo metraje salvo lo de abajo): R1, R2, R3, R4, R6, R8, R9, R10, R13, R14, R15, R17, R18, R19, R20, R21, R22, R23, R24 (540 lotes).
- **Actualización:** con los arcos del dibujo y las caras reconstruidas, **597 de los 654 lotes** de Arenas quedan en el plano. R5 y R16 no traen número impreso en todos sus lotes: se numeraron comparando el área escrita (valor exacto) con el Excel y el orden de los vecinos. Comprobación: 569 de 570 pares de lotes consecutivos (n y n+1) quedan pegados en el plano.
- **Los 57 lotes que faltaban ya están dibujados (22 oct):** el plano tiene ahora los **654 lotes** de Arenas. Sus contornos no cierran en el DWG, así que se reconstruyeron a partir del área escrita, la orientación de las líneas vecinas y el rectángulo que mejor calza con el dibujo (`scripts/plano/10` a `15`). Son **aproximados**: la forma exacta puede diferir unos metros del plano de topografía. Afecta a R7 (11 lotes), R11 (20), R12 (24), R13-1 y R18-2.
- **Numeración de esos 57:** por área exacta y vecindad (el lote n junto al n+1). Hay que confirmar con el plano de topografía el orden de los lotes de igual área en estos grupos: **R7-19 a R7-22** (se numeraron de izquierda a derecha, el 19 junto al 14, porque ese tramo no sigue la numeración consecutiva del resto) y los lotes de 200 m² de R11 y R12.

## Metrajes que el plano corrige (26)
En 24 casos el Excel trae 148 m² (error de fórmula `=R2`, ver `pendientes-arenas.md`) y el plano da el área real:

| Lote | Excel | Plano | | Lote | Excel | Plano |
|---|---|---|---|---|---|---|
| R1-1 | 148 | 208.8 | | R18-12 | 148 | 301.0 |
| R1-28 | 148 | 208.8 | | R18-13 | 148 | 300.4 |
| R2-1 | 148 | 295.55 | | R18-23 | 148 | 303.4 |
| R2-12 | 148 | 295.55 | | R19-1 | 148 | 287.6 |
| R13-33 | 148 | 310.6 | | R19-26 | 148 | 301.5 |
| R14-12 | 148 | 248.3 | | R20-1 | 148 | 238.9 |
| R15-1 | 148 | 321.5 | | R21-1 | 148 | 341.0 |
| R16-26 | 148 | 407.2 | | R21-14 | 148 | 374.0 |
| R17-13 | 148 | 220.7 | | R21-28 | 148 | 345.0 |
| R17-24 | 148 | 357.9 | | R23-32 | 148 | 268.9 |
| R18-1 | 148 | 302.3 | | R24-1 / R24-16 / R24-30 | 148 | 227.11 / 300.0 / 227.11 |

- Los 4 primeros coinciden con el Excel de promoción (R1-1, R1-28: 208.8; R2-1, R2-12: 295.55), lo que respalda al plano.
- Otra diferencia: **R22-6 y R22-7** (Excel 197, plano 204.33).
- De los 25 lotes con la fórmula errónea, queda sin verificar **R16-14** (no se ubicó en el plano).
- Corregir el metraje cambia el precio de esos lotes (precio = tarifa × metraje).

## Integración en el cotizador
- `public/plano/arenas.svg` (≈370 KB, 654 lotes): mismo formato que el plano ilustrado de Altos de Sacta: `#fondo` (otras etapas en gris —los lotes de Aura— y vías), un `<path id="lote-R4-32">` por lote dentro de `<g id="mz-R4">`, y `#insignias` con un marcador numerado por lote (`g.ins[data-lote]`, `data-m` = dónde va el metraje). Coordenadas en metros.
- `src/components/MapaLotes.tsx` y `src/app/mapa/`: pantalla `/mapa?lote=R4-32` adaptada del plano de Altos (marcadores con número y metraje debajo, mover, acercar con rueda o pellizco, buscador por manzana y lote, filtro por metraje, ficha del lote con «Cotizar este lote» y «Volver al cotizador»).
- `src/components/BotonVerPlano.tsx`: botón flotante «Ver plano» (abajo a la derecha) en el cotizador; lleva al plano con el lote elegido, o al plano completo si aún no se eligió ninguno.
- Se regenera con `scripts/plano/` (01 a 09, en ese orden; trabajan sobre el DXF convertido con ODA File Converter).
- Arenas aún no tiene estados por lote (disponible/separado/vendido): los marcadores son neutros y no hay leyenda.

## Pistas, veredas y áreas verdes (26 oct)
El DWG no trae las calles dibujadas (solo líneas sueltas), así que `scripts/plano/19_vias_veredas.py` las **deduce de los lotes**: cierra los huecos entre manzanas (calle o parque), resta una vereda de 2.2 m alrededor de cada lote y pinta la calzada en gris con borde blanco fino, como en Altos de Sacta. Los huecos donde cabe un círculo de 14 m de radio se pintan como **áreas verdes planas** (no son calles). Son 4: el parque entre R3 y R6 (debajo de la imagen del parque), el de arriba al centro, el de la derecha y el de abajo al centro. Es una **aproximación**: los anchos de calle no son los de topografía y los parques verdes no tienen diseño propio todavía (solo el de R3-R6). Se quitaron las líneas sueltas del DWG (`#vias-dwg`). Orden de los scripts: 16 (girar), 17 (parque), 18 (aligerar), 19 (pistas).

## R11 y R12 rehechas desde el plano PDF de ventas (28 oct)
Los 44 lotes de R11 y R12 que eran rectángulos aproximados se rehicieron con la forma real que trae el PDF de ventas (`19-10-2026 plano arena.pdf`): el PDF dibuja cada lote con líneas azules y la acera verde de la manzana, y cada región blanca entre ellas es un lote.
- `scripts/plano/22_celdas_desde_pdf.py`: saca las celdas (lotes) de una zona del PDF y las pasa a coordenadas del SVG (la misma alineación PDF → SVG de `21_estados_desde_pdf.py`). Las letras grandes del rótulo «R-11/R-12» tapaban tramos de línea y fundían lotes; se curan buscando las rectas visibles (transformada de Hough) y dibujándolas solo bajo las letras.
- `scripts/plano/23_numerar_celdas.py`: numera las celdas de una manzana de dos hileras (1–12 en una, 24–13 en la otra) probando cada sentido y comparando el área de cada celda con el metraje del Excel (coinciden casi siempre dentro del 3 %). Una celda que falta (R12-6, tapada por el rótulo) se reconstruye entre sus vecinos.
- `scripts/plano/24_aplicar_poligonos.py`: reemplaza contornos y marcadores en el SVG. Después hay que volver a correr `19_vias_veredas.py`.
- **Con reservas:** R11-6, R11-18 y R12-18 quedan algo más cortos que su metraje (≈10 %) por el rótulo, y R12-6 es una reconstrucción entre vecinos. Siguen aproximados R7 (11 lotes), R13-1 y R18-2. El orden de los lotes de igual área en R11 y R12 ya no se adivina: sale de la posición en la hilera, anclada por los lotes de área única (R12-1, R12-12, R12-13, R12-24 y sus equivalentes en R11).

### Manzana completa primero, lotes después (R11 y R12, 28 oct)
La primera versión de R11 y R12 (celdas sueltas) dejaba huecos junto al rótulo. Ahora se dibuja primero la manzana entera y luego se reparte entre sus lotes, así la forma de la manzana no depende de cómo salió cada lote:
- `scripts/plano/25_manzana_completa.py`: la manzana es la región del PDF encerrada por su acera verde; cada lote numerado (23) siembra su zona y las zonas crecen hasta llenar toda la manzana. El contorno se alisa (media móvil) y las divisiones entre lotes se enderezan (cada frontera común se reemplaza por su recta y la manzana se vuelve a partir con `polygonize`, de modo que dos lotes vecinos comparten exactamente la misma línea). Un lote cuya recta no encaja (R12-6 y R12-7, tapados por el rótulo) conserva su contorno de píxeles.
- `scripts/plano/27_afinar_alineacion.py` y `28_acomodar_manzanas.py`: ver abajo.
- **El PDF de ventas (19-10) y el DWG (20-10) no coinciden rígidamente.** Probando bloque por bloque, el PDF pide desplazar los lotes del DWG entre 5 y 12 m según la manzana (R13 +7 m, R10 −5 m, R7 ≈ 0). La forma de R11 y R12 sale del PDF, pero su posición se ajusta (desplazamiento y giro de ±1–2°) para que las calles con las manzanas vecinas del DWG midan lo mismo que las demás (≈ 9.5 m). R11 encaja bien (8–9 m); R12 no puede: queda a 6 m de R13 y a 15 m de R14. **Pendiente confirmar con topografía cuál de los dos planos manda en R12–R13–R14.**
- Consecuencia para los estados: los puntos de vendido/bloqueado se ubican con la alineación global PDF → SVG; en manzanas donde ambos planos difieren, un punto puede caer en el lote vecino. Los puntos dudosos ya se revisaron a mano (ver la revisión manual del 28 de octubre), pero conviene comprobar las manzanas R9, R10 y R13.
