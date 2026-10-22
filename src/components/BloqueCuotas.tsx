"use client";

import { useEffect, useRef, useState } from "react";
import { formatearMonto } from "@/lib/arenas";
import { PLAZOS_CUOTAS } from "@/lib/configCotizacion";
import { Soles } from "@/components/Soles";

/**
 * Piezas compartidas por las dos pantallas del cotizador (Fraccionamiento y Elige tu tipo de cuota):
 * la fila «cuota | línea | cantidad de cuotas», el resumen «Cuotas desde» con sus tarjetas y el editor
 * de la cantidad de cuotas.
 *
 * Dos reglas de diseño:
 *  - Por debajo de 640 px (móvil) todo se adapta al ancho: las cifras bajan de tamaño según su largo
 *    y las tarjetas miden según su contenido.
 *  - Desde 640 px (escritorio) las cifras miden SIEMPRE lo mismo y las filas tienen alto fijo, así el
 *    cotizador no cambia de tamaño al pasar de un lote a otro.
 */

/**
 * Tamaño de la cifra de la fila «cuota | cantidad» según cuántos caracteres tiene el monto. En móvil se
 * aplica a las dos columnas por igual; desde 640 px es siempre el mismo.
 */
export function tamanoFilaCuota(largo: number): {
  cifra: string;
  sufijo: string;
} {
  if (largo >= 9)
    return {
      cifra: "text-sm min-[380px]:text-base min-[420px]:text-xl sm:text-4xl",
      sufijo: "text-xs sm:text-base",
    };
  if (largo >= 8)
    return {
      cifra: "text-base min-[380px]:text-lg min-[420px]:text-xl sm:text-4xl",
      sufijo: "text-xs sm:text-base",
    };
  if (largo >= 7)
    return {
      cifra: "text-lg max-[340px]:text-base min-[420px]:text-2xl sm:text-4xl",
      sufijo: "text-xs min-[420px]:text-sm sm:text-base",
    };
  return {
    cifra: "text-2xl max-[340px]:text-xl min-[420px]:text-3xl sm:text-4xl",
    sufijo: "text-sm max-[340px]:text-xs sm:text-base",
  };
}

function IconoLapiz() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

