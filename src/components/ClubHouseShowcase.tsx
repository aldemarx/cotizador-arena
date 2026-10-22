"use client";

import { useEffect, useRef, useState } from "react";

// Fotos del carrusel del club (public/images/club-carhuaz/, en webp para que pesen poco). Los títulos describen lo que muestra cada render.
const FOTOS = [
  { src: "/images/club-carhuaz/club-01.webp", titulo: "Laguna y plaza central" },
  { src: "/images/club-carhuaz/club-02.webp", titulo: "Canchas deportivas" },
  { src: "/images/club-carhuaz/club-03.webp", titulo: "Piscina tipo laguna" },
  { src: "/images/club-carhuaz/club-04.webp", titulo: "Áreas verdes y juegos" },
  { src: "/images/club-carhuaz/club-05.webp", titulo: "Parque y zona de juegos" },
];

/**
 * Dos versiones del panel para comparar: «arena» (clara: blanco perla, que hace juego con las tarjetas del cotizador) y «ladrillo» (oscura, más
 * dramática). Cambiar `TEMA` basta para pasar de una a otra.
 */
const TEMA: "arena" | "ladrillo" = "arena";

const TEMAS = {
  arena: {
    // Humo claro, liso (sin degradado ni tinte de color): gris perla neutro que se distingue del fondo de la página.
    panel: "border border-[#dddcd8] text-[#4a2c22] shadow-[0_10px_30px_-18px_rgba(30,30,28,0.3)]",
    fondo: "#efefed",
    simbolo: "/images/club-carhuaz/simbolo-club-carhuaz.webp",
    linea: "bg-[#4a2c22]/20",
    titulo: "text-[#4a2c22]",
    subtitulo: "text-[#7a5a4c]",
    marco: "border-[3px] border-white bg-white shadow-[0_14px_32px_-14px_rgba(74,44,34,0.55)]",
    foco: "focus-visible:outline-[#b5573b]",
    pastilla: "bg-white/75 text-[#4a2c22]",
    flecha: "bg-white/90 text-[#4a2c22] shadow-md hover:bg-white",
    pie: "from-black/45 via-black/15",
    barra: "bg-white/45",
    barraActiva: "bg-[#b5573b]",
  },
  ladrillo: {
    panel: "text-white",
    fondo:
      "radial-gradient(120% 90% at 0% 0%, rgba(255,190,140,0.22) 0%, rgba(255,190,140,0) 55%), linear-gradient(160deg, #9a4a32 0%, #5c2316 100%)",
    simbolo: "/images/club-carhuaz/simbolo-club-carhuaz-blanco.webp",
    linea: "bg-white/30",
    titulo: "text-white",
    subtitulo: "text-white/80",
    marco: "border border-white/25 bg-black/20 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)]",
    foco: "focus-visible:outline-white",
    pastilla: "bg-black/35 text-white",
    flecha: "border border-white/30 bg-black/30 text-white hover:bg-black/45",
    pie: "from-black/65 via-black/25",
    barra: "bg-white/35",
    barraActiva: "bg-white",
  },
} as const;
const T = TEMAS[TEMA];

/** Tiempo que se ve cada foto antes de pasar a la siguiente. */
const DURACION_MS = 4500;
const PASO_MS = 60;

