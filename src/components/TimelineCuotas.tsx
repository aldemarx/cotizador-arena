import { formatSoles, type SegmentoTramo } from "@/lib/altosDeSacta";
import { Soles } from "@/components/Soles";

type TimelineCuotasProps = {
  segmentos: SegmentoTramo[];
  color: string;
  altura?: number;
  /** Versión chica sin etiquetas, para comparar varias modalidades a la vez. */
  compacto?: boolean;
};

export function TimelineCuotas({ segmentos, color, altura = 110, compacto = false }: TimelineCuotasProps) {
  const montos = segmentos.map((s) => s.monto);
  const minimo = Math.min(...montos);
  const rango = Math.max(...montos) - minimo;
  // Escala "estirada" (no desde cero): el objetivo es que la subida o bajada
  // entre tramos se note a simple vista, no representar el monto absoluto.
  const piso = compacto ? 30 : 38;
  function alturaDe(monto: number) {
    if (rango === 0) return 70;
    return piso + ((monto - minimo) / rango) * (100 - piso);
  }

  return (
    <div className="w-full">
      <div className="flex items-end gap-1" style={{ height: altura }}>
        {segmentos.map((s) => {
          const alturaPct = alturaDe(s.monto);
          return (
            <div
              key={s.label}
              className="flex h-full items-end"
              style={{ flex: `${s.meses} 0 0%` }}
              title={`${s.label} · ${formatSoles(s.monto)}/mes`}
            >
              <div
                className="relative w-full rounded-t-md transition-[filter] hover:brightness-110"
                style={{ height: `${alturaPct}%`, backgroundColor: color }}
              >
                {!compacto && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                    <Soles monto={s.monto} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!compacto && (
        <div className="mt-1.5 flex gap-1 border-t border-[var(--border)] pt-1 text-[11px] text-[var(--text-secondary)]">
          {segmentos.map((s) => (
            <span key={s.label} className="text-center" style={{ flex: `${s.meses} 0 0%` }}>
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
