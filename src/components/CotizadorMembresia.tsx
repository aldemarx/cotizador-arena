"use client";

import { useState } from "react";
import { CajaPrecio } from "@/components/CajaPrecio";
import { Soles } from "@/components/Soles";
import { TarjetaInfo } from "@/components/TarjetaInfo";
import { formatSoles, formatearMonto } from "@/lib/arenas";
import {
  CUOTAS_MEMBRESIA,
  INICIAL_PORCENTAJE,
  PRECIO_MEMBRESIA,
  TANDAS,
  TANDA_POR_DEFECTO,
  cotizarMembresia,
} from "@/lib/membresiaClub";

const iconoProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "white",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-5 w-5",
} as const;

/**
 * Cotizador de la membresía del Club Carhuaz, con el mismo lenguaje que el cotizador de lotes: tarjetas con cabecera de color,
 * cuota mensual en grande, cajas de precio y botones de selección. Se elige la tanda de clientes (su descuento) y se ve el
 * precio al contado y el fraccionado (inicial del 20 % y 12 cuotas sin interés). Reemplaza al carrusel mientras se cotiza.
 */
export function CotizadorMembresia() {
  const [tanda, setTanda] = useState(TANDA_POR_DEFECTO);
  const c = cotizarMembresia(TANDAS[tanda]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-start lg:gap-5">
      <TarjetaInfo
        color="#3F4147"
        titulo="Elige tu tanda"
        icono={
          <svg {...iconoProps}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
      >
        <div className="flex flex-col gap-2 px-4 pt-3 pb-3" role="radiogroup" aria-label="Tanda de clientes">
          {TANDAS.map((t, i) => {
            const on = i === tanda;
            return (
              <button
                key={t.descuento}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setTanda(i)}
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  on
                    ? "border-[#5f9b3c] bg-[#5f9b3c] text-white shadow-sm"
                    : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span className="flex flex-col">
                  <span className="text-base font-bold sm:text-lg">{Math.round(t.descuento * 100)} % de descuento</span>
                  <span className={`text-xs font-medium sm:text-[13px] ${on ? "text-white/85" : "text-[var(--text-muted)]"}`}>{t.clientes}</span>
                </span>
                <span className={`text-lg font-extrabold sm:text-xl [font-variant-numeric:tabular-nums] ${on ? "" : "text-[var(--text-primary)]"}`}>
                  <Soles monto={cotizarMembresia(t).precio} />
                </span>
              </button>
            );
          })}
        </div>
      </TarjetaInfo>

      <TarjetaInfo
        color="#5f9b3c"
        titulo="Fraccionamiento"
        icono={
          <svg {...iconoProps}>
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M3 10h18M7 15h3" />
          </svg>
        }
        acciones={
          <span className="inline-flex rounded-full bg-[#5f9b3c] px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase sm:text-xs">
            Ahorras {formatSoles(c.ahorro)}
          </span>
        }
      >
        <div className="flex flex-col items-center gap-3 px-2 pt-4 pb-3 text-center">
          <p className="m-0 flex items-center justify-center gap-2 text-[10px] font-semibold tracking-wide text-[var(--text-muted)] uppercase sm:text-[15px] sm:tracking-wider">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[#5f9b3c]" />
            Tu cuota mensual
          </p>
          <p
            key={tanda}
            className="animate-pop m-0 flex items-baseline justify-center gap-1.5 whitespace-nowrap [font-variant-numeric:tabular-nums]"
          >
            <span className="text-base font-semibold text-[var(--text-primary)] sm:text-2xl">S/</span>
            <span className="text-5xl leading-none font-extrabold text-[var(--text-primary)] sm:text-6xl">{formatearMonto(c.cuota)}</span>
            <span className="text-sm font-medium text-[var(--text-muted)] sm:text-lg">/ mes</span>
          </p>
          <p className="m-0 -mt-1 text-sm text-[var(--text-secondary)] sm:text-base">
            durante <strong className="font-semibold text-[var(--text-primary)]">{CUOTAS_MEMBRESIA} meses, sin interés</strong>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 px-3 pt-1 pb-3 sm:gap-3 sm:px-4">
          <CajaPrecio etiqueta="Precio total" tachado medio>
            <Soles monto={PRECIO_MEMBRESIA} />
          </CajaPrecio>
          <CajaPrecio etiqueta="Al contado" destacado medio>
            <Soles monto={c.precio} />
          </CajaPrecio>
        </div>

        <div className="mx-3 mb-3 rounded-xl border border-[var(--border)] p-3 sm:mx-4 sm:p-4">
          <p className="m-0 mb-3 text-center text-sm font-semibold tracking-wider text-[var(--text-muted)] uppercase sm:text-base">
            Tu inicial y saldo
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <CajaPrecio etiqueta={`Inicial (${Math.round(INICIAL_PORCENTAJE * 100)} %)`} grande>
              <Soles monto={c.inicial} />
            </CajaPrecio>
            <CajaPrecio etiqueta="Saldo a financiar" grande>
              <Soles monto={c.saldo} />
            </CajaPrecio>
          </div>
        </div>
      </TarjetaInfo>
    </div>
  );
}
