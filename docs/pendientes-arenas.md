# Arenas del Valle: consolidación de precios y pendientes

## Fuentes y regla de consolidación

| Archivo | Papel |
|---|---|
| `ARENAS Y AURA (1).xlsx` | **Completo y base.** Solo se usa la hoja ARENAS (654 lotes). La hoja AURA (U1 y U2) es otro proyecto y queda fuera. |
| `PRECIOS PROMOCION ARENAS 2905 - JUN JUL 2026.xlsx` | **Solo lotes con promoción especial.** 189 lotes (129 Standard y 60 Preferencial), todos existen en el completo. |

Regla: el completo manda en metraje, ubicación, precio lista, contado e inicial. En los lotes repetidos se **añaden** las condiciones de promoción (precio real, precio con descuento, promoción contado y promoción financiado). Los nombres de ubicación son los del completo (p. ej. «ESTÁNDAR - AV PRINCIPAL»; la promoción escribe solo «AV PRINCIPAL»).

Resultado: `src/data/arenas-lotes.json` y `datos/ARENAS-consolidado.xlsx`, generados con `scripts/consolidar-arenas.py`.
**138 lotes con promoción aplicada** (84 Standard, 54 Preferencial) y **51 lotes con pendientes** (se quedan con los valores del completo, sin promoción).

Verificación: en los 138 lotes, el «precio al contado» de la promoción es idéntico al del completo (el script falla si no).

## Pendientes

1. **Metraje de 4 esquinas (R1-1, R1-28, R2-1, R2-12).** El completo trae 148 m², que es la tarifa por m² y no un área. La promoción dice 208.8 m² (R1-1, R1-28) y 295.55 m² (R2-1, R2-12). Se dejó el metraje del completo; hay que confirmar el real con ventas. Si es el de la promoción, cambian también el precio lista y el contado.
2. **21 esquinas más con 148 m² exactos en el completo.** Causa confirmada en las fórmulas: en esos 25 lotes (estos 21 y los 4 de arriba) la celda de metraje (columna D) es la fórmula `=R2`, que apunta a la tarifa de ESQUINA (148) en vez de contener el área. Falta el área real de cada uno: R13-33, R14-12, R15-1, R16-14, R16-26, R17-13, R17-24, R18-1, R18-12, R18-13, R18-23, R19-1, R19-26, R20-1, R21-1, R21-14, R21-28, R23-32, R24-1, R24-16, R24-30.
3. **R4-16 y R4-17: ubicación y tarifa.** Completo: «ESQUINA - AV PRINCIPAL» a 153/m² (S/ 40,529.70). Promoción: «ESQUINA» a 148/m² (S/ 43,205.20 con descuento). Se dejó el completo, sin promoción.
4. **R8 y R10, promoción Standard incompleta (45 lotes).** En la promoción solo traen el precio con descuento y fórmulas a medias; faltan precio real, contado, inicial y cuota. Se dejaron con los valores del completo y sin promoción. Lotes: R8-2 al R8-15, R8-18 al R8-22, R8-28 al R8-31 (23) y 22 lotes de R10.

## Dudas del modelo (antes de conectar el simulador)

- **60 u 80 cuotas.** Son dos planes distintos y los Excel los tratan así:
  - *Completo* (654 lotes): `cuota_60 = contado / 60` y `cuota_80 = contado / 80`, con inicial de S/ 2,000 en ambos. Ej. R3-2: contado 17,200 → 286.67 a 60 cuotas y 215.00 a 80 cuotas.
  - *Promoción Standard* (84 lotes con dato): la columna «60 cuotas» = `(promoción financiado − inicial) / 60`. Ej. R3-2: (14,900 − 2,000) / 60 = 215.00; R1-2: (18,625 − 2,000) / 60 = 277.08. Es una cuota a **60 cuotas** sobre un precio promocional menor, no una cuota a 80.
  - *Promoción Preferencial* (54 lotes): sin plan financiado («No aplica»); solo contado.
  - **Propuesta (pendiente de visto bueno):** la promoción Standard se muestra como un bloque fijo a 60 cuotas (así está definida en el Excel: precio promocional y 60 meses van juntos). El resto de los plazos sale del plan normal del completo, donde la cantidad de cuotas sí es un parámetro (celdas K1 y M1; hoy 60 y 80).
  - Falta definir: qué plazos normales se ofrecen, y si un lote en promoción ve además su cuota normal.
