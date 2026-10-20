# Plantilla de cotizador (marca blanca)

Guía para reutilizar el cotizador de Altos de Sacta como **punto de partida de un cotizador para cualquier nicho**: el inmobiliario es de los más complejos (precio por m², inicial fraccionada, cuotas que cambian por tramos, estado de cada lote), así que lo que ya está resuelto aquí sirve de base para otros rubros.

> **Alcance.** Esta guía describe la parte **pública y estática** del cotizador: sin base de datos y sin panel de administración. Esas piezas (Supabase, `/admin`, usuarios) viven en el mismo repo pero **no forman parte de la plantilla**; al final está la lista de lo que hay que quitar.
>
> **Estado.** Es documentación del repo actual. Todavía **no existe un repo-plantilla extraído y probado**: el primer paso práctico es crearlo siguiendo la sección 9.

---

## 1. Qué resuelve

Un asesor elige un producto (aquí, un lote), el cliente ve **precio, inicial y cuotas** en una pantalla pensada para mostrarse en vivo, y el asesor le envía por WhatsApp **una cotización en imagen** y las **cuentas de pago**. Todo funciona igual en celular, tableta y escritorio.

Piezas de la experiencia:

| Pieza | Para qué sirve |
|---|---|
| Encabezado de marca | Logo de la empresa, nombre de la plataforma, indicador «Sistema en vivo». |
| Selector de producto | Filtro por grupo (manzana) + buscador numérico + lista de coincidencias. |
| Tarjeta de precio | Precio con descuento, precio tachado, inicial y su forma de pago. |
| Cuotas | Cuota mensual grande, cantidad de cuotas editable (lápiz + lista), vista alterna con las opciones (fija / ascendente / descendente) y barras por tramo. |
| Enviar cotización | Genera 2 imágenes (PNG) y abre el menú de compartir del teléfono; en escritorio las descarga o copia. |
| Showcase de beneficios | Dos carruseles con foto, ícono y texto (Club House y bondades del proyecto). |
| Cuentas de pago | Bancos, número de cuenta y CCI con botón de copiar, y botón para enviarlas como imagen. |
| Pie | Datos legales y redes sociales. |

---

## 2. Tecnologías

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** | Página servida desde el servidor, rutas de archivos, despliegue directo en Vercel. |
| Lenguaje | **TypeScript** | El modelo de datos (lote, plan, cuotas) tiene muchos números; los tipos evitan errores de unidad. |
| Estilos | **Tailwind CSS 4** + variables CSS en `globals.css` | Diseño plano y consistente; los colores de marca viven en un solo sitio. |
| Tipografía | **Montserrat** (`next/font/google`) | Una sola familia, pesos 400–800. |
| Imágenes de la cotización | **html-to-image** | Convierte un bloque HTML oculto en PNG, con la misma tipografía de la página. |
| Compartir | **Web Share API** + portapapeles + descarga | WhatsApp en teléfono; copiar/descargar en escritorio. |
| Hosting | **Vercel** | Cada `push` a `main` se despliega solo. |
| Datos (versión sin base) | **Un archivo JSON** en `src/data/` | Los precios ya vienen calculados; la app solo los lee. |

Sin librerías de gráficos, carruseles ni componentes: los carruseles, las barras, los menús emergentes y los popups están hechos con React y Tailwind. Dependencias de la plantilla: `next`, `react`, `react-dom`, `html-to-image` (y las de desarrollo: Tailwind, TypeScript, ESLint).

> En Next 16 el antiguo `middleware.ts` se llama `proxy.ts`, y `cookies()` es asíncrono. `AGENTS.md` del repo pide leer `node_modules/next/dist/docs` antes de escribir código de Next.

---

## 3. Arquitectura

