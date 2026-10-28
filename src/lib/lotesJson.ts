import "server-only";
import data from "@/data/arenas-lotes.json";
import { aLote, numeroDeManzana, type Lote, type LoteJson } from "@/lib/arenas";

/**
 * Los lotes del JSON de carga inicial (src/data/arenas-lotes.json), SOLO para código de servidor (la vista previa de la ficha, en desarrollo).
 * Está aparte de `arenas.ts` a propósito: lo que importa un componente de cliente viaja al navegador, y los precios no deben viajar a quien no
 * ha iniciado sesión. La fuente de verdad de la app es Supabase (src/lib/lotesSupabase.ts).
 */
export const LOTES_JSON: Lote[] = (data as { lotes: LoteJson[] }).lotes
  .map((l) => aLote(l))
  .sort((a, b) => numeroDeManzana(a.mz) - numeroDeManzana(b.mz) || a.lt - b.lt);
