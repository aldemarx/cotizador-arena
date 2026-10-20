import { Simulador } from "@/components/Simulador";
import { LOTES } from "@/lib/altosDeSacta";
import { ClubHouseShowcase } from "@/components/ClubHouseShowcase";
import { BondadesCarrusel } from "@/components/BondadesCarrusel";
import { AjustePantalla } from "@/components/AjustePantalla";
import { RedesSociales } from "@/components/RedesSociales";
import { MediosDePago } from "@/components/MediosDePago";

// Plantilla sin base de datos: los productos salen del JSON de src/data (ver docs/plantilla-cotizador-marca-blanca.md).
export default function Home() {
  const lotes = LOTES;
  return (
    <>
      <AjustePantalla>
        <div className="w-full lg:flex lg:max-w-[calc(36rem/var(--escala,1))] lg:shrink-0 lg:flex-col">
          {lotes.length > 0 ? (
            <Simulador lotes={lotes} />
          ) : (
            <p className="card px-5 py-8 text-center text-sm text-[var(--text-secondary)]">
              No hay lotes disponibles para cotizar en este momento.
            </p>
          )}
        </div>
        <div className="w-full lg:flex lg:flex-1 lg:flex-col">
          <ClubHouseShowcase />
        </div>
      </AjustePantalla>
      <BondadesCarrusel />
      <MediosDePago />
      <footer className="mx-auto flex w-full max-w-[88rem] flex-col items-center gap-4 px-4 pb-10 lg:px-6">
        <p className="text-center text-xs leading-relaxed text-[var(--text-muted)]">
          © 2026 CEINYS — Constructora e Inmobiliaria · RUC 20611776391 · Todos
          los derechos reservados.
        </p>
        <RedesSociales />
      </footer>
    </>
  );
}
