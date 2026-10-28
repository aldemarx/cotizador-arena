import { requerirAdmin } from "@/lib/admin/acceso";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { PROYECTO_ID } from "@/lib/lotesSupabase";
import { numeroDeManzana } from "@/lib/arenas";
import {
  PanelEstados,
  type FilaHistorial,
  type FilaLote,
} from "./PanelEstados";

/** Panel de estados de lotes (disponible, separado, bloqueado por gerencia, vendido). Solo administradores con segundo factor. */
export default async function PaginaAdmin() {
  const acceso = await requerirAdmin();
  const supabase = await crearClienteServidor();

  // La API devuelve como máximo 1000 filas por consulta: se lee por páginas.
  const lotes: FilaLote[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data } = await supabase
      .from("lotes")
      .select("id, manzana, lote, metraje, ubicacion, estado, bloqueo_gerencia")
      .eq("proyecto_id", PROYECTO_ID)
      .order("manzana")
      .order("lote")
      .range(desde, desde + 999);
    const pagina = (data ?? []) as FilaLote[];
    lotes.push(...pagina);
    if (pagina.length < 1000) break;
  }
  lotes.sort(
    (a, b) =>
      numeroDeManzana(a.manzana) - numeroDeManzana(b.manzana) || Number(a.lote) - Number(b.lote),
  );

  const [{ data: historial }, { data: perfiles }] = await Promise.all([
    supabase
      .from("estado_historial")
      .select(
        "id, estado_anterior, estado_nuevo, modificado_por, created_at, lotes(manzana, lote)",
      )
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.from("perfiles").select("id, nombre"),
  ]);
  const nombres = new Map(
    (perfiles ?? []).map((p) => [p.id as string, p.nombre as string]),
  );
  const filasHistorial: FilaHistorial[] = (historial ?? []).map((h) => {
    const lote = (Array.isArray(h.lotes) ? h.lotes[0] : h.lotes) as {
      manzana: string;
      lote: string;
    } | null;
    return {
      id: h.id as string,
      lote: lote ? `${lote.manzana}-${lote.lote}` : "—",
      de: h.estado_anterior as string | null,
      a: h.estado_nuevo as string,
      quien: nombres.get(h.modificado_por as string) ?? "Sistema",
      cuando: h.created_at as string,
    };
  });

  return (
    <PanelEstados
      nombre={acceso.nombre}
      rol={acceso.rol}
      lotes={lotes}
      historial={filasHistorial}
    />
  );
}
