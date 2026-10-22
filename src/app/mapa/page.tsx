import type { Metadata } from "next";
import { LOTES } from "@/lib/arenas";
import { MapaLotes, type LoteMapa } from "@/components/MapaLotes";
import { EnlaceVolver } from "./EnlaceVolver";

export const metadata: Metadata = {
  title: "Plano de lotes | Arenas del Valle",
};

/** Plano de Arenas del Valle: ubicación de cada lote y acceso directo a su cotización. */
export default async function PaginaMapa({
  searchParams,
}: {
  searchParams: Promise<{ lote?: string }>;
}) {
  const { lote } = await searchParams; // el lote que se estaba cotizando
  const lotes: LoteMapa[] = LOTES.map((l) => ({
    id: l.lote,
    mz: l.mz,
    lt: l.lt,
    metraje: l.metraje_m2,
    ubicacion: l.ubicacion,
    precio: l.precio_con_dscto,
    promocion: l.promocion?.tipo,
  }));
  return (
    <MapaLotes
      lotes={lotes}
      loteInicial={lote}
      volver={<EnlaceVolver loteDelServidor={lote} />}
    />
  );
}