- **Promoción contado y promoción financiado:** hay que confirmar con ventas cómo se explican al cliente y si reemplazan o acompañan al contado y a las cuotas normales. En Preferencial, «promoción financiado» dice «No aplica» (queda `null`).
- **Qué es parámetro y qué está fijo en el Excel completo:** son parámetros editables la inicial (R10 = 2,000), el descuento al contado (R9 = 2,000) y las cuotas (K1 y M1). Las tarifas por m² de cada ubicación (R2:R7) vienen de un libro externo («PRECIOS PROMEDIOS») que no está entre los archivos: por eso se tomaron los valores ya calculados. En la promoción, en cambio, todo está escrito a mano en cada fila (los 60 meses, las tarifas `=14900/160`, el 10 % del Preferencial).
- Estado de los lotes (libre, separado, vendido): ningún Excel lo trae.

## Decisiones tomadas al conectar el simulador (revisar)

- **Datos:** `src/lib/arenas.ts` lee `src/data/arenas-lotes.json`. Precio con dscto = precio de lanzamiento del Excel; contado = precio con dscto − 2,000; inicial 2,000 en dos partes de 1,000 (la forma de pago se puede cambiar en pantalla).
- **Cuotas:** solo cuota **fija**; ascendente y descendente no existen en el Excel de Arenas y no se ofrecen. Plazos elegibles: **60 y 80** (los dos del Excel completo); por defecto 80.
- **Promoción:** tarjeta aparte, fija a 60 cuotas (`PLAZO_PROMOCION`), solo en los 138 lotes con promoción aplicada. Standard muestra promoción al contado, promoción financiada y cuota promocional; Preferencial solo promoción al contado.
- **«Precio total» (tachado):** en los 138 lotes de promoción es el «precio real» del Excel. En el resto es **precio con dscto + 4,000**, regla inferida de que en todos los lotes de promoción el precio real = precio con dscto + 4,000. Confirmar con ventas.
- **Etapa:** el Excel completo no la trae (la promoción dice «Primera etapa» solo para sus lotes), por eso no se muestra.
- **Manzanas:** se eligen con un desplegable (R1 a R24).
- **Imagen de WhatsApp:** aún no incluye la promoción; muestra el plan normal.
- **Sin tocar todavía:** fotos y textos de los carruseles (Club House y bondades), cuentas de pago y textos legales siguen siendo los de Altos de Sacta.

## Actualización con los cambios recientes de Altos de Sacta (22 oct)
Se trajeron al cotizador de Arenas los cambios de interfaz hechos en `simulador-precios` desde el 6 de octubre: textos y cifras más grandes en escritorio, cajas de «Precio total» y «Precio con dscto», lista de coincidencias con más espacio, URL con `?lote=` (el lote en pantalla queda en la dirección), botón «Ver plano» y plano `/mapa`, y en la cotización: PDF, tres imágenes (ficha, opciones y cuentas de pago), cliente con celular opcional y botón de WhatsApp.
A confirmar para Arenas:
- **«(sin intereses)»:** la ficha de la cotización lo dice (viene de Altos). Confirmar con ventas que aplica a Arenas.
- **Cuentas de pago:** la tercera imagen usa las cuentas que ya traía la plantilla (Altos de Sacta). Faltan las de Arenas.
- **Promoción:** la ficha y el PDF todavía no la incluyen.
- No se trajeron: login de asesores, panel de administración, estados de lote ni modo sin conexión (dependen de Supabase).
