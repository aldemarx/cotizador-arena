# Contexto – Simulador de cuotas Altos de Sacta (para live de TikTok)

> **CAMBIO DE MODELO (3 oct 2026): precios del Excel «COTIZADORES AGOSTO».** Por decisión del equipo, el JSON se regeneró con el modelo del Excel (sin interés), con `python scripts/generar-precios-desde-excel.py "icons/COTIZADORES  AGOSTO.xlsx"`. Las secciones de fórmulas de abajo describen el modelo anterior (con 0.5 % mensual) y **ya no aplican**. Reglas vigentes:
> - `precio con dscto = tarifa × metraje + 1000` (= contado + inicial; es el que se muestra al cliente), `contado = precio con dscto − 2000`, `precio total (tachado) = precio con dscto + 7000`.
> - Inicial 2,000 en dos partes. `cuota fija = contado / 80`, **con decimales** (a céntimos), igual que el Excel; los montos se muestran con céntimos cuando los tienen (384.26) y sin ellos cuando son exactos (2,000).
> - Ascendente y descendente no existen en el Excel: se derivan con ±5 % anual y el mismo total que la fija. **Pendiente de confirmar con ventas.**
> - Verificado contra el Excel: 1,111 de 1,112 lotes coinciden; el 5-574 trae el metraje como texto (#VALUE!) en el Excel y se calcula con 242.89 m².
> - **Plazo elegible (regla A):** el asesor puede cambiar la cantidad de cuotas (12, 24, 36, 48, 60 u 80; por defecto 80) desde el lápiz junto a «Cant. de cuotas». **El total no cambia** (precio con dscto = contado + inicial): solo se reparte en más o menos cuotas, así que no hay ventaja financiera por elegir un plazo corto. Se calcula en el momento (`conPlazo` en `src/lib/altosDeSacta.ts`; plazos en `PLAZOS_CUOTAS` de `src/lib/configCotizacion.ts`) y afecta a las dos pantallas y a las dos imágenes. Los tramos son de 12 meses; con 12 cuotas solo se ofrece la fija. Cuota de 80 cuotas igual a la del Excel; los medios céntimos suben, como en Excel.
> - **Vuelta atrás:** `git checkout checkpoint-precios-modelo-interes -- src/data/precios-altos-de-sacta.json` y `node scripts/migrar-lotes-a-supabase.mjs`.


## 1. Qué es

Simulador para mostrar en vivo. El asesor elige un lote, el cliente ve el precio y su cronograma completo de 80 cuotas. Puede comparar tres modalidades: **fija**, **ascendente** (empieza bajo y sube cada año) y **descendente** (empieza alto y baja cada año).

- Proyecto: Altos de Sacta – Casas de campo (Tercera Etapa, Mz 5 y 6).
- Moneda: soles (S/).
- Datos: `precios_altos_de_sacta.json` trae 1,112 lotes con precios y cuotas **ya calculados**. El simulador solo tiene que leerlos y mostrarlos. Las fórmulas de abajo sirven para verificar o recalcular si cambian los parámetros.

> ## ⚠️ PRUEBA EN CURSO (desde 2026-10-01): inicial fija de S/ 2,000
>
> **Estado: en prueba, pendiente de confirmar con ventas.** Si no se confirma, se vuelve atrás (ver abajo).
>
> - **Por qué:** ventas indicó que la inicial máxima es S/ 2,000. La regla original (`MAX(2000, 5 % del contado)`) dejaba **357 de 1,112 lotes** con inicial de S/ 2,100 a S/ 12,100 (máx. en el 5-440). El 2,000 de esa regla era un *mínimo*, y el porqué del 5 % no estaba documentado en ningún lado.
> - **Qué cambia:** `inicial = 2,000` en los 1,112 lotes (`inicial_mes_1 = 1,000` y `inicial_mes_2 = 1,000`). Se recalculan con la misma fórmula (sección 4) las cuotas de las tres modalidades, `total_cuotas`, `precio_financiado` y `precio_lista` de los **357 lotes** afectados. Los otros 755 ya tenían 2,000 y no cambian. **No cambian:** `precio_contado`, metraje, ubicación ni tarifas por m².
> - **Efecto en el cliente:** al pagar menos de inicial se financia más, así que las cuotas **suben** en los 357 lotes (ninguna baja): mediana +S/ 11 y máximo +S/ 154. Ejemplos: lote 5-1, cuota fija 583 → 585 y lista S/ 57,400 → S/ 57,500; lote 5-440, cuota fija 3,485 → 3,639 y lista S/ 342,300 → S/ 344,900.
> - **La regla principal se mantiene** por construcción: el valor presente de los pagos sigue igualando el contado (sección 2 y fórmula 5).
> - **Cuidado:** el simulador no recalcula nada, solo lee el JSON. La inicial dinámica de la pantalla (completa, 2 o 3 partes) sigue funcionando: con 2,000 queda 2,000 / 1,000 + 1,000 / 1,000 + 500 + 500.
> - **Archivos de la prueba:**
>   - `src/data/precios-altos-de-sacta.json`: datos con la prueba aplicada, versión `2026-10-01-prueba-inicial-2000` y marca `inicial_modo: "fija_2000"`.
>   - `src/data/precios-altos-de-sacta.inicial-5pct.json`: **respaldo** con la regla original, tal como estaba (versión `2026-09-24`).
>   - `scripts/regenerar-precios-altos.mjs`: regenera el JSON con la fórmula oficial. Con `--verificar` comprueba que reproduce los 1,112 lotes del respaldo (resultado: 1,112/1,112).
>   - Etiqueta de git `base-previa-inicial-2000`: el código y los datos justo antes de la prueba.
> - **Cómo volver atrás** (cualquiera de las tres):
>   1. `node scripts/regenerar-precios-altos.mjs --inicial=5pct` restaura el respaldo byte a byte.
>   2. `git checkout base-previa-inicial-2000 -- src/data/precios-altos-de-sacta.json`.
>   3. Copiar `precios-altos-de-sacta.inicial-5pct.json` sobre `precios-altos-de-sacta.json`.
> - **Cómo dejarla definitiva:** quitar este recuadro, dejar `inicial = 2,000` en la tabla y en la fórmula 2 de la sección 4, y borrar el respaldo si ya no hace falta.

## 2. Regla principal (no negociable)

**La empresa nunca pierde.** Un cliente que financia debe dejarle a la empresa, en valor presente, al menos lo mismo que uno que paga al contado. Esto se cumple en las tres modalidades. La ascendente cobra más en total porque el cliente paga más tarde.

Además, ningún lote puede quedar con un precio financiado menor al del cotizador anterior. Esto está verificado: 0 casos.

## 3. Estructura del JSON

```
parametros   → tasa, número de cuotas, tramos, % de variación, inicial, calendario
tarifas_m2   → S/ por m² según ubicación
lotes[]      → un objeto por lote
```

Campos de cada lote:

| Campo | Significado |
|---|---|
| `lote` | ID "MZ-LOTE", ej. `"5-9"`. Es lo que se escribe o busca en el simulador |
| `etapa`, `mz`, `lt` | Datos de ubicación |
| `metraje_m2` | Área del lote |
| `ubicacion` | Categoría (NORMAL, FRENTE A PARQUE, ESQUINA…) |
| `tarifa_m2` | S/ por m² de esa categoría |
| `precio_lista` | Precio de referencia ("precio real"). Se muestra tachado |
| `precio_contado` | Precio pagando todo al contado |
| `inicial` | Inicial total. Se paga en 2 partes: `inicial_mes_1` e `inicial_mes_2` |
| `planes.fija / ascendente / descendente` | `cuotas_por_tramo` (7 valores), `total_cuotas` y `precio_financiado` (inicial + cuotas) |

## 4. Reglas de cálculo

**Parámetros vigentes**

| Parámetro | Valor |
|---|---|
| Tasa mensual | 0.5% (≈ 6.2% anual) |
| Número de cuotas | 80 |
| Tramos | 7: seis de 12 meses y el último de 8 meses (cuotas 73–80) |
| Variación por tramo | +5% ascendente / −5% descendente / 0% fija |
| Inicial | **En prueba: 2,000 fijo** (ver recuadro del inicio). Regla original: 2,000 o el 5% del contado, lo que sea mayor, redondeado a la centena hacia arriba |
| Descuento mostrado vs. lista | 15% |

**Fórmulas**

1. `precio_contado = REDONDEAR.MAS(metraje × tarifa_m2 − 1000, 0)`
2. `inicial = MAX(2000, REDONDEAR.MAS(precio_contado × 5%, -2))` *(regla original; durante la prueba `inicial = 2000` para todos los lotes)*
3. Calendario: `inicial_mes_1` en el mes 0 (firma), `inicial_mes_2` en el mes 1, y la cuota *m* en el mes *m+1*. La cuota 1 se paga en el mes 2 y la cuota 80 en el mes 81.
4. Tramo de la cuota *m*: `k = ENTERO((m − 1) / 12)` → valores de 0 a 6.
5. Cuota base *C*: se despeja para que el valor presente de todos los pagos, a la tasa mensual *i*, sea igual al contado:

   ```
   PV_objetivo = contado − inicial_mes_1 − inicial_mes_2/(1+i)
   C = PV_objetivo / Σ_{m=1..80} [ (1+g)^k(m) / (1+i)^(m+1) ]
   cuota_tramo_k = REDONDEAR.MAS(C × (1+g)^k, 0)
   ```

   `g` vale 0 para la fija, +0.05 para la ascendente y −0.05 para la descendente. Todas las cuotas se redondean hacia arriba al sol entero.
6. `precio_financiado = inicial + Σ cuotas`
7. `precio_lista = REDONDEAR.MAS(precio_financiado_fija / 0.85, -2)`

**Tarifas por m²:** NORMAL 130 · FRENTE A AV 135 · FRENTE A OVALO 145 · ESQUINA 155 · FRENTE A PARQUE 162 · COSTADO PARQUE y combinaciones 165 · ESQUINA FRENTE A PARQUE Y AV. 168.

## 5. Casos de prueba

El simulador debe dar exactamente estos números.

**Lote 5-2 – 250 m², NORMAL.** Contado S/ 31,500 · Inicial S/ 2,000 (1,000 + 1,000) · Lista S/ 44,800

| Tramo (cuotas) | Fija | Ascendente | Descendente |
|---|---|---|---|
| Año 1 (1–12) | 451 | 395 | 514 |
| Año 2 (13–24) | 451 | 415 | 488 |
| Año 3 (25–36) | 451 | 436 | 464 |
| Año 4 (37–48) | 451 | 457 | 441 |
| Año 5 (49–60) | 451 | 480 | 419 |
| Año 6 (61–72) | 451 | 504 | 398 |
| Final (73–80) | 451 | 529 | 378 |
| **Precio financiado** | **38,080** | **38,476** | **37,712** |

**Lote 5-440 – 1,489.18 m², FRENTE A PARQUE.** Contado S/ 240,248 · Inicial S/ 12,100 · Fija 3,485/mes · Ascendente de 3,052 a 4,090 · Descendente de 3,970 a 2,918.

## 6. Qué mostrar en el live

- Buscador de lote (`5-9`), con metraje, ubicación y etapa.
- Precio de lista tachado y, al lado, el precio al contado.
- Selector de modalidad: fija / ascendente / descendente.
- Cronograma de las 80 cuotas con mes y año calendario, a partir de la fecha del día. Conviene un gráfico de barras para que la subida o la bajada se vea en pantalla, y resaltar el cambio de cuota en cada aniversario.
- Resumen: inicial, cuota del primer mes, cuota del último mes y total a pagar.
- Frase útil para el live: *"con la ascendente empiezas pagando S/ 395 y tu cuota sube 5% cada año"*.

## 7. Cuidados

- **No anunciar "sin intereses" ni "0%".** Las cuotas incluyen el costo del financiamiento. Mostrar siempre el total a pagar junto al precio al contado. Conviene que el área legal confirme qué debe informarse según las normas de protección al consumidor (Indecopi).
- **Estado de los lotes:** el tarifario no dice cuáles están vendidos o separados. Antes del live hay que agregar un campo `estado` y cotizar solo los lotes disponibles.
- **Descuento especial:** no va en el live. Requiere autorización y se maneja fuera del simulador.
- **Diferencia con el Excel corregido:** el Excel calculaba la cuota fija como si la cuota 1 se pagara el mes siguiente a la inicial (S/ 449). Aquí se usa el calendario real, con la inicial en 2 meses y la cuota 1 en el mes 2, y la cuota fija queda en S/ 451. **Este JSON es la fuente oficial.**
- **Pendiente por confirmar:** si "5" y "6" son manzanas o sectores, y si COSTADO PARQUE (165) debe costar más que FRENTE A PARQUE (162).
