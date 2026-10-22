"use client";

import { useEffect, useRef, useState } from "react";
import { PLAZO_PROMOCION, type Promocion } from "@/lib/arenas";
import { CajaPrecio } from "@/components/CajaPrecio";
import { Soles } from "@/components/Soles";

/**
 * Etiqueta «Promoción» junto a la ubicación del lote. Las condiciones promocionales se abren en un globo flotante,
 * así el cotizador mide siempre lo mismo tenga o no promoción el lote.
 */
export function ChipPromocion({
  promocion,
  alinear = "izquierda",
  tono = "ambar",
}: {
  promocion: Promocion;
  /** Hacia qué lado se abre el globo respecto de la etiqueta. */
  alinear?: "izquierda" | "derecha";
  /** «verde»: sólido con texto blanco (para la cabecera verde de Fraccionamiento). */
  tono?: "ambar" | "verde";
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);
  const financiada =
    promocion.precio_promo_financiado != null && promocion.cuota_promo != null;
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] leading-none font-bold tracking-wider whitespace-nowrap uppercase transition-colors sm:px-3 sm:py-1.5 sm:text-[13px] ${tono === "verde" ? "bg-[#5f9b3c] text-white shadow-sm hover:bg-[#4c8030]" : "bg-[#F5A623]/15 text-[#b45309] hover:bg-[#F5A623]/25"}`}
      >
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5">
          <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <path d="M7 7h.01" />
        </svg>
        Promo
      </button>
      {abierto && (
        <div
          role="dialog"
          aria-label="Condiciones de la promoción"
          className={`absolute top-full z-30 mt-2 w-[min(21rem,calc(100vw-3rem))] rounded-xl border border-[#F5A623]/40 bg-white p-3 shadow-[0_12px_32px_rgba(20,22,28,0.18)] ${alinear === "derecha" ? "right-0" : "left-0"}`}
        >
          <p className="m-0 mb-2.5 text-center text-xs font-bold tracking-wider text-[#b45309] uppercase sm:text-[13px]">
            Promoción {promocion.tipo === "standard" ? "Standard" : "Preferencial"}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className={financiada ? "" : "col-span-2"}>
              <CajaPrecio etiqueta="Al contado" destacado>
                <Soles monto={promocion.precio_promo_contado} />
              </CajaPrecio>
            </div>
            {financiada && (
              <CajaPrecio etiqueta="Financiada">
                <Soles monto={promocion.precio_promo_financiado!} />
              </CajaPrecio>
            )}
            {financiada && (
              <div className="col-span-2">
                <CajaPrecio etiqueta={`Cuota promocional · ${PLAZO_PROMOCION} cuotas`} destacado>
                  <Soles monto={promocion.cuota_promo!} />
                </CajaPrecio>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
