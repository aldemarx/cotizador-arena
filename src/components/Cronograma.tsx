import { type FilaCalendario } from "@/lib/arenas";
import { Soles } from "@/components/Soles";

type CronogramaProps = {
  filas: FilaCalendario[];
};

export function Cronograma({ filas }: CronogramaProps) {
  return (
    <div className="max-h-[420px] overflow-y-auto rounded-lg border border-[var(--border)]">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
          <tr>
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">Concepto</th>
            <th className="px-3 py-2 text-left font-medium">Fecha</th>
            <th className="px-3 py-2 text-right font-medium">Monto</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, idx) => {
            const esCambio = fila.esInicioTramo && fila.tramo !== 1;
            return (
              <tr
                key={`${fila.concepto}-${idx}`}
                className={
                  fila.esInicial
                    ? "bg-[var(--surface-2)]"
                    : esCambio
                    ? "bg-[var(--accent)]/10"
                    : idx % 2 === 0
                    ? "bg-[var(--surface-1)]"
                    : "bg-transparent"
                }
              >
                <td className="px-3 py-1.5 text-[var(--text-muted)] [font-variant-numeric:tabular-nums]">
                  {fila.mesIndice}
                </td>
                <td className="px-3 py-1.5 text-[var(--text-primary)]">
                  {fila.concepto}
                  {esCambio && (
                    <span className="ml-2 rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--accent-strong)]">
                      cambia (año {fila.tramo})
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-[var(--text-secondary)]">{fila.fecha}</td>
                <td className="px-3 py-1.5 text-right font-medium text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                  <Soles monto={fila.monto} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
