import type { Metadata } from "next";
import { cargarLotes, cargarLotesBloqueados } from "@/lib/lotesSupabase";
import { requerirAsesor } from "@/lib/asesor/acceso";
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
  // Sin una cuenta de asesor activa no se ve el plano ni los precios.
  const [, lotesCotizables, bloqueados] = await Promise.all([requerirAsesor(), cargarLotes(), cargarLotesBloqueados()]);
  const lotes: LoteMapa[] = lotesCotizables.map((l) => ({
    id: l.lote,
    mz: l.mz,
    lt: l.lt,
    metraje: l.metraje_m2,
    ubicacion: l.ubicacion,
    precio: l.precio_con_dscto,
    promocion: l.promocion?.tipo,
    estado: l.estado,
  }));
  // Los bloqueados por gerencia se dibujan como «Reservado» (gris), sin precio: no se pueden cotizar.
  for (const b of bloqueados) {
    lotes.push({
      id: `${b.mz}-${b.lt}`,
      mz: b.mz,
      lt: b.lt,
      metraje: b.metraje,
      ubicacion: b.ubicacion,
      precio: null,
      bloqueoGerencia: true,
    });
  }
  return (
    <MapaLotes
      lotes={lotes}
      loteInicial={lote}
      volver={<EnlaceVolver loteDelServidor={lote} />}
    />
  );
}