```
src/
  app/
    layout.tsx          Fuente, SiteHeader, Splash; reserva el alto de la barra (--barra-h)
    page.tsx            Compone la página: cotizador + showcase + carrusel + cuentas + pie
    globals.css         Tokens de color/medidas, .card, splash, utilidades
  components/
    Simulador.tsx       Cotizador: selector, tarjetas de datos, cuotas, botón Enviar
    BloqueCuotas.tsx    Cuota grande, selector de cantidad de cuotas, resumen, lista de plazos
    BarrasCuotas.tsx    Comparativo por tramo (una barra por año)
    EnviarCotizacion.tsx / EnviarCuentas.tsx   Generan el PNG y lo comparten
    FichaCotizacion.tsx Lámina que se convierte en imagen (cotización y cuentas)
    ModalDatosCliente.tsx   Popup que pide nombre y DNI antes de generar
    ClubHouseShowcase.tsx / BondadesCarrusel.tsx   Los dos carruseles
    MediosDePago.tsx    Sección de cuentas bancarias
    AjustePantalla.tsx  Escala el bloque principal para que quepa en una pantalla (escritorio)
    SiteHeader.tsx / SiteFooter.tsx / RedesSociales.tsx / Splash.tsx / Soles.tsx
  lib/
    altosDeSacta.ts     Tipos, lectura del JSON, motor de cuotas (conPlazo), formato de montos
    configCotizacion.ts Interruptores y plazos disponibles
    cuentasDePago.ts    Titular, bancos y cuentas
    capturaFicha.ts     Piezas comunes para convertir fichas en PNG y compartirlas
  data/
    precios-*.json      Productos con precios y cuotas ya calculados
public/                 Logos, fotos de beneficios (webp), íconos de bancos
scripts/                Generación del JSON desde el Excel de precios
```

Flujo de datos de la versión sin base: **JSON → `altosDeSacta.ts` (tipos + motor) → `page.tsx` → `Simulador`**. `Simulador` es un componente de cliente que guarda en estado el producto elegido, el grupo, el texto de búsqueda y la cantidad de cuotas; todo lo demás se **deriva** de ahí (`conPlazo` recalcula las cuotas al instante).

### La página (`page.tsx`)

1. `AjustePantalla` envuelve dos columnas: a la izquierda el cotizador (ancho máximo 36 rem), a la derecha `ClubHouseShowcase`.
2. Debajo: `BondadesCarrusel`, `MediosDePago` y el pie legal con redes.
3. El `Splash` (isotipo que se llena de color) cubre la carga inicial.

---

## 4. Modelo de datos y de precios

El cotizador **no calcula precios al vuelo desde cero**: lee productos con el precio base y los planes ya calculados, y solo recalcula **cuántas cuotas** se reparten.

```ts
type Lote = {
  lote: string;            // código único «5-17»
  mz: number; lt: number;  // grupo y número
  metraje_m2: number;
  ubicacion: string;       // texto libre (ej. «Parque / Esquina»)
  tarifa_m2: number;
  precio_lista: number;    // precio tachado
  precio_con_dscto: number;// el que ve el cliente (= contado + inicial)
  precio_contado: number;
  inicial: number;         // + inicial_mes_1 / inicial_mes_2
  planes: Record<"fija" | "ascendente" | "descendente", {
    cuotas_por_tramo: number[]; total_cuotas: number; precio_financiado: number;
  }>;
  plazo?: number;          // cantidad de cuotas de `planes` (por defecto la del proyecto)
  estado?: "libre" | "bloqueado" | "vendido"; // opcional
};
```

Reglas del modelo actual (sustituibles por las de tu nicho):

- `precio con dscto = tarifa × metraje + recargo`; `contado = precio con dscto − inicial`; `precio total (tachado) = precio con dscto + recargo de lista`.
- Inicial fija, repartida en dos pagos (también se puede ver completa o en tres).
- **Cuota fija = contado / N cuotas**, redondeada a céntimos (la mitad de un céntimo sube). Sin interés.
- Ascendente y descendente: ±5 % anual con el **mismo total** que la fija.
- **El total nunca cambia con el plazo.** El asesor elige 12, 24, 36, 48, 60 u 80 cuotas (`PLAZOS_CUOTAS`); solo cambia el reparto. Los tramos son de 12 meses; con 12 cuotas solo existe la fija.
- Los montos se muestran con céntimos solo si los tienen (`384.26`, pero `2,000`).

`conPlazo(lote, plazo)` es la función que hace el reparto; todo el cotizador y las dos imágenes leen su resultado. Detalle completo y verificación contra el Excel en `docs/contexto-simulador-altos-de-sacta.md`.

---

## 5. Responsive: cómo está resuelto

