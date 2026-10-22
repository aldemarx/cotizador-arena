import { formatearMonto } from "@/lib/arenas";

/** Monto en soles con el símbolo "S/" más chico que la cifra (relativo al tamaño del texto padre). */
export function Soles({ monto }: { monto: number }) {
  return (
    <>
      <span className="mr-[0.25em] text-[0.75em] font-semibold">S/</span>
      {formatearMonto(monto)}
    </>
  );
}
