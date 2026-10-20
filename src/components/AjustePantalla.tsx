"use client";

import { useLayoutEffect, useRef, useState } from "react";

const ANCHO_MAX_REM = 88; // mismo ancho máximo que el resto de la página
const AIRE_BAJO_BARRA_PX = 24;
const MARGEN_INFERIOR_PX = 28;
const ESCALA_MIN = 0.6;
const ESCALA_MAX = 1.3; // tope de crecimiento en monitores grandes
const FACTOR_CRECIMIENTO = 0.5; // fracción del espacio sobrante que se aprovecha
const BREAKPOINT_LG = 1024;

/**
 * Hace que el bloque principal (cotizador + Club House) ocupe siempre la
 * primera pantalla completa en escritorio: se centra en vertical y, si el
 * alto de la ventana no alcanza, se reduce proporcionalmente (sin cambiar el
 * ancho visual ni los márgenes laterales); si sobra alto (pantalla completa en
 * monitores grandes), crece hasta aprovecharlo. En móvil/tablet no hace nada.
 */
export function AjustePantalla({ children }: { children: React.ReactNode }) {
  const interiorRef = useRef<HTMLDivElement>(null);
  const contenidoRef = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const escalaRef = useRef(1);
  const [alto, setAlto] = useState<number | null>(null);

  useLayoutEffect(() => {
    const interior = interiorRef.current;
    const contenido = contenidoRef.current;
    if (!interior || !contenido) return;

    function recalcular() {
      if (!contenido) return;
      if (window.innerWidth < BREAKPOINT_LG) {
        escalaRef.current = 1;
        setEscala(1);
        setAlto(null);
        return;
      }
      const natural = contenido.offsetHeight;
      const barra = document.getElementById("barra-superior")?.offsetHeight ?? 56;
      const margenSuperior = barra + AIRE_BAJO_BARRA_PX;
      const disponible = window.innerHeight - margenSuperior - MARGEN_INFERIOR_PX;
      // Al crecer, el ancho de maquetación se mantiene en 88rem: el tope evita salirse de la ventana.
      const tope = Math.min(ESCALA_MAX, (window.innerWidth - 48) / (ANCHO_MAX_REM * 16));
      let necesaria = Math.min(Math.max(1, tope), Math.max(ESCALA_MIN, disponible / natural));
      // Al crecer solo se aprovecha la mitad del espacio libre: se ve más sobrio y con aire.
      if (necesaria > 1) necesaria = 1 + (necesaria - 1) * FACTOR_CRECIMIENTO;
      necesaria = Math.round(necesaria * 100) / 100;
      // Histéresis: el alto natural depende del ancho (y por tanto de la escala),
      // así que solo se reescala si ya no cabe o si sobra bastante espacio.
      // Evita el bucle de parpadeo entre dos escalas cercanas.
      const previa = escalaRef.current;
      // Al crecer (escala >= 1) el alto natural no depende de la escala: sin histéresis.
      const crece = necesaria >= 1 && previa >= 1;
      const s = crece || necesaria < previa - 0.005 || necesaria > previa * 1.08 ? necesaria : previa;
      escalaRef.current = s;
      setEscala(s);
      setAlto(natural * s);
    }

    recalcular();
    const ro = new ResizeObserver(recalcular);
    ro.observe(contenido);
    window.addEventListener("resize", recalcular);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalcular);
    };
  }, []);

  const escalado = alto !== null && Math.abs(escala - 1) > 0.005;

  return (
    <div className="lg:box-border lg:flex lg:min-h-screen lg:items-center lg:pt-[calc(var(--barra-h)-4px)]">
      <div className="w-full" style={escalado ? { height: alto ?? undefined } : undefined}>
        <div
          ref={interiorRef}
          style={
            escalado
              ? { width: `${100 / escala}%`, transform: `scale(${escala})`, transformOrigin: "top left" }
              : undefined
          }
        >
          <div
            ref={contenidoRef}
            className="mx-auto flex w-full flex-col gap-6 min-[1200px]:relative min-[1200px]:left-3 px-4 pt-5 pb-6 lg:flex-row lg:items-stretch lg:gap-12 lg:px-6 lg:py-0"
            style={
              {
                maxWidth: `${ANCHO_MAX_REM / (escalado ? Math.min(1, escala) : 1)}rem`,
                "--escala": escalado ? Math.min(1, escala) : 1,
              } as React.CSSProperties
            }
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
