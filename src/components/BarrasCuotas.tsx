import { type SegmentoTramo } from "@/lib/altosDeSacta";
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
