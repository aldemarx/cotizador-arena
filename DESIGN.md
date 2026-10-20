# Estilo visual del simulador — guía de referencia

Este documento describe el lenguaje visual que estamos construyendo para el
cotizador (`Simulador.tsx`) y su entorno (`SiteHeader.tsx`, `ClubHouseShowcase.tsx`).
Úsalo como referencia antes de agregar tarjetas o secciones nuevas, para que
todo se sienta parte del mismo sistema y no colores/estilos sueltos.

## Principio general

Diseño plano, sin sombras flotantes, tarjetas blancas con borde de 1px, y
**un color por categoría de información** — no colores decorativos sueltos.
Cada color tiene un significado y se repite consistentemente:

| Color | Hex | Significado | Dónde se usa |
|---|---|---|---|
| Azul | `#3b82f6` | Información / selección | Ícono + título de "Datos del lote", chips activos (Manzana, lote seleccionado), foco del buscador, resaltado de "Lote {código}" en el header |
| Verde | `#10b981` | Dinero / financiamiento | Ícono + título de "Financiamiento" |
| Gris grafito | `#3F4147` | Utilidad / acción neutra (no es un dato del lote ni plata) | Ícono + título de "Selecciona tu lote" |
| Celeste CEINYS | `--ceinys-cian-500` (`#17AEE6`) | Marca corporativa (chrome compartido, no parte del cotizador en sí) | Cintillo "Marketing & Ventas" del header |
| Naranja CEINYS | `--ceinys-naranja-500` | Reservado — **ya no se usa** en esta pantalla para evitar que compita con el azul/verde del cotizador | — |

Regla práctica: antes de meter un color nuevo, pregúntate a qué categoría
pertenece (info / dinero / utilidad) y reutiliza el que ya existe. Si hace
falta una cuarta categoría, sumar un color nuevo está bien, pero debe quedar
igual de bien diferenciado de los tres de arriba (no otro tono de azul/verde).

## El patrón de tarjeta: `TarjetaInfo`

Todas las cajas de contenido del cotizador (menos el header) siguen el mismo
molde, definido en `Simulador.tsx`:

- Tarjeta blanca (`.card` en `globals.css`): fondo blanco, borde 1px
  `var(--border)`, radio **12px** (`rounded-xl` / `0.75rem`), **sin sombra**
  (`--card-shadow: none`).
- Encabezado de la tarjeta: franja de color pastel de fondo a fondo
  (`${color}26`, ~15% del color de la categoría), con un cuadrado de 36px
  (`rounded-[9px]`) del color sólido conteniendo el ícono en blanco, y el
  título en texto bold del mismo color que el cuadrado.
- Cuerpo blanco debajo, con el contenido específico de esa tarjeta.

Componente reutilizable: `TarjetaInfo({ color, titulo, icono, children })`.
`icono` acepta cualquier `React.ReactNode` — puede ser un `<img>` (para los
PNG de `public/icons/`) o un `<svg>` inline (cuando no hay un ícono
provisto todavía, como la lupa de "Selecciona tu lote").

## Íconos

- Los íconos provistos como archivo viven en `public/icons/` (PNG 512×512,
  trazo negro sobre fondo transparente). Se pintan de blanco con
  `className="... brightness-0 invert"` — nunca se edita el PNG en sí.
  Ejemplos ya usados: `alfiler.png` (Datos del lote), `dolar.png`
  (Financiamiento). Pendientes de asignar: `planificador.png`,
  `financiar.png`.
- Cuando no hay un ícono provisto para una sección nueva, se dibuja un SVG
  inline simple (`stroke="white"`, `strokeWidth={1.8}`) en vez de forzar uno
  de los PNG existentes que no calce temáticamente.

## Filas de datos: `FilaDato`

Para listas de "etiqueta: valor" (Datos del lote, Financiamiento):

- Cada fila es un bloque centrado dentro de la tarjeta (`justify-center` en
  el contenedor + `max-w-[22rem]` en el bloque interno), con `justify-between`
  entre etiqueta y valor **dentro** de ese ancho máximo — así ninguno de los
  dos textos queda pegado al borde de la tarjeta ni estirado de punta a
  punta; el espacio sobrante queda como margen simétrico a los costados.
  - **No usar** `justify-between` directo en toda la tarjeta (deja un hueco
    enorme en el medio) ni un label de ancho fijo pegado a la izquierda (deja
    el espacio sobrante solo de un lado).
- Separador: `border-t` entre filas, sin borde en la primera (`first:border-t-0`).
- Variantes: `destacado` (bold, texto más grande, para el monto principal:
  precio con descuento, cuota mensual) y `tachado` (texto muted con
  `line-through`, para el precio de lista).

## Botones y estados activos

- Activo: borde y texto en el color de acento (`var(--accent)` /
  `var(--accent-strong)`, que hoy vale azul `#3b82f6` / `#2563eb`), fondo
  `accent/10`.
- Inactivo: borde `var(--border)`, fondo `var(--surface-1)`, texto
  `var(--text-secondary)`, hover `var(--surface-2)`.
- `--accent` es **el mismo azul** que "Datos del lote" a propósito — es el
  color de "estás interactuando/seleccionando algo" en todo el cotizador
  (chips de manzana, foco del buscador). No usar naranja aquí (por eso se
  sacó — competía con el azul/verde de las tarjetas).

## Buscador (`.selectCampo`)

Campo grande y prominente (no un input chico de formulario): padding
`0.75rem 1rem`, `font-size: 1rem`, radio `0.625rem`. Foco: borde azul +
glow `rgba(59,130,246,0.18)`.

## Header del cotizador

Tarjeta (mismo `.card`) en dos filas:
1. Logo del proyecto (`public/logo-altos-de-sacta.png`, `h-10`) + botón
   "Modo presentación" (con ícono), a los extremos.
2. Separador (`border-t`) y debajo el dato dinámico: "Lote {código}" (el
   código en azul) + línea de detalle (etapa · manzana · metraje · ubicación).

El logo reemplaza el nombre del proyecto en texto plano — si se agrega un
proyecto nuevo al simulador, se necesita su logo en PNG con fondo
transparente, mismo criterio que `logoaltossacta.png`.

## Cosas explícitamente comentadas para más adelante

La comparación Fija/Ascendente/Descendente (gráfico `TimelineCuotas`,
cronograma completo `Cronograma`) está comentada dentro de `Simulador.tsx`
(no borrada), marcada con `// TODO(cotizador): reintegrar comparación de
modalidades`. Cuando se retome esa parte, debería vestirse con este mismo
lenguaje visual (tarjeta blanca + categoría de color propia), no como estaba
antes.

## Lo que NO es parte de este sistema

- `SiteHeader.tsx` (logo CEINYS + redes + cintillo "Marketing & Ventas") es
  chrome compartido de la marca CEINYS, replicado de `Ceinys_Panel_Precios`.
  Su único color de acento hoy es el celeste corporativo
  (`--ceinys-cian-500`), elegido porque combina con el azul del cotizador sin
  ser el mismo tono exacto.
- `ClubHouseShowcase.tsx` (la tarjeta oscura de la derecha) es intencionalmente
  un mundo visual aparte (fondo oscuro, fotos grandes) — no sigue la paleta
  clara de arriba.
