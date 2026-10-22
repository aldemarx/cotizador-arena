"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Lote que se está cotizando. El cotizador lo escribe cada vez que cambia y otras partes de la página (la vista previa del lote)
 * lo leen, sin tener que subir el estado hasta la página.
 */
type Valor = { codigo: string | null; elegir: (codigo: string) => void };
const Contexto = createContext<Valor>({ codigo: null, elegir: () => {} });

export function LoteActivoProvider({
  inicial,
  children,
}: {
  inicial?: string;
  children: React.ReactNode;
}) {
  const [codigo, setCodigo] = useState<string | null>(inicial ?? null);
  const valor = useMemo(() => ({ codigo, elegir: setCodigo }), [codigo]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useLoteActivo = () => useContext(Contexto);
