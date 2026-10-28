"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Selector de manzana con la lista en dos columnas y el estilo del proyecto (en vez del desplegable del navegador).
 * `compacto` es la versión pequeña del plano («Mz R4 ▾»); la normal es el campo ancho del cotizador.
 */
export function SelectorManzana({
  manzanas,
  valor,
  onCambiar,
  compacto = false,
  anchoCompleto = false,
}: {
  manzanas: string[];
  valor: string;
  onCambiar: (mz: string) => void;
  compacto?: boolean;
  /** La lista abre con el ancho del contenedor que la rodea (que debe ser `relative`), no con el del botón: para cuando el botón ocupa media columna. */
  anchoCompleto?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activa = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    // La manzana elegida queda a la vista al abrir la lista.
    activa.current?.scrollIntoView({ block: "nearest" });
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  return (
    <div ref={ref} className={anchoCompleto ? "" : `relative ${compacto ? "shrink-0" : "w-full"}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label="Manzana"
        onClick={() => setAbierto((a) => !a)}
        className={
          compacto
            ? "flex h-10 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
            : "selectCampo relative flex h-12 w-full items-center !py-0 !pr-12 !pl-12 text-center !font-semibold"
        }
      >
        {!compacto && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--ceinys-grafito-700)] text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">
          {compacto ? `Mz ${valor}` : anchoCompleto ? (
            <>
              <span className="sm:hidden">Mz</span>
              <span className="max-sm:hidden">Manzana</span> {valor}
            </>
          ) : `Manzana ${valor}`}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${compacto ? "" : "absolute top-1/2 right-3 -translate-y-1/2"} ${abierto ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <div
          role="listbox"
          aria-label="Manzanas"
          className={`absolute top-full z-30 rounded-xl border border-[var(--border)] bg-white p-2 shadow-[0_12px_32px_rgba(20,22,28,0.14)] ${
            anchoCompleto ? "inset-x-4 -mt-1" : `left-0 mt-1.5 ${compacto ? "w-52" : "w-full"}`
          }`}
        >
          <div
            className={`grid max-h-64 gap-1.5 overflow-y-auto sm:gap-1 ${anchoCompleto ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2"}`}
          >
            {manzanas.map((mz) => {
              const elegida = mz === valor;
              return (
                <button
                  key={mz}
                  ref={elegida ? activa : undefined}
                  type="button"
                  role="option"
                  aria-selected={elegida}
                  onClick={() => {
                    onCambiar(mz);
                    setAbierto(false);
                  }}
                  className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${anchoCompleto ? "text-center" : "text-left"} ${
                    elegida
                      ? "bg-[var(--ceinys-grafito-700)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] max-sm:border max-sm:border-[var(--border)]"
                  }`}
                >
                  {anchoCompleto ? `Mz ${mz}` : `Manzana ${mz}`}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