Tres rangos con comportamientos distintos, no uno solo adaptado «a ojo».

**Celular (< 640 px)**
- Columna única; tarjetas de ancho completo con margen de 16 px.
- La cuota grande usa **container queries** (`cqi`): el texto se ajusta al ancho de su tarjeta, no al de la pantalla.
- Alturas **reservadas** para que nada salte al cambiar de producto o de cantidad de cuotas: la lista de barras reserva 7 filas, el resumen de plazos y la nota de tramos reservan su alto aunque cambien de texto.
- Encabezado compacto (logo chico, chip de estado y botones abreviados: «Opciones» en vez de «Ver opciones de cuotas»).

**Tableta / laptop (640–1023 px)**
- Mismo cotizador con tipografías de tamaño fijo (la cuota ocupa 36 px con filas de alto fijo, así se evita que cifras largas desalineen la fila).

**Escritorio (≥ 1024 px)**
- Dos columnas: cotizador (≤ 36 rem) + showcase.
- `AjustePantalla` hace que el bloque principal ocupe **una pantalla completa**: se centra en vertical y, si el alto de la ventana no alcanza, **se reduce proporcionalmente** (mínimo 0.6×); si sobra alto (monitores grandes), **crece** (máximo 1.3×, aprovechando solo la mitad del espacio sobrante). En celular y tableta no hace nada.
- La barra superior mide `clamp(3.5rem, 3.75vw, 5rem)` (`--barra-h`) para no verse enana en pantallas grandes.

Reglas que conviene mantener:
- `html, body { overflow-x: clip }`: nunca hay scroll horizontal (Safari).
- Los campos de texto en celular deben tener 16 px o más, o iOS hace zoom al tocarlos.
- `touch-pan-y` en los carruseles: el dedo puede deslizar el carrusel sin bloquear el scroll vertical de la página.

---

## 6. Carruseles

Son dos y se parecen por dentro, hechos sin librería:

- **`ClubHouseShowcase`** (columna derecha en escritorio): una foto grande con superposición, lista de ventajas con ícono y colores de acento rotativos. Avanza solo cada **4.5 s**.
- **`BondadesCarrusel`** (franja a ancho completo): botones/íconos de cada bondad + foto grande con degradado inferior; en escritorio la foto va al lado de la lista, en celular debajo (`order-2`). También avanza solo con un `setInterval`.

Comportamiento común:
- **Swipe táctil** propio: se guarda el punto inicial del toque y se decide por la diferencia horizontal/vertical si fue un deslizamiento o un scroll.
- Al tocar una opción, el temporizador se **reinicia** para que no salte justo después de elegir.
- Cambio de foto con `opacity` y transición de 700 ms (todas las fotos están montadas; solo una es visible).
- Las fotos son `.webp` en `public/images/…`; los íconos, SVG en línea o PNG usados como máscara (`mask-image`) para que tomen el color del texto.
- Con el temporizador limpio al desmontar (`clearInterval` en el `return` del efecto).

Para otro nicho basta con cambiar las listas `FEATURES` / `BONDADES` (texto, ícono, foto).

---

## 7. Cotización por WhatsApp (imágenes)

1. **`ModalDatosCliente`** pide nombre y DNI (se activa con `PEDIR_DATOS_CLIENTE`). El DNI puede enmascararse (`ENMASCARAR_DNI`).
2. **`FichaCotizacion`** es un bloque HTML fuera de pantalla con la lámina de **1080 × 1760 px**: cabecera de marca, producto, precios, inicial, cuotas, aviso legal y pie. La cotización son **2 láminas** que se envían juntas como álbum (la 1 con el producto y los precios; la 2 con el detalle de cuotas); cada una lleva los datos del cliente para entenderse sola si se reenvía.
3. **`html-to-image`** la convierte en PNG. Para que conserve la tipografía, `capturaFicha.ts` arma el CSS de las fuentes **con los archivos incrustados como data URL** (no deja que la librería recorra todas las hojas de estilo: una hoja de otro origen, p. ej. de una extensión del navegador, lanza `SecurityError`).
4. **Entrega:**
   - Teléfono / tableta → menú de compartir (`navigator.share` con archivos) → WhatsApp.
   - Escritorio → descargar las imágenes o **copiar cada una** para pegarla en WhatsApp Web (`COMPARTIR_EN_ESCRITORIO` vuelve al menú nativo).
