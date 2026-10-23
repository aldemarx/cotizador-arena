"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Lote que se está cotizando. El cotizador lo escribe cada vez que cambia y otras partes de la página (la vista previa del lote)
 * lo leen, sin tener que subir el estado hasta la página. En sentido contrario, la vista previa puede pedir otro lote (`pedir`) tocándolo
 * en su plano; el cotizador atiende el pedido (`pedido`) y publica el nuevo lote.
 */
type Pedido = { codigo: string; n: number };
type Valor = { codigo: string | null; elegir: (codigo: string) => void; pedido: Pedido | null; pedir: (codigo: string) => void };
const Contexto = createContext<Valor>({ codigo: null, elegir: () => {}, pedido: null, pedir: () => {} });

export function LoteActivoProvider({
  inicial,
  children,
}: {
  inicial?: string;
  children: React.ReactNode;
}) {
  const [codigo, setCodigo] = useState<string | null>(inicial ?? null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const valor = useMemo(
    () => ({ codigo, elegir: setCodigo, pedido, pedir: (c: string) => setPedido((p) => ({ codigo: c, n: (p?.n ?? 0) + 1 })) }),
    [codigo, pedido],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useLoteActivo = () => useContext(Contexto);
