# Envío de la cotización por WhatsApp

El botón **Enviar** (cabecera de la tarjeta del lote) genera **2 imágenes PNG** y abre el menú de compartir del sistema, para mandarlas desde el WhatsApp del asesor como un álbum de dos fotos. Nada se envía automáticamente ni se guarda en un servidor.

- **Cara 1:** lote, metraje, ubicación, etapa, fraccionamiento (cuota, cantidad de cuotas, precios, inicial).
- **Cara 2:** Fija / Ascendente / Descendente año por año, con los meses `(12*)` y `(8*)` y su nota.
- **Fecha de emisión:** un texto pequeño y gris bajo el título, arriba a la derecha (ej. `02 oct 2026 · 13:40`). Ya no hay pastilla verde en el pie ni vigencia.
- **Pie de ambas:** redes sociales y © de Ceinys. La **lámina 1** añade, sobre las redes, el aviso: *"Propuesta económica sujeta a disponibilidad de lote y firma de contrato de compraventa. No genera reserva vinculante sin el pago de la inicial."* (19 px: a 10 px una letra en una imagen de 1080 px se vería de ~4 px en el celular).
- **Archivos:** `src/components/EnviarCotizacion.tsx` (botón y flujo), `FichaCotizacion.tsx` (diseño de las imágenes), `ModalDatosCliente.tsx` (pop-up).
- **Vista previa en pantalla (solo desarrollo):** `http://localhost:3000/ficha`. Acepta `?lote=5-440&inicial=tres&zoom=1&formato=cuadrado&nombre=Ana%20Pérez&dni=74123456`. En producción esa ruta no existe.

## ⚠️ Pruebas en curso (desde 2026-10-02)

Los dos interruptores están en **`src/lib/configCotizacion.ts`**. Cada uno se revierte cambiando una línea.

| Prueba | Interruptor | Valor actual | Para volver al comportamiento anterior |
|---|---|---|---|
| **Formato más alto** | `FORMATO_FICHA` | `"vertical"` (1080 × 1760) | `"cuadrado"` (1080 × 1350, 4:5, el formato original) |
| **Pedir nombre y DNI** | `PEDIR_DATOS_CLIENTE` | `true` | `false`: el botón envía directo, sin pop-up y sin datos en la imagen |
| DNI parcialmente oculto | `ENMASCARAR_DNI` | `false` (se muestra completo) | `true` imprime `74••••56` |

### Formato vertical
Se sube el alto de 1350 a **1760 px**. Con la franja del cliente, los espaciados más holgados y el aviso legal, la lámina 1 en 1620 px dejaba los bloques a solo ~13 px entre sí (8 px con un nombre largo); con 1760 quedan ~31 px (26 px con nombre largo). WhatsApp reduce el lado mayor a unos 1600 px, así que la imagen se ve un 9 % más chica, sin perder legibilidad. El espacio entre bloques se reparte solo según la altura disponible, de modo que nada se solapa con nombres de una o dos líneas.

**Formato `cuadrado` (el anterior, 1080 × 1350):** se conserva compactado (espaciados al 70 %) y **sin el aviso legal de la lámina 1**, porque no hay altura para él. Con la franja del cliente sigue cabiendo (separación mínima de 13 px).

### Nombre y DNI del cliente
- Al tocar **Enviar** se abre un pop-up con el estilo del que pide el correo para el brochure en la web (fondo difuminado, tarjeta blanca de 420 px, etiquetas en mayúsculas, botón de ancho completo).
- **Validaciones:** nombre de al menos 5 caracteres con letras (se descartan números y símbolos al escribir); DNI de exactamente 8 dígitos (acepta pegar `74.123.456`). Cierra con Esc, con la X o al tocar el fondo.
- **Dónde se imprimen:** una franja de dos columnas, **TITULAR / CLIENTE** (nombre en mayúsculas) a la izquierda y **DNI / DOCUMENTO** a la derecha. En la **lámina 1** va entre la caja MZ · LOTE y los 3 recuadros azules (metraje, ubicación, etapa); en la **lámina 2** va bajo el título. Va en las dos imágenes para que cada una se entienda sola si se reenvía por separado.
- **Flujo:** los datos se conocen recién al enviar, así que las imágenes se generan en ese momento. Se intenta abrir el menú de compartir de inmediato; si Safari ya venció el permiso (es lo normal en iPhone), el pop-up pasa a **"Cotización lista"** con las 2 miniaturas para revisar y un botón **Compartir por WhatsApp**, que sí cuenta como un toque nuevo. Sin menú de compartir (escritorio) descarga los 2 PNG.
- **Los datos no se guardan:** viven solo en memoria mientras el pop-up está abierto y se borran al cerrarlo. El nombre de los archivos no incluye datos del cliente (`cotizacion-altos-de-sacta-mz5-lote1-1de2.png`).