5. **Safari exige** que el menú de compartir se abra dentro del toque del usuario. Las **cuentas de pago** (que no dependen del cliente) se preparan en segundo plano antes de pulsar el botón y se regeneran pasados 10 minutos (llevan fecha y hora). La **cotización**, en cambio, necesita nombre y DNI, que solo se conocen al enviar: se genera en ese momento, se intenta abrir el menú y, si el iPhone ya venció el permiso (lo normal), el popup pasa a «Cotización lista» con un botón para compartir. Los datos del cliente viven solo en memoria mientras el popup está abierto; no se guardan.

Lo mismo se usa para **«Enviar cuentas»**: `FichaCuentas` con los bancos y el titular.

Interruptores en `src/lib/configCotizacion.ts` (cada uno se revierte cambiando una línea): formato de la ficha, pedir datos del cliente, enmascarar DNI, compartir en escritorio, plazos de cuotas disponibles.

---

## 8. Cuentas de pago

Todo sale de **`src/lib/cuentasDePago.ts`**: titular, y por banco: nombre, logo, color, y por cuenta: moneda, número y CCI.

- La sección `MediosDePago` muestra cada banco con sus cuentas y un botón **Copiar** en el número y en el CCI (con aviso «Copiado» de 1.6 s).
- `EnviarCuentas` genera la lámina con los mismos datos; es **la misma fuente**, no hay que actualizarlas en dos sitios.
- Para ocultar una cuenta (por ejemplo, la de dólares) se comenta su objeto en el arreglo.

> En la plantilla deja **datos ficticios** (`0000000000`, `000-000-…`). No copies cuentas reales de un cliente a un repo que vayas a reutilizar.

---

## 9. Adaptarlo a otro nicho

### 9.1 Pasos para crear un cotizador nuevo

1. **Copiar el repo** a uno nuevo (sin historial) y renombrar el paquete en `package.json`.
2. **Quitar lo que no es plantilla:** `src/app/admin/`, `src/proxy.ts`, `src/lib/supabase/`, `src/lib/admin/`, `src/lib/lotesSupabase.ts`, `supabase/`, `scripts/migrar-lotes-a-supabase.mjs` y las dependencias `@supabase/*`. En `page.tsx` importar `LOTES` directo del módulo de datos en vez de `cargarLotes()`.
3. **Marca:** reemplazar logos en `public/`, el texto de `SiteHeader` / `SiteFooter` / `layout.tsx` (`title`, `description`) y los tokens de color de `globals.css`.
4. **Datos:** definir el modelo de tu producto (sección 9.2), generar el JSON (el script `generar-precios-desde-excel.py` es un ejemplo de cómo pasar de Excel a JSON) y adaptar `altosDeSacta.ts` (renombrarlo al proyecto).
5. **Cuentas:** actualizar `cuentasDePago.ts` y los logos de bancos.
6. **Beneficios:** cambiar las listas de los dos carruseles y sus fotos.
7. **Ficha:** ajustar textos legales y campos en `FichaCotizacion.tsx`.
8. **Desplegar** en Vercel (importar el repo; sin variables de entorno en la versión sin base).

### 9.2 Qué cambia según el nicho

La estructura (elegir → ver precio → ver cuotas → enviar imagen → cuentas) se mantiene; lo que cambia es **el producto, sus campos y la regla de cuotas**.

| Nicho | «Producto» que se elige | Campos propios | Regla de pago típica |
|---|---|---|---|
| Lotes / terrenos (actual) | Lote en manzana | Metraje, tarifa m², ubicación, estado | Inicial fija + N cuotas sin interés; asc./desc. |
| Departamentos | Unidad en torre y piso | Área, dormitorios, vista, estacionamiento | Separación + cuota inicial + cuotas hasta entrega + saldo con crédito |
| Autos | Versión y color | Año, equipamiento, kilometraje | Cuota inicial + cuotas con TEA + cuota balón |
| Educación | Programa y sede | Duración, horario, matrícula | Matrícula + pensiones mensuales; descuento por pronto pago |
| Seguros / salud | Plan | Cobertura, deducible, edad del asegurado | Prima mensual o anual por tramo de edad |
| Servicios por suscripción | Plan | Beneficios incluidos | Mensual vs. anual con descuento |

