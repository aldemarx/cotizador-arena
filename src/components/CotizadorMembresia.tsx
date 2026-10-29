"use client";

import { useState } from "react";
import { Soles } from "@/components/Soles";
import {
  CUOTAS_MEMBRESIA,
  INICIAL_PORCENTAJE,
  PRECIO_MEMBRESIA,
  TANDAS,
  TANDA_POR_DEFECTO,
  cotizarMembresia,
} from "@/lib/membresiaClub";

const VERDE = "#5f9b3c";

/**
 * Cotizador de la membresía del Club Carhuaz: se elige la tanda de clientes (su descuento) y se ve el precio al contado y el fraccionado
 * (inicial del 20 % y 12 cuotas sin interés). Reemplaza al carrusel de fotos mientras se cotiza.
 */
export function CotizadorMembresia() {
  const [tanda, setTanda] = useState(TANDA_POR_DEFECTO);
  const c = cotizarMembresia(TANDAS[tanda]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,21rem)_1fr] lg:items-stretch lg:gap-8">
      {/* Tandas de clientes */}
      <div className="flex flex-col gap-2.5 rounded-xl bg-[var(--surface-2)] p-3" role="radiogroup" aria-label="Tanda de clientes">
        <p className="m-0 px-1 pt-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--text-muted)] uppercase">Elige la tanda</p>
        {TANDAS.map((t, i) => {
          const on = i === tanda;
          const precio = cotizarMembresia(t).precio;
          return (
            <button
              key={t.descuento}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setTanda(i)}
              className="flex items-center justify-between gap-3 rounded-[10px] border px-3.5 py-2.5 text-left transition-colors"
              style={
                on
                  ? { borderColor: VERDE, background: `${VERDE}14`, color: "var(--text-primary)" }
                  : { borderColor: "var(--border)", background: "var(--surface-1)", color: "var(--text-secondary)" }
              }
            >
              <span className="flex flex-col">
                <span className="text-sm font-bold">{Math.round(t.descuento * 100)} % de descuento</span>
                <span className="text-xs font-medium text-[var(--text-muted)]">{t.clientes}</span>
              </span>
              <span className="text-base font-extrabold [font-variant-numeric:tabular-nums]">
                <Soles monto={precio} />
              </span>
            </button>
          );
        })}
      </div>

      {/* Cotización */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-white p-5 sm:p-7">
        <div>
          <p className="m-0 text-xs font-semibold tracking-[0.16em] text-[var(--text-muted)] uppercase">Membresía básica · Club Carhuaz</p>
          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="m-0 text-4xl leading-none font-extrabold text-[var(--text-primary)] sm:text-5xl [font-variant-numeric:tabular-nums]">
              <Soles monto={c.precio} />
            </p>
            <p className="m-0 pb-1 text-lg font-medium text-[var(--text-muted)] line-through [font-variant-numeric:tabular-nums]">
              <Soles monto={PRECIO_MEMBRESIA} />
            </p>
          </div>
          <p
            className="m-0 mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase"
            style={{ background: `${VERDE}1f`, color: "#4c8030" }}
          >
            Ahorras S/ {c.ahorro.toLocaleString("es-PE")}{" · "}{Math.round(TANDAS[tanda].descuento * 100)} % de descuento
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="m-0 text-[11px] font-semibold tracking-[0.16em] text-[var(--text-muted)] uppercase">Al contado</p>
            <p className="m-0 mt-2 text-2xl font-extrabold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              <Soles monto={c.precio} />
            </p>
            <p className="m-0 mt-1 text-xs text-[var(--text-secondary)]">Un solo pago</p>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: `${VERDE}59`, background: `${VERDE}14` }}>
            <p className="m-0 text-[11px] font-semibold tracking-[0.16em] uppercase" style={{ color: "#4c8030" }}>
              Fraccionado
            </p>
            <p className="m-0 mt-2 text-2xl font-extrabold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              <Soles monto={c.cuota} />
              <span className="ml-1.5 text-sm font-semibold text-[var(--text-secondary)]">/ mes</span>
            </p>
            <p className="m-0 mt-1 text-xs text-[var(--text-secondary)]">{CUOTAS_MEMBRESIA} cuotas, sin interés</p>
          </div>
        </div>

        <dl className="m-0 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-sm text-[var(--text-secondary)]">Inicial ({Math.round(INICIAL_PORCENTAJE * 100)} %)</dt>
            <dd className="m-0 text-sm font-semibold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              <Soles monto={c.inicial} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-sm text-[var(--text-secondary)]">Saldo a financiar</dt>
            <dd className="m-0 text-sm font-semibold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              <Soles monto={c.saldo} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-sm text-[var(--text-secondary)]">{CUOTAS_MEMBRESIA} cuotas mensuales de</dt>
            <dd className="m-0 text-sm font-bold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              <Soles monto={c.cuota} />
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
