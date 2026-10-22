import { etiquetaMes, type SegmentoTramo } from "@/lib/arenas";
import { Soles } from "@/components/Soles";

type BarrasCuotasProps = {
  segmentos: SegmentoTramo[];
  color: string;
};

/** Comparativo de cuotas por año: una fila por tramo, barra horizontal. */
export function BarrasCuotas({ segmentos, color }: BarrasCuotasProps) {
  const montos = segmentos.map((s) => s.monto);
  const minimo = Math.min(...montos);
  const rango = Math.max(...montos) - minimo;
  // Escala "estirada" (no desde cero): el objetivo es que la subida o bajada
  // entre tramos se note a simple vista, no representar el monto absoluto.
  const piso = 42;
  function anchoDe(monto: number) {
    if (rango === 0) return 88;
    return piso + ((monto - minimo) / rango) * (100 - piso);
  }

  // Altura mínima = 7 filas (7 × 3rem + 6 × 0.5rem): la tarjeta mide lo mismo con cualquier cantidad
  // de cuotas y no mueve lo que hay debajo.
  return (
    <div className="flex min-h-[24rem] flex-col gap-2">
      {segmentos.map((s, i) => (
        <div
          key={s.label}
          className="flex items-center gap-3 rounded-xl px-3 py-3"
          style={{
            backgroundColor: i % 2 === 0 ? "var(--surface-2)" : "transparent",
          }}
        >
          <span className="w-24 shrink-0 text-right text-xs font-semibold whitespace-nowrap text-[var(--text-secondary)]">
            {s.label}{" "}
            <span className="font-medium text-[var(--text-muted)]">
              ({s.meses}*)
            </span>
          </span>
          <div className="relative h-6 min-w-0 flex-1 rounded-full bg-black/[0.06]">
            <div
              className="absolute inset-y-0 left-0 flex items-center justify-end rounded-full pr-2.5 shadow-sm transition-[width]"
              style={{ width: `${anchoDe(s.monto)}%`, backgroundColor: color }}
            >
              <span className="whitespace-nowrap text-xs font-bold text-white [font-variant-numeric:tabular-nums]">
                <Soles monto={s.monto} />
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Plazo de un solo año (12 cuotas): en vez de una barra única se muestra el cronograma mes por mes, como en la
 * cotización, en DOS partes (cuotas 1-6 y 7-12) para que cada cifra se lea grande. `mesInicial` es el mes (desde hoy)
 * de la primera cuota.
 */
export function CuotasPorMes({
  monto,
  cuotas,
  color,
  mesInicial = 2,
}: {
  monto: number;
  cuotas: number;
  color: string;
  mesInicial?: number;
}) {
  const mitad = Math.ceil(cuotas / 2);
  const partes = [
    Array.from({ length: mitad }, (_, i) => i),
    Array.from({ length: cuotas - mitad }, (_, i) => mitad + i),
  ];
  return (
    <div className="grid min-h-[24rem] grid-cols-2 content-center gap-3">
      {partes.map((indices, k) => (
        <div key={k} className="flex flex-col gap-1.5">
          <p className="m-0 px-1 text-center text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase sm:text-xs">
            Cuotas {indices[0] + 1} a {indices[indices.length - 1] + 1}
          </p>
          {indices.map((i, j) => (
            <div
              key={i}
              className="flex flex-col gap-0.5 rounded-xl px-3 py-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-2 min-[480px]:py-2.5"
              style={{
                backgroundColor:
                  j % 2 === 0 ? "var(--surface-2)" : "transparent",
              }}
            >
              <span className="leading-tight whitespace-nowrap">
                <span className="block text-sm font-semibold text-[var(--text-primary)]">
                  Cuota {i + 1}
                </span>
                <span className="block text-xs text-[var(--text-muted)]">
                  {etiquetaMes(i + mesInicial)}
                </span>
              </span>
              <span
                className="text-[15px] font-extrabold whitespace-nowrap min-[480px]:text-base [font-variant-numeric:tabular-nums]"
                style={{ color }}
              >
                <Soles monto={monto} />
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