### Orden tipográfico de las imágenes
La ficha usa **6 niveles** definidos en el objeto `TIPO` de `FichaCotizacion.tsx` (antes había 16 tamaños de letra sueltos). Los **pesos y colores son los del proyecto** (grises cálidos y acentos azul / verde / naranja): el contraste lo da el peso, no el color.

| Nivel | Tamaño | Peso | Dónde |
|---|---|---|---|
| H1 | 56 px | extrabold | el lote (MZ 5 · LOTE 1) |
| Cifra protagonista | 68 px | extrabold | S/ 585 · 80 cuotas |
| Dato | 32 px | bold | precios, inicial, valores de la tabla, nombre y DNI |
| Medio | 26 px | semibold | etiquetas de fila, "/ mes", textos de apoyo |
| Eyebrow | 20 px | semibold · mayúsculas · tracking amplio | etiquetas sobre los datos (gris, azul en los recuadros del lote) |
| Legal | 19 px | normal | aviso legal, nota de meses, derechos reservados |

Se probó antes una escala en `slate` con pesos más parejos (H1 bold, datos semibold): quedaba ordenada pero plana y con colores ajenos al proyecto, así que se descartó. Esa versión no se conserva; el estado anterior a todo esto está en la etiqueta `checkpoint-ficha-antes-de-tipografia`.

### Escritorio: descargar o copiar (prueba)
En una computadora, el menú de compartir del navegador abre el selector del sistema, que exige tener la aplicación de WhatsApp instalada y no siempre acepta 2 imágenes. Por eso, **en escritorio no se usa**: tras generar, el pop-up muestra las 2 imágenes y ofrece
- **Descargar las 2 imágenes** (dos PNG; el navegador puede pedir permiso para descargas múltiples la primera vez);
- **Copiar imagen 1 / Copiar imagen 2**: el portapapeles solo admite **una imagen a la vez**, así que son dos botones; se pegan con Ctrl+V en el chat de WhatsApp Web;
- **Abrir WhatsApp Web** (`web.whatsapp.com`, en una pestaña nueva).

Teléfonos y tabletas (incluido iPad, que Safari presenta como un Mac táctil) siguen con el menú de compartir. Si el navegador no puede copiar imágenes (Firefox antiguo), se ocultan los botones de copiar y queda la descarga.

**Vuelta atrás:** `COMPARTIR_EN_ESCRITORIO = true` en `src/lib/configCotizacion.ts` restaura el menú de compartir también en escritorio.

### Pendiente de validar fuera del código
- **Protección de datos (Ley 29733):** se está recogiendo un DNI. Conviene que quien lleve lo legal confirme el texto de la línea del pop-up ("Los datos se usan solo para emitir esta cotización y no se guardan en el simulador") y si hace falta un consentimiento expreso. Al ser una imagen, el DNI puede reenviarse; `ENMASCARAR_DNI` reduce ese riesgo.
- **Probar en un iPhone real con HTTPS:** el menú de compartir con archivos no existe en `http://` de red local.
- **Precios:** las imágenes llevan los de la prueba de inicial de S/ 2,000 (ver `docs/contexto-simulador-altos-de-sacta.md`).

## Cuentas de pago como imagen
En la sección «Cuentas para tu pago» hay un botón que genera **una imagen** (1080×1760, misma cabecera, tipografía y pie que la cotización) con las cuentas de BanBif e Interbank y el titular.
- **Teléfono / tableta:** «Enviar cuentas» abre el menú de compartir (WhatsApp).
- **Escritorio:** «Descargar cuentas» baja `cuentas-de-pago-ceinys.png`.

No pide datos del cliente. Las cuentas salen de `src/lib/cuentasDePago.ts` (la misma fuente que la sección de la página); la lámina es `FichaCuentas` en `FichaCotizacion.tsx` y el botón `EnviarCuentas.tsx`. Las piezas comunes de captura están en `src/lib/capturaFicha.ts`.
