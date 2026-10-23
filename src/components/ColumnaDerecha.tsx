"use client";

import { useState } from "react";
import { ClubHouseShowcase } from "@/components/ClubHouseShowcase";
import { VistaPreviaLote } from "@/components/VistaPreviaLote";

/**
 * Columna derecha: ubicación del lote y carrusel del club, unidos como una sola tarjeta (mitad y mitad). El botón del mapa lo expande
 * a todo el alto y oculta el carrusel, para dejar la pantalla en mitad plano, mitad cotizador.
 */
export function ColumnaDerecha() {
  const [expandido, setExpandido] = useState(false);
  return (
    <div className="flex w-full flex-col lg:min-h-0 lg:flex-1">
      {/* Cada bloque va en su propia caja sin relleno, para que el reparto del alto sea exactamente igual. */}
      <div
        className={`flex flex-col lg:min-h-0 lg:flex-[1_1_0px] ${expandido ? "" : "[&>section]:rounded-b-none [&>section]:border-b-0 [&>section]:shadow-none"}`}
      >
        <VistaPreviaLote expandido={expandido} onExpandir={() => setExpandido((e) => !e)} />
      </div>
      <div className={`flex-col lg:min-h-0 lg:flex-[1_1_0px] [&>div]:rounded-t-none ${expandido ? "hidden" : "flex"}`}>
        <ClubHouseShowcase />
      </div>
    </div>
  );
}