Qué tocar para cada caso:
- **Tipo `Lote` → tu tipo** y las etiquetas («Mz y Lote», «Lote», «m²»).
- **Selector:** el filtro por grupo y la búsqueda numérica (`filtrarLotesPorTexto`, `manzanasDisponibles`) se pueden cambiar por filtros de torre, sede o plan.
- **Motor de cuotas:** si hay **interés**, sustituir el reparto simple por el cálculo de cuota con tasa (el repo conserva el modelo con interés en `src/data/precios-altos-de-sacta.modelo-interes.json` y su documentación como referencia).
- **Estados:** si no manejas disponibilidad, quita `estado` y el chip de estado del encabezado.
- **Datos del cliente:** el popup pide nombre y DNI; cámbialo por los campos que tu rubro necesite, o desactívalo.

### 9.3 Principios de diseño que conviene conservar
- Diseño plano: tarjetas blancas de borde fino, sin sombras (ver `DESIGN.md`).
- **Un color por categoría de información** (azul = datos, verde = dinero, gris = utilidad), no colores decorativos.
- Cifras importantes siempre en un tamaño que no cambie al variar el número de dígitos.
- Ningún elemento debe «saltar» al cambiar de producto: reservar alturas.
- Estados **visibles pero sin acción** (un lote vendido se ve, pero no se puede enviar), mejor que ocultarlos.

---

## 10. Trampas ya encontradas (ahórrate el tiempo)

- **Colores con transparencia:** una variable CSS no admite sufijo hexadecimal de alfa (`var(--x)26`); usa `color-mix(in srgb, var(--x) 15%, transparent)`.
- **`html-to-image` y fuentes:** incrusta las fuentes tú mismo (sección 7) o la lámina saldrá con otra tipografía.
- **Safari y compartir:** `navigator.share` debe llamarse dentro del gesto del usuario; prepara los archivos antes, o ten un botón final «lista, compartir» si deben generarse tras el toque.
- **Cifras largas:** un precio de 6 dígitos puede romper una fila diseñada para 4; fija altos de fila y escoge el tamaño de texto según la cantidad de caracteres.
- **Altura cambiante en celular:** reserva el alto máximo de cualquier bloque cuyo contenido varía.
- **Comparar contra el diseño anterior:** para cambios visuales delicados, saca capturas del mismo elemento antes y después y compara píxel a píxel (en el repo se hizo con Playwright + un `git worktree` de la versión anterior); los falsos positivos suelen venir de animaciones (punto «en vivo», barras, carrusel).
- **Redondeo de céntimos:** el Excel redondea la mitad hacia arriba; en JavaScript hay que compensar el error de coma flotante con un épsilon para que coincida.

---

## 11. Lista de verificación antes de entregar un cotizador nuevo

- [ ] Marca: logos, colores, textos legales, RUC, redes.
- [ ] Datos reales cargados y **comparados contra el Excel/fuente oficial** (muestra de al menos 20 productos y los extremos).
- [ ] Cuentas de pago reales verificadas con el cliente.
- [ ] Las dos imágenes se ven bien al compartirlas por WhatsApp desde un **iPhone y un Android reales**.
- [ ] Probado en celular de 360 px, tableta y escritorio con pantalla completa.
- [ ] Sin scroll horizontal; los carruseles se deslizan con el dedo sin bloquear la página.
- [ ] Aviso legal revisado.
- [ ] Sin datos de clientes guardados (la versión sin base no guarda nada).
- [ ] Desplegado en Vercel con dominio propio.

---

## 12. Documentos relacionados

- `DESIGN.md` — lenguaje visual del cotizador.
- `docs/contexto-simulador-altos-de-sacta.md` — reglas de precio y cuotas, verificación contra el Excel.
- `docs/envio-cotizacion-whatsapp.md` — pruebas y decisiones de las imágenes.
- `docs/plan-escalamiento-supabase.md` — cómo se convierte esta plantilla en una plataforma con base de datos, panel y varios proyectos (fuera del alcance de esta guía).
