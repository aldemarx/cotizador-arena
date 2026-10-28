import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { aLote, numeroDeManzana, type EstadoLote, type Lote, type LoteJson } from "@/lib/arenas";

/**
 * Lectura de los lotes de Arenas desde Supabase (solo servidor, con la clave secreta). Es la misma base que Altos de Sacta: los lotes de
 * cada proyecto se separan por `proyecto_id`, y aquí solo se lee el de Arenas, así los lotes y estados no se mezclan.
 *
 * Si Supabase no responde NO se usa ningún respaldo con precios o estados viejos: se lanza el error y la página no carga.
 * Los lotes llegan al navegador solo si hay sesión de asesor activo (src/lib/asesor/acceso.ts).
 */

export const PROYECTO_ID = "arenas-del-valle";

type FilaLote = {
  manzana: string;
  lote: string;
  metraje: number | null;
  tarifa_m2: number | null;
  precio_lista: number | null;
  precio_contado: number | null;
  inicial: number | null;
  ubicacion: string | null;
  estado: EstadoLote;
  promocion: LoteJson["promocion"];
};

const COLUMNAS = "manzana,lote,metraje,tarifa_m2,precio_lista,precio_contado,inicial,ubicacion,estado,promocion";

function clienteServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) throw new Error("Falta SUPABASE_SECRET_KEY en las variables de entorno del servidor.");
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Segundos que se reutiliza la lectura antes de volver a preguntar a Supabase. */
const SEGUNDOS_CACHE = 15;
/** Etiqueta del caché: un cambio de estado la invalida al instante. */
export const ETIQUETA_LOTES = "lotes-arenas";

async function leerLotes(): Promise<Lote[]> {
  const supabase = clienteServicio();

  // La API devuelve como máximo 1000 filas por consulta: se lee por páginas.
  const filas: FilaLote[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("lotes")
      .select(COLUMNAS)
      .eq("proyecto_id", PROYECTO_ID)
      .not("precio_contado", "is", null) // los lotes sin precio no se cotizan
      .eq("bloqueo_gerencia", false) // ni los que gerencia bloqueó
      .order("manzana")
      .order("lote")
      .range(desde, desde + 999)
      .overrideTypes<FilaLote[], { merge: false }>();
    if (error) {
      console.error("[lotes] Supabase no respondió", error);
      throw new Error(`No se pudieron leer los lotes: ${error.message}`);
    }
    filas.push(...data);
    if (data.length < 1000) break;
  }
  if (filas.length === 0) throw new Error("La tabla de lotes devolvió 0 filas de Arenas: se cancela la carga.");

  return filas
    .map((f) =>
      aLote(
        {
          lote: `${f.manzana}-${f.lote}`,
          mz: f.manzana,
          lt: Number(f.lote),
          metraje_m2: Number(f.metraje),
          ubicacion: f.ubicacion ?? "",
          tarifa_m2: Number(f.tarifa_m2),
          precio_lista: Number(f.precio_lista),
          precio_contado: Number(f.precio_contado),
          inicial: Number(f.inicial),
          promocion: f.promocion,
        },
        f.estado,
      ),
    )
    .sort((a, b) => numeroDeManzana(a.mz) - numeroDeManzana(b.mz) || a.lt - b.lt);
}

/** Lotes de Arenas con caché de 15 s en el servidor. */
export const cargarLotes = unstable_cache(leerLotes, ["lotes-cotizables-arenas"], {
  revalidate: SEGUNDOS_CACHE,
  tags: [ETIQUETA_LOTES],
});

/** Un lote bloqueado por gerencia, solo para dibujarlo en el plano del asesor como «Reservado»: sin precios ni cuotas. */
export type LoteBloqueado = { mz: string; lt: number; metraje: number | null; ubicacion: string | null };

async function leerLotesBloqueados(): Promise<LoteBloqueado[]> {
  const supabase = clienteServicio();
  const lotes: LoteBloqueado[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("lotes")
      .select("manzana,lote,metraje,ubicacion")
      .eq("proyecto_id", PROYECTO_ID)
      .eq("bloqueo_gerencia", true)
      .order("manzana")
      .order("lote")
      .range(desde, desde + 999);
    if (error) throw new Error(`No se pudieron leer los lotes bloqueados: ${error.message}`);
    for (const f of data) {
      lotes.push({
        mz: f.manzana as string,
        lt: Number(f.lote),
        metraje: (f.metraje as number | null) || null,
        ubicacion: (f.ubicacion as string | null) ?? null,
      });
    }
    if (data.length < 1000) break;
  }
  return lotes;
}

/** Lotes bloqueados por gerencia, con el mismo caché de 15 s y la misma invalidación. */
export const cargarLotesBloqueados = unstable_cache(leerLotesBloqueados, ["lotes-bloqueados-arenas"], {
  revalidate: SEGUNDOS_CACHE,
  tags: [ETIQUETA_LOTES],
});