export function ClubHouseShowcase() {
  const [activo, setActivo] = useState(0);
  // Avance (0 a 1) de la foto actual: llena la barra de su segmento y decide cuándo pasar a la siguiente.
  const [avance, setAvance] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [sinMovimiento, setSinMovimiento] = useState(false);
  const total = FOTOS.length;
  const inicioX = useRef<number | null>(null);

  function irA(indice: number) {
    setActivo(((indice % total) + total) % total);
    setAvance(0);
  }

  // Quien pide menos movimiento en su sistema no ve el avance automático.
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Lee una preferencia del sistema (externo) al montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSinMovimiento(q.matches);
    const alCambiar = () => setSinMovimiento(q.matches);
    q.addEventListener("change", alCambiar);
    return () => q.removeEventListener("change", alCambiar);
  }, []);

  useEffect(() => {
    if (pausado || sinMovimiento || total < 2) return;
    const t = setInterval(() => {
      setAvance((a) => {
        const n = a + PASO_MS / DURACION_MS;
        if (n < 1) return n;
        setActivo((x) => (x + 1) % total);
        return 0;
      });
    }, PASO_MS);
    return () => clearInterval(t);
  }, [pausado, sinMovimiento, total]);

  return (
    <div
      className={`overflow-hidden rounded-2xl p-6 sm:p-8 lg:flex lg:flex-1 lg:flex-col ${T.panel}`}
      style={{ background: T.fondo }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        {/* Símbolo del club: en su color original sobre la arena y en blanco sobre el ladrillo. */}
        <div className="flex items-center justify-center gap-4 sm:gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={T.simbolo}
            alt=""
            aria-hidden
            className="block h-14 w-auto shrink-0 sm:h-16"
          />
          <span aria-hidden className={`h-12 w-px shrink-0 sm:h-14 ${T.linea}`} />
          <div className="text-left">
            <h2 className={`m-0 text-2xl leading-none font-medium sm:text-3xl ${T.titulo}`}>
              Club <strong className="font-extrabold">Carhuaz</strong>
            </h2>
            <p className={`m-0 mt-1.5 text-[13px] sm:text-[15px] ${T.subtitulo}`}>El club más grande de Ica. Conoce más.</p>
          </div>
        </div>
      </div>

      <div
        role="region"
        aria-roledescription="carrusel"
        aria-label="Fotos del Club Carhuaz"
        tabIndex={0}
        className={`group relative mt-6 h-[300px] w-full cursor-pointer touch-pan-y overflow-hidden rounded-[22px] select-none focus-visible:outline-2 focus-visible:outline-offset-2 ${T.marco} ${T.foco} sm:h-[400px] lg:h-0 lg:min-h-[140px] lg:flex-[1_1_0px]`}
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        onFocus={() => setPausado(true)}
        onBlur={() => setPausado(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") irA(activo + 1);
          if (e.key === "ArrowLeft") irA(activo - 1);
        }}
        // Tocar o hacer clic en la foto pasa a la siguiente; deslizar a un lado va a la siguiente o a la anterior.
        onPointerDown={(e) => {
          inicioX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (inicioX.current == null) return;
          const dx = e.clientX - inicioX.current;
          inicioX.current = null;
          if ((e.target as Element).closest("button")) return; // los segmentos de abajo tienen su propia acción
          if (Math.abs(dx) > 40) irA(activo + (dx < 0 ? 1 : -1));
          else irA(activo + 1);
        }}
      >
        {/* Fundido entre fotos: todas apiladas, solo la actual es visible */}
        {FOTOS.map((f, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.src}
            src={f.src}
            alt={i === activo ? `Club Carhuaz: ${f.titulo}` : ""}
            aria-hidden={i !== activo}
            draggable={false}
            loading={i === 0 ? "eager" : "lazy"}
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 [-webkit-user-drag:none] ${i === activo ? "opacity-100" : "opacity-0"}`}
          />
        ))}

        {/* Pie sobre un degradado oscuro: qué se ve, cuál foto es y el avance de cada una */}
        <div className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t ${T.pie} to-transparent px-3.5 pt-12 pb-2.5`}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className={`m-0 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md sm:text-sm ${T.pastilla}`}>
              {FOTOS[activo].titulo}
            </p>
            <p className={`m-0 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md [font-variant-numeric:tabular-nums] sm:text-[13px] ${T.pastilla}`}>
              {activo + 1} / {total}
            </p>
          </div>
          <div className="flex gap-1.5">
            {FOTOS.map((f, i) => (
              <button
                key={f.src}
                type="button"
                aria-label={`Ir a la foto ${i + 1}: ${f.titulo}`}
                aria-current={i === activo}
                onClick={() => irA(i)}
                className="group/seg flex h-5 flex-1 items-center"
              >
                <span className={`relative block h-1 w-full overflow-hidden rounded-full transition-[height] group-hover/seg:h-1.5 ${T.barra}`}>
                  <span
                    className={`absolute inset-y-0 left-0 block rounded-full ${i === activo ? T.barraActiva : "bg-white"}`}
                    style={{ width: i < activo ? "100%" : i === activo ? `${sinMovimiento ? 100 : avance * 100}%` : "0%" }}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
