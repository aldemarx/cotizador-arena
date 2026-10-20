"use client";

import { useEffect, useRef, useState } from "react";

type Bondad = { label: string; icono: React.ReactNode; foto: string };

const imgIcono = (nombre: string) => (
  <span
    className="block h-6 w-6 bg-current"
    style={{
      WebkitMaskImage: `url(/icons-carrusel/${nombre}.png)`,
      maskImage: `url(/icons-carrusel/${nombre}.png)`,
      WebkitMaskSize: "contain",
      maskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
    }}
  />
);

const svgIcono = (children: React.ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    {children}
  </svg>
);

const BONDADES: Bondad[] = [
  {
    label: "Cancha de polo",
    icono: svgIcono(
      <>
        <circle cx="12" cy="6" r="3" />
        <path d="M5 21c0-4 3-7 7-7s7 3 7 7" />
        <path d="M3 13c1-2 3-3 5-3M21 13c-1-2-3-3-5-3" />
      </>,
    ),
    foto: "/images/altos/polo.webp",
  },
  {
    label: "Equitación",
    // Herradura dibujada en código; reemplazable por un SVG de caballo.
    icono: svgIcono(
      <>
        <path d="M5 21V11a7 7 0 0 1 14 0v10h-4.5V11a2.5 2.5 0 0 0-5 0v10z" />
        <path d="M5 16h4.5M14.5 16H19" />
      </>,
    ),
    foto: "/images/altos/equitacion.webp",
  },
  {
    label: "Zona de golf",
    // Bandera con hoyo y pelota dibujados en código; reemplazable por un SVG de golf.
    icono: svgIcono(
      <>
        <path d="M9 21V3l8 4-8 4" />
        <path d="M4 21h16" />
        <circle cx="16.5" cy="18.2" r="1" />
      </>,
    ),
    foto: "/images/altos/golf.webp",
  },
  {
    label: "Pérgola",
    // Pérgola dibujada en código; reemplazable por un SVG propio.
    icono: svgIcono(
      <>
        <path d="M2.5 6h19" />
        <path d="M5 6v15M19 6v15" />
        <path d="M7 3.5v2.5M12 3.5v2.5M17 3.5v2.5" />
        <path d="M5 11l-2 0M19 11l2 0" />
      </>,
    ),
    foto: "/images/altos/pergola.webp",
  },
  {
    label: "Parques",
    icono: imgIcono("parques"),
    foto: "/images/altos/parque.webp",
  },
  {
    label: "Playground",
    icono: imgIcono("playground"),
    foto: "/images/altos/playground.webp",
  },
  {
    label: "Gimnasio al aire libre",
    icono: imgIcono("gimnasio"),
    foto: "/images/altos/gimnasio-aire-libre.webp",
  },
  {
    label: "Alameda",
    // Árbol dibujado en código; reemplazable por un SVG propio.
    icono: svgIcono(
      <>
        <path d="M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z" />
        <path d="M12 19v3" />
      </>,
    ),
    foto: "/images/altos/alameda.webp",
  },
  {
    label: "Laguna artificial",
    icono: svgIcono(
      <>
        <path d="M2 12c2-4 4-6 6-6s4 4 6 4 4-4 6-4" />
        <path d="M2 18c2-4 4-6 6-6s4 4 6 4 4-4 6-4" />
      </>,
    ),
    foto: "/images/altos/laguna.webp",
  },
];

// Los 3 colores del isotipo rotan entre los íconos activos.
const COLORES = ["#10b981", "#F5A623", "#3b82f6"];

const TOTAL = BONDADES.length;
const AUTOPLAY_MS = 3500;

/**
 * Amenidades de Altos de Sacta. Mismo lenguaje visual que el resto de la página:
 * tarjeta dentro del mismo contenedor que el cotizador, con la lista de
 * amenidades a la izquierda y la foto a la derecha.
 */
