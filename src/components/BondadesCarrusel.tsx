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
    label: "Laguna y plaza central",
    icono: svgIcono(
      <>
        <path d="M2 12c2-4 4-6 6-6s4 4 6 4 4-4 6-4" />
        <path d="M2 18c2-4 4-6 6-6s4 4 6 4 4-4 6-4" />
      </>,
    ),
    foto: "/images/club-carhuaz/club-01.webp",
  },
  {
    label: "Canchas deportivas",
    // Cancha vista desde arriba: borde, línea central y círculo.
    icono: svgIcono(
      <>
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <path d="M12 5v14" />
        <circle cx="12" cy="12" r="2.6" />
      </>,
    ),
    foto: "/images/club-carhuaz/club-02.webp",
  },
  {
    label: "Piscina tipo laguna",
    // Piscina con escalera y dos líneas de agua.
    icono: svgIcono(
      <>
        <path d="M8 3v11M16 3v11" />
        <path d="M8 6h8M8 10h8" />
        <path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
        <path d="M2 22c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      </>,
    ),
    foto: "/images/club-carhuaz/club-03.webp",
  },
  {
    label: "Áreas verdes y juegos",
    // Árbol dibujado en código; reemplazable por un SVG propio.
    icono: svgIcono(
      <>
        <path d="M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z" />
        <path d="M12 19v3" />
      </>,
    ),
    foto: "/images/club-carhuaz/club-04.webp",
  },
  {
    label: "Parque y zona de juegos",
    icono: imgIcono("playground"),
    foto: "/images/club-carhuaz/club-05.webp",
  },
];

// Los 3 colores del isotipo rotan entre los íconos activos.
const COLORES = ["#10b981", "#F5A623", "#3b82f6"];

const TOTAL = BONDADES.length;
const AUTOPLAY_MS = 3500;

/**
 * Amenidades del proyecto. Mismo lenguaje visual que el resto de la página:
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
          {/* Símbolo del club, en su color original, junto al nombre */}
          <div className="flex items-center justify-center gap-4 sm:gap-5 lg:justify-start lg:pl-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/club-carhuaz/simbolo-club-carhuaz.webp"
              alt=""
              aria-hidden
              className="block h-14 w-auto shrink-0 sm:h-[4.5rem]"
            />
            <span aria-hidden className="h-12 w-px shrink-0 bg-[var(--border)] sm:h-16" />
            <div className="text-left">
              <h2 className="m-0 text-2xl leading-none font-medium text-[var(--text-primary)] sm:text-4xl">
                Club <strong className="font-extrabold">Carhuaz</strong>
              </h2>
              <p className="m-0 mt-1 text-[13px] leading-none text-[var(--text-secondary)] sm:mt-1.5 sm:text-base">
                El club más grande de Ica.{" "}
                <strong className="font-semibold text-[var(--text-primary)]">Conoce más.</strong>
              </p>
            </div>
          </div>
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
                alt={`${b.label} - Arenas del Valle`}
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
