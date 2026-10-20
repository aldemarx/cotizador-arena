"use client";

import { useEffect, useRef, useState } from "react";

const COLORS = ["#F5A623", "#10b981", "#3b82f6"];

const FEATURES: { label: string; icon: React.ReactNode; foto?: string }[] = [
  {
    label: "Shopping Center",
    icon: (
      <>
        <path d="M16 10a4 4 0 0 1-8 0" />
        <path d="M3.103 6.034h17.794" />
        <path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" />
      </>
    ),
    foto: "/images/altos/shoppingcenter.webp",
  },
  {
    label: "Terraza",
    icon: (
      <>
        <path d="M12.5 11.134 18.196 21" />
        <path d="M20.425 5.299a10 10 0 0 0-16.941 9.78c.183.563.843.774 1.355.478L20.16 6.711c.512-.296.66-.973.264-1.413" />
        <path d="M21 21H3" />
      </>
    ),
    foto: "/images/altos/terraza.webp",
  },
  {
    label: "Piscina",
    icon: (
      <>
        <path d="M19 5a2 2 0 0 0-2 2v11" />
        <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M7 13h10" />
        <path d="M7 9h10" />
        <path d="M9 5a2 2 0 0 0-2 2v11" />
      </>
    ),
    foto: "/images/altos/piscina.webp",
  },
  {
    label: "Salón de Eventos",
    icon: (
      <>
        <path d="M5.8 11.3 2 22l10.7-3.79" />
        <path d="M4 3h.01" />
        <path d="M22 8h.01" />
        <path d="M15 2h.01" />
        <path d="M22 20h.01" />
        <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
        <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" />
        <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" />
        <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
      </>
    ),
    foto: "/images/altos/saloneventos.webp",
  },
  {
    label: "Zona Deportiva",
    icon: (
      <>
        <path d="M11 7a16 16 20 0 1 10.98 4.362" />
        <path d="M12 12a13 13 0 0 1-8.66 5" />
        <path d="M16.83 13.634a16 16 0 0 1-9.267 7.328" />
        <path d="M20.66 17A13 13 0 0 0 12 12a13 13 0 0 1 0-10" />
        <path d="M8.17 15.366a16 16 0 0 1-1.713-11.69" />
        <circle cx="12" cy="12" r="10" />
      </>
    ),
    foto: "/images/altos/canchatenis.webp",
  },
  {
    label: "Gimnasio / Spa",
    icon: (
      <>
        <path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" />
        <path d="m2.5 21.5 1.4-1.4" />
        <path d="m20.1 3.9 1.4-1.4" />
        <path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" />
        <path d="m9.6 14.4 4.8-4.8" />
      </>
    ),
    foto: "/images/altos/gimnasio.webp",
  },
  {
    label: "Wine Bar",
    icon: (
      <>
        <path d="M8 22h8" />
        <path d="M7 10h10" />
        <path d="M12 15v7" />
        <path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />
      </>
    ),
    foto: "/images/altos/winebar.webp",
  },
  {
    label: "Zona de Parrillas",
    icon: (
      <>
        <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />
      </>
    ),
    foto: "/images/altos/parrilla.webp",
  },
];

// Render referencial — pendiente de reemplazar por la foto real de cada
// ambiente cuando el proyecto la tenga (hoy el sitio principal reusa la
// misma foto para las 8, así que replicamos ese mismo placeholder aquí).
const FOTO_PLACEHOLDER = "/images/altos/vista-aerea-1.jpg";

export function ClubHouseShowcase() {
  const [activo, setActivo] = useState(0);
  const total = FEATURES.length;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inicioClicX = useRef(0);

  function goTo(index: number) {
    setActivo(((index % total) + total) % total);
  }

  function detenerAutoplay() {
    if (timerRef.current) clearInterval(timerRef.current);
  }
  function iniciarAutoplay() {
    detenerAutoplay();
    if (total > 1) {
      timerRef.current = setInterval(() => setActivo((a) => (a + 1) % total), 4500);
    }
  }

  useEffect(() => {
    iniciarAutoplay();
    return detenerAutoplay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseOffsetPct = -activo * 100;

  return (
    <div
      className="overflow-hidden rounded-2xl p-6 text-white sm:p-8 lg:flex lg:flex-1 lg:flex-col"
      style={{
        background: "linear-gradient(135deg, color-mix(in srgb, #1B1B1B 85%, white) 0%, #1B1B1B 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="inline-block rounded-full border border-white/40 bg-white/25 px-3.5 py-1.5 text-xs font-bold tracking-wide text-white uppercase">
          Club House Privado
        </span>
        <h2 className="mt-2 mb-1 text-2xl font-medium text-white sm:text-3xl">
          Club House <strong className="font-extrabold">Sacta</strong>
        </h2>
        <p className="text-[15px] text-white/65">Sin pagar membresía. Acceso completo incluido con tu lote.</p>
      </div>

      <div
        className="relative mt-6 h-[300px] w-full cursor-pointer touch-pan-y overflow-hidden rounded-2xl select-none border border-white/14 sm:h-[400px] lg:h-0 lg:min-h-[220px] lg:flex-[1_1_0px]"
        onPointerDown={(e) => {
          inicioClicX.current = e.clientX;
        }}
        onClick={(e) => {
          // Un arrastre no cuenta como clic: solo avanza con un toque/clic real.
          if (Math.abs(e.clientX - inicioClicX.current) > 6) return;
          goTo(activo + 1);
          iniciarAutoplay();
        }}
        onMouseEnter={detenerAutoplay}
        onMouseLeave={iniciarAutoplay}
      >
        <div className="h-full w-full overflow-hidden select-none">
          <div
            className="flex h-full"
            style={{
              transform: `translateX(${baseOffsetPct}%)`,
              transition: "transform 420ms ease",
            }}
          >
            {FEATURES.map((f) => (
              <div key={f.label} className="h-full w-full flex-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.foto ?? FOTO_PLACEHOLDER}
                  alt={`Render referencial — ${f.label}`}
                  draggable={false}
                  className="pointer-events-none h-full w-full object-cover [-webkit-user-drag:none]"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="absolute right-3.5 bottom-3.5 flex gap-1.5">
          {FEATURES.map((f, i) => (
            <button
              key={f.label}
              type="button"
              aria-label={`Ir a la foto ${i + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                goTo(i);
                iniciarAutoplay();
              }}
              className={`h-[7px] w-[7px] rounded-full transition-colors ${i === activo ? "bg-white" : "bg-white/55"}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {FEATURES.map((f, i) => (
          <button
            key={f.label}
            type="button"
            onClick={() => {
              goTo(i);
              iniciarAutoplay();
            }}
            className={`flex w-full items-center gap-3 rounded-[10px] border px-4 py-3.5 text-left text-sm font-semibold text-white transition-colors ${
              i === activo ? "border-white/30 bg-white/[0.14]" : "border-white/12 bg-white/[0.06] hover:bg-white/10"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS[i % 3]}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 shrink-0"
            >
              {f.icon}
            </svg>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
