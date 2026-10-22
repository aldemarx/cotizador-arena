"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** Botón flotante (abajo a la derecha) que lleva al plano, ya ubicado en el lote que se está cotizando. */
export function BotonVerPlano() {
  const lote = useSearchParams().get("lote");
  return (
    <Link
      href={lote ? `/mapa?lote=${encodeURIComponent(lote)}` : "/mapa"}
      className="fixed right-4 bottom-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--ceinys-grafito-700)] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(20,22,28,0.3)] transition-colors hover:bg-[var(--ceinys-grafito-900)] sm:right-6 sm:bottom-6"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
        <path d="M9 3v15M15 6v15" />
      </svg>
      Ver plano
    </Link>
  );
}
