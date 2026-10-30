"use client";

import { formatearMonto, formatSoles } from "@/lib/arenas";
import { PLAZOS_CUOTAS } from "@/lib/configCotizacion";

/**
 * Cuota mensual y plazo en una sola pieza: la cuota es lo principal, «durante N meses» la acompaña y el plazo se elige con
 * un selector de botones siempre visible (en vez de un lápiz que abre un menú). Mide siempre lo mismo.
 */
export function CuotaYPlazo({
  cuota,
  plazo,
  onCambiarPlazo,
  total,
  tamano,
  bloqueado = false,
}: {
  cuota: number;
  plazo: number;
  onCambiarPlazo: (cuotas: number) => void;
  /** Lote con promoción: el plazo viene fijado y los demás botones quedan deshabilitados. */
  bloqueado?: boolean;
  /** Total a pagar (inicial + cuotas): no cambia con el plazo. */
  total: number;
  tamano: { cifra: string; sufijo: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-2 pt-4 pb-3 text-center">
      <p className="m-0 flex items-center justify-center gap-2 text-[10px] font-semibold tracking-wide text-[var(--text-muted)] uppercase sm:text-[15px] sm:tracking-wider">
        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full transition-colors ${plazo === PLAZOS_CUOTAS[0] ? "bg-[#2b7de0]" : "bg-[#5f9b3c]"}`} />
        Tu cuota mensual
      </p>

      {/* La cifra se anima al cambiar de plazo: se nota qué cambió */}
      <p
        key={plazo}
        className="animate-pop m-0 flex min-h-6 items-baseline justify-center gap-1.5 whitespace-nowrap [font-variant-numeric:tabular-nums] min-[420px]:min-h-[1.875rem] sm:h-12"
      >
        <span className="text-base font-semibold text-[var(--text-primary)] sm:text-2xl">S/</span>
        <span className={`leading-none font-extrabold text-[var(--text-primary)] ${tamano.cifra} sm:!text-5xl`}>
          {formatearMonto(cuota)}
        </span>
        <span className="text-sm font-medium text-[var(--text-muted)] sm:text-lg">/ mes</span>
      </p>

      <p className="m-0 -mt-1 text-sm text-[var(--text-secondary)] sm:text-base">
        durante <strong className="font-semibold text-[var(--text-primary)]">{plazo} meses</strong>
      </p>

      <div
        role="radiogroup"
        aria-label="Cantidad de cuotas"
        className="grid w-full max-w-[22rem] grid-cols-2 gap-1 rounded-xl bg-[var(--surface-2)] p-1"
        style={{ gridTemplateColumns: `repeat(${PLAZOS_CUOTAS.length}, minmax(0, 1fr))` }}
      >
        {PLAZOS_CUOTAS.map((n, i) => {
          const activo = n === plazo;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={activo}
              disabled={bloqueado && !activo}
              onClick={() => onCambiarPlazo(n)}
              className={`h-11 rounded-lg text-sm font-semibold transition-colors sm:text-base ${
                activo
                  ? `${i === 0 ? "bg-[#2b7de0]" : "bg-[#5f9b3c]"} text-white shadow-sm`
                  : bloqueado
                    ? "cursor-not-allowed text-[var(--text-muted)] opacity-40"
                    : "text-[var(--text-secondary)] hover:bg-white"
              }`}
            >
              {n} cuotas
            </button>
          );
        })}
      </div>

      {bloqueado && (
        <p className="m-0 -mt-1 text-xs font-medium text-[var(--text-muted)] sm:text-[13px]">
          La promoción se financia solo a {plazo} cuotas.
        </p>
      )}

      <p className="m-0 text-xs text-[var(--text-muted)] sm:text-[13px]">
        Total a pagar (inicial + cuotas):{" "}
        <strong className="font-semibold text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">
          {formatSoles(total)}
        </strong>
      </p>
    </div>
  );
}