export function BondadesCarrusel() {
  const [activo, setActivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const irA = (i: number) => setActivo(((i % TOTAL) + TOTAL) % TOTAL);

  useEffect(() => {
    if (pausado) return;
    const id = setInterval(
      () => setActivo((a) => (a + 1) % TOTAL),
      AUTOPLAY_MS,
    );
    return () => clearInterval(id);
  }, [pausado, activo]);

  const actual = BONDADES[activo];
  const colorActivo = COLORES[activo % 3];

  return (
    <section className="mx-auto w-full max-w-[88rem] px-4 pb-10 lg:px-6 lg:pb-14">
      <div className="card p-6 lg:p-10">
        <div className="mb-4 flex flex-col gap-2 border-b border-[var(--border)] pb-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:pb-8">
          <div className="text-center lg:pl-6 lg:text-left">
            <p className="flex items-center justify-center gap-3 text-xs font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase lg:justify-start">
              <span className="flex shrink-0 items-center gap-1" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#F5A623]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
              </span>
              Entorno natural
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-[var(--text-primary)] sm:text-3xl">
              Áreas Comunes y Espacios Recreativos
            </h2>
          </div>
          <p className="text-center text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base lg:text-right">
            Más de 978,000 m² destinados
            <br />a deporte, naturaleza y convivencia familiar.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,21rem)_1fr] lg:items-stretch lg:gap-8">
          {/* Móvil: solo la categoría de la foto actual, cambia junto con el carrusel */}
          <button
            key={actual.label}
            type="button"
            onClick={() => irA(activo + 1)}
            aria-label={`${actual.label}. Siguiente amenidad`}
            className="animate-pop order-1 flex items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-[var(--text-primary)] lg:hidden"
            style={{ borderColor: colorActivo, background: `${colorActivo}14` }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white [&_span]:h-[18px] [&_span]:w-[18px] [&_svg]:h-[18px] [&_svg]:w-[18px]"
              style={{ background: colorActivo }}
            >
              {actual.icono}
            </span>
            {actual.label}
          </button>

          <div className="hidden content-between gap-2.5 rounded-xl bg-[var(--surface-2)] p-3 lg:order-1 lg:grid lg:grid-cols-1">
            {BONDADES.map((b, i) => {
              const on = i === activo;
              const color = COLORES[i % 3];
              return (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => irA(i)}
                  className="flex items-center gap-3 rounded-[10px] border px-3 py-2 text-left text-sm font-semibold transition-colors"
                  style={
                    on
                      ? {
                          borderColor: color,
                          background: `${color}14`,
                          color: "var(--text-primary)",
                        }
                      : {
                          borderColor: "var(--border)",
                          background: "var(--surface-1)",
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors [&_svg]:h-[18px] [&_svg]:w-[18px] [&_span]:h-[18px] [&_span]:w-[18px]"
                    style={
                      on
                        ? { background: color, color: "#fff" }
                        : {
                            background: "rgba(27,27,27,0.08)",
                            color: "var(--primary)",
                          }
                    }
                  >
                    {b.icono}
                  </span>
                  {b.label}
                </button>
              );
            })}
          </div>

          <div
            className="relative order-2 aspect-[4/3] cursor-pointer touch-pan-y overflow-hidden rounded-xl select-none bg-[#d9dbe0] sm:aspect-[16/9] lg:order-2 lg:aspect-auto lg:min-h-[26rem]"
            onClick={() => irA(activo + 1)}
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            onTouchStart={(e) => {
              const t = e.touches[0];
              touchStart.current = { x: t.clientX, y: t.clientY };
              setPausado(true);
            }}
            onTouchEnd={(e) => {
              const t = e.changedTouches[0];
              const s = touchStart.current;
              if (s) {
                const dx = t.clientX - s.x;
                const dy = t.clientY - s.y;
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy))
                  irA(dx < 0 ? activo + 1 : activo - 1);
              }
              setPausado(false);
            }}
          >
            {BONDADES.map((b, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={b.label}
                src={b.foto}
                alt={`${b.label} - Altos de Sacta`}
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 select-none [-webkit-user-drag:none]"
                style={{ opacity: i === activo ? 1 : 0 }}
              />
            ))}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
            <p className="absolute bottom-4 left-4 hidden items-center gap-2 lg:flex text-sm font-semibold text-white sm:text-base">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: colorActivo }}
              />
              {actual.label}
            </p>
            <div className="absolute right-4 bottom-4 flex gap-1.5">
              {BONDADES.map((b, i) => (
                <button
                  key={b.label}
                  type="button"
                  aria-label={b.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    irA(i);
                  }}
                  className="h-[7px] w-[7px] rounded-full transition-colors"
                  style={{
                    background:
                      i === activo ? "#fff" : "rgba(255,255,255,0.55)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
