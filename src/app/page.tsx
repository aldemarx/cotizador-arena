import { Simulador } from "@/components/Simulador";
import { cargarLotes, cargarLotesBloqueados } from "@/lib/lotesSupabase";
import type { ClaseLote } from "@/components/MapaLotes";
import { requerirAsesor } from "@/lib/asesor/acceso";
import { ColumnaDerecha } from "@/components/ColumnaDerecha";
import { BondadesCarrusel } from "@/components/BondadesCarrusel";
import { AjustePantalla } from "@/components/AjustePantalla";
import { RedesSociales } from "@/components/RedesSociales";
import { MediosDePago } from "@/components/MediosDePago";
import { BotonVerPlano } from "@/components/BotonVerPlano";
import { LoteActivoProvider } from "@/components/LoteActivo";

// Los lotes y su estado salen de Supabase (proyecto «arenas-del-valle», misma base que Altos de Sacta); src/data/arenas-lotes.json es solo la fuente de la carga inicial.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lote?: string }>;
}) {
  const { lote } = await searchParams;
  // La sesión y la lectura de los lotes van en paralelo; sin sesión se redirige y los lotes se descartan.
  const [, lotes, bloqueados] = await Promise.all([requerirAsesor(), cargarLotes(), cargarLotesBloqueados()]);
  // Estado de los lotes que no están disponibles, para pintarlo en el mapa de ubicación (solo código y estado: sin precios).
  const estados: Record<string, ClaseLote> = {};
  for (const l of lotes) {
    if (l.estado === "vendido") estados[l.lote] = "vendido";
    else if (l.estado === "bloqueado") estados[l.lote] = "reservado";
  }
  for (const b of bloqueados) estados[`${b.mz}-${b.lt}`] = "gerencia";
  return (
    <>
      <BotonVerPlano />
      <LoteActivoProvider inicial={lote}>
      <AjustePantalla>
        <div className="w-full lg:flex lg:max-w-[calc(36rem/var(--escala,1))] lg:shrink-0 lg:flex-col">
          {lotes.length > 0 ? (
            <Simulador lotes={lotes} loteInicial={lote} />
          ) : (
            <p className="card px-5 py-8 text-center text-sm text-[var(--text-secondary)]">
              No hay lotes disponibles para cotizar en este momento.
            </p>
          )}
        </div>
        <ColumnaDerecha estados={estados} />
      </AjustePantalla>
      </LoteActivoProvider>
      <BondadesCarrusel />
      <MediosDePago />
      <footer className="mx-auto flex w-full max-w-[88rem] flex-col items-center gap-4 px-4 pb-10 lg:px-6">
        <p className="text-center text-xs leading-relaxed text-[var(--text-muted)] sm:text-[13px]">
          © 2026 CEINYS — Constructora e Inmobiliaria · RUC 20611776391 · Todos
          los derechos reservados.
        </p>
        <RedesSociales />
      </footer>
    </>
  );
}
