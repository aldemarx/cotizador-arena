import type { Metadata } from "next";
import { requerirAdmin } from "@/lib/admin/acceso";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { PROYECTO_ID } from "@/lib/lotesSupabase";
import type { EstadoLote } from "@/lib/arenas";
import type { LoteMapa } from "@/components/MapaLotes";
import { MapaAdmin } from "./MapaAdmin";

export const metadata: Metadata = {
  title: "Mapa de administración | Arenas del Valle",
  robots: { index: false, follow: false },
};

/** Plano de Arenas con el estado de cada lote y los botones para cambiarlo. Solo administradores con segundo factor. */
export default async function PaginaMapaAdmin() {
  await requerirAdmin();
  const supabase = await crearClienteServidor();

  // La API devuelve como máximo 1000 filas por consulta: se lee por páginas.
  const lotes: LoteMapa[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data } = await supabase
      .from("lotes")
      .select("id, manzana, lote, metraje, ubicacion, estado, precio_contado, bloqueo_gerencia")
      .eq("proyecto_id", PROYECTO_ID)
      .order("manzana")
      .order("lote")
      .range(desde, desde + 999);
    const pagina = data ?? [];
    for (const f of pagina) {
      lotes.push({
        id: `${f.manzana}-${f.lote}`,
        dbId: f.id as string,
        mz: f.manzana as string,
        lt: Number(f.lote),
        metraje: (f.metraje as number | null) || null,
        ubicacion: (f.ubicacion as string | null) ?? null,
        precio: null, // el panel no muestra precios
        estado: f.estado as EstadoLote,
        sinPrecio: f.precio_contado === null,
        bloqueoGerencia: f.bloqueo_gerencia === true,
      });
    }
    if (pagina.length < 1000) break;
  }

  return <MapaAdmin lotes={lotes} />;
}
