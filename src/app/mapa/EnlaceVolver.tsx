"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

/**
 * «← Volver al cotizador»: regresa al mismo lote que se estaba viendo. Lee el lote de la dirección real
 * del navegador (y no del que trae la página), porque sin conexión la página viene de la copia guardada
 * con el lote que tenía al guardarse.
 */
export function EnlaceVolver({
  loteDelServidor,
}: {
  loteDelServidor?: string;
}) {
  const lote = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("lote") ?? undefined,
    () => loteDelServidor,
  );
  return (
    <Link
      href={lote ? `/?lote=${encodeURIComponent(lote)}` : "/"}
      className="inline-flex min-h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
    >
      ← Volver al cotizador
    </Link>
  );
}