/** Menú emergente con las cantidades de cuotas; `className` lo posiciona. */
function ListaPlazos({
  plazo,
  onElegir,
  className,
}: {
  plazo: number;
  onElegir: (n: number) => void;
  className: string;
}) {
  return (
    <ul
      role="listbox"
      aria-label="Cantidad de cuotas"
      className={`absolute z-20 w-40 rounded-xl border border-[var(--border)] bg-white p-1.5 text-left shadow-[0_12px_32px_rgba(20,22,28,0.14)] ${className}`}
    >
      {PLAZOS_CUOTAS.map((n) => (
        <li key={n} role="presentation">
          <button
            type="button"
            role="option"
            aria-selected={n === plazo}
            onClick={() => onElegir(n)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-[13px] ${n === plazo ? "bg-[var(--surface-2)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"}`}
          >
            <span>{n} cuotas</span>
            {n === 80 ? (
              <span className="text-[10px] font-medium text-[var(--text-muted)] sm:text-xs">
                estándar
              </span>
            ) : (
              n === plazo && <span aria-hidden>✓</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Estado de apertura de un menú emergente: se cierra al hacer clic fuera o con Esc. */
function useMenuEmergente() {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function cerrar(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", esc);
    };
  }, []);
  return { abierto, setAbierto, ref };
}

/* ------------------------- primera pantalla: fila «cuota | cantidad» ------------------------- */

/**
 * Etiqueta pequeña con punto. `puntoCuenta`: en móvil el punto se centra junto con el texto; si no, queda
 * fuera para que el texto se centre de verdad sobre la cifra. Desde 640 px el punto siempre queda fuera.
 */
function Etiqueta({
  children,
  puntoCuenta = false,
}: {
  children: React.ReactNode;
  puntoCuenta?: boolean;
}) {
  return (
    <p className="mb-2 flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-wide text-[var(--text-muted)] uppercase sm:gap-2 sm:text-[15px] sm:tracking-wider">
      <span className="relative inline-flex items-center">
        <span
          className={`mr-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5f9b3c] sm:absolute sm:right-full sm:mr-2 ${puntoCuenta ? "" : "max-sm:absolute max-sm:right-full"}`}
        />
        <span className="whitespace-nowrap">{children}</span>
      </span>
    </p>
  );
}

/** Columna izquierda: «S/ 384.26 / mes» centrado bajo «Cuota mensual». Desde 640 px «/ mes» cuelga a la derecha. */
export function CuotaUnica({
  monto,
  tamano,
}: {
  monto: number;
  tamano: { cifra: string; sufijo: string };
}) {
  return (
    <>
      <Etiqueta>Cuota mensual</Etiqueta>
      <p className="flex min-h-6 items-center justify-center whitespace-nowrap min-[420px]:min-h-[1.875rem] sm:h-10 [font-variant-numeric:tabular-nums]">
        <span className="inline-flex items-baseline gap-1 sm:relative">
          <span className="text-base font-semibold text-[var(--text-primary)] sm:text-xl">
            S/
          </span>
          <span
            className={`leading-none font-extrabold text-[var(--text-primary)] ${tamano.cifra}`}
          >
            {formatearMonto(monto)}
          </span>
          <span
            className={`font-medium text-[var(--text-muted)] max-[380px]:hidden sm:absolute sm:bottom-[0.05em] sm:left-full sm:ml-1 ${tamano.sufijo}`}
          >
            / mes
          </span>
        </span>
      </p>
    </>
  );
}

/** Columna derecha: «N cuotas» centrado bajo su etiqueta; el lápiz cuelga a la derecha y no cuenta. */
function SelectorCuotas({
  plazo,
  onCambiarPlazo,
  tamano,
}: {
  plazo: number;
  onCambiarPlazo: (cuotas: number) => void;
  tamano: { cifra: string; sufijo: string };
}) {
  const { abierto, setAbierto, ref } = useMenuEmergente();
  return (
    <div
      ref={ref}
      className="relative min-w-0 flex-auto px-3 sm:flex-none sm:px-0"
    >
      <Etiqueta puntoCuenta>Cant. de cuotas</Etiqueta>
      <p className="flex min-h-6 items-center justify-center px-5 whitespace-nowrap min-[420px]:min-h-[1.875rem] sm:h-10 sm:px-0 [font-variant-numeric:tabular-nums]">
        {/* El px-5 simétrico le reserva sitio al lápiz en móvil sin mover el centro. */}
        <span className="relative inline-flex items-baseline gap-1.5">
          <span
            className={`leading-none font-extrabold text-[var(--text-primary)] ${tamano.cifra}`}
          >
            {plazo}
          </span>
          <span
            className={`font-medium text-[var(--text-muted)] ${tamano.sufijo}`}
          >
            cuotas
          </span>
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-label="Cambiar la cantidad de cuotas"
            aria-haspopup="listbox"
            aria-expanded={abierto}
            className="absolute top-1/2 left-full ml-1.5 flex h-6 w-6 shrink-0 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            <IconoLapiz />
          </button>
        </span>
      </p>
      {abierto && (
        <ListaPlazos
          plazo={plazo}
          onElegir={(n) => {
            onCambiarPlazo(n);
            setAbierto(false);
          }}
          className="top-full right-0 mt-1.5"
        />
      )}
    </div>
  );
}

/**
 * Fila «cuota | línea | cantidad de cuotas». En móvil cada columna parte del ancho de su contenido y el
 * espacio sobrante se reparte por igual, así la línea se mueve según lo que ocupen las cifras (la fila
 * llega hasta los bordes de la tarjeta: -mx-4 compensa el px-4 de la tarjeta). Desde 640 px es una rejilla
 * estable con la línea fija.
 */
export function BloqueCuotas({
  izquierda,
  plazo,
  onCambiarPlazo,
  tamano,
}: {
  izquierda: React.ReactNode;
  plazo: number;
  onCambiarPlazo: (cuotas: number) => void;
  tamano: { cifra: string; sufijo: string };
}) {
  return (
    <div className="-mx-4 mt-3 mb-4 flex w-[calc(100%+2rem)] max-w-[26rem] items-stretch justify-between sm:mx-auto sm:grid sm:w-full sm:max-w-none sm:grid-cols-[1.3fr_auto_1fr] sm:gap-6">
      <div className="min-w-0 flex-auto px-3 sm:flex-none sm:px-0">
        {izquierda}
      </div>
      <div aria-hidden className="my-1 w-px shrink-0 bg-[var(--border)]" />
      <SelectorCuotas
        plazo={plazo}
        onCambiarPlazo={onCambiarPlazo}
        tamano={tamano}
      />
    </div>
  );
}

/* ------------------------- segunda pantalla: «Elige tu tipo de cuota» ------------------------- */

function cuadroEstilo(color: string): React.CSSProperties {
  // Los colores son variables CSS: el tinte se arma con color-mix.
  return {
    borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${color} 7%, transparent)`,
  };
}

/** Cifra de una tarjeta: en móvil se ajusta al ancho del cuadro; desde 640 px es fija. */
const CIFRA_TARJETA =
  "text-[length:clamp(1rem,calc(100cqi/(0.62*var(--largo)_+_1.3)),1.75rem)] leading-none font-extrabold sm:text-2xl";
/** «/ mes»: debajo de la cifra en móvil; a su lado desde 640 px. */
const FILA_CIFRA =
  "flex flex-col items-center justify-center gap-1 whitespace-nowrap sm:flex-row sm:items-baseline sm:gap-1.5 [font-variant-numeric:tabular-nums]";

function Tarjeta({
  etiqueta,
  monto,
  color,
}: {
  etiqueta: string;
  monto: number;
  color?: string;
}) {
  return (
    <div
      className={`rounded-xl border px-2 py-3 max-sm:flex max-sm:flex-col max-sm:justify-center max-sm:[container-type:inline-size] sm:px-3 sm:py-2.5 ${color ? "" : "border-[var(--border)] bg-[var(--surface-2)]"}`}
      style={color ? cuadroEstilo(color) : undefined}
    >
      <p
        className="mb-1 text-center text-[11px] font-semibold tracking-wider uppercase sm:text-[13px]"
        style={{ color: color ?? "var(--text-muted)" }}
      >
        {etiqueta}
      </p>
      <p className={FILA_CIFRA}>
        <span
          className={`${CIFRA_TARJETA} ${color ? "" : "text-[var(--text-primary)]"}`}
          style={color ? { color } : undefined}
        >
          <Soles monto={monto} />
        </span>
        <span className="text-xs font-medium text-[var(--text-muted)] sm:text-sm">
          / mes
        </span>
      </p>
    </div>
  );
}

/**
 * Resumen bajo los botones de modalidad. Fija: un solo cuadro («Año 1 al N»). Ascendente y descendente:
 * dos cuadros lado a lado (Año 1 → Año N). En móvil la cifra se ajusta al ancho del cuadro según el
 * monto más largo, así las dos miden igual y nunca se parten en dos filas.
 */
export function ResumenCuotas({
  desde,
  hasta,
  color,
  etiqueta,
  anios,
}: {
  desde: number;
  /** Si falta, la cuota no varía (fija). */
  hasta?: number;
  color: string;
  etiqueta: string;
  anios: number;
}) {
  const largo = Math.max(
    formatearMonto(desde).length,
    formatearMonto(hasta ?? desde).length,
  );
  return (
    <div className="border-t border-[var(--border)] pt-4 text-center">
      <span className="flex items-center justify-center gap-2 text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase sm:text-[13px]">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {hasta === undefined ? etiqueta : "Cuotas desde:"}
      </span>
      {hasta === undefined ? (
        <div
          className="mx-auto mt-3 w-full max-w-[16rem] rounded-xl border px-3 py-3"
          style={cuadroEstilo(color)}
        >
          <p
            className="mb-1 text-center text-[11px] font-semibold tracking-wider uppercase sm:text-[13px]"
            style={{ color }}
          >
            {anios > 1 ? `Año 1 al ${anios}` : "Año 1"}
          </p>
          <p className={FILA_CIFRA}>
            <span className="text-[1.75rem] leading-none font-extrabold text-[var(--text-primary)] sm:text-2xl">
              <Soles monto={desde} />
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)] sm:text-sm">
              / mes
            </span>
          </p>
        </div>
      ) : (
        <div
          className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 max-sm:min-h-[94.5px] sm:items-center sm:gap-3"
          style={{ "--largo": largo } as React.CSSProperties}
        >
          <Tarjeta etiqueta="Año 1" monto={desde} />
          <span
            aria-hidden
            className="self-center text-lg leading-none font-light text-[var(--text-muted)] sm:text-2xl"
          >
            →
          </span>
          <Tarjeta etiqueta={`Año ${anios}`} monto={hasta} color={color} />
        </div>
      )}
    </div>
  );
}

/**
 * Editor de la cantidad de cuotas al pie de la segunda pantalla, bajo las barras. «N cuotas» se centra
 * bajo su etiqueta; el lápiz cuelga a la derecha y no cuenta. La lista se abre hacia arriba.
 */
export function EditorCuotasPie({
  plazo,
  onCambiarPlazo,
  color,
}: {
  plazo: number;
  onCambiarPlazo: (cuotas: number) => void;
  color: string;
}) {
  const { abierto, setAbierto, ref } = useMenuEmergente();
  return (
    <div
      ref={ref}
      className="relative mt-auto border-t border-[var(--border)] pt-4 text-center"
    >
      <span className="flex items-center justify-center gap-2 text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase sm:text-[13px]">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        Cant. de cuotas
      </span>
      <p className="mt-2 flex items-baseline justify-center whitespace-nowrap [font-variant-numeric:tabular-nums]">
        <span className="relative inline-flex items-baseline gap-1.5">
          <span className="text-3xl leading-none font-extrabold text-[var(--text-primary)]">
            {plazo}
          </span>
          <span className="text-sm font-medium text-[var(--text-muted)]">
            cuotas
          </span>
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-label="Cambiar la cantidad de cuotas"
            aria-haspopup="listbox"
            aria-expanded={abierto}
            className="absolute top-1/2 left-full ml-1.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            <IconoLapiz />
          </button>
        </span>
      </p>
      {abierto && (
        <ListaPlazos
          plazo={plazo}
          onElegir={(n) => {
            onCambiarPlazo(n);
            setAbierto(false);
          }}
          className="bottom-full left-1/2 mb-1.5 -translate-x-1/2"
        />
      )}
    </div>
  );
}
