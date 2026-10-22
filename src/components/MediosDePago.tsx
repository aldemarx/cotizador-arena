"use client";

import { useState } from "react";
import { BANCOS, COLOR_MONEDA, TITULAR } from "@/lib/cuentasDePago";
import { EnviarCuentas } from "@/components/EnviarCuentas";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      /* sin permiso de portapapeles: no hacemos nada */
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="m-0 text-[10px] font-semibold tracking-wide text-[var(--text-muted)] uppercase sm:text-[13px] sm:tracking-wider">
          {etiqueta}
        </p>
        <p className="m-0 mt-0.5 text-[13px] max-[340px]:text-[11px] font-semibold whitespace-nowrap text-[var(--text-primary)] [font-variant-numeric:tabular-nums] min-[400px]:text-sm sm:text-base">
          {valor}
        </p>
      </div>
      <button
        type="button"
        onClick={copiar}
        aria-label={`Copiar ${etiqueta.toLowerCase()}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full max-[340px]:h-8 max-[340px]:w-8 bg-[var(--ceinys-grafito-100)] text-[var(--ceinys-grafito-700)] transition-colors hover:bg-[var(--ceinys-grafito-700)] hover:text-white"
      >
        {copiado ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10b981"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M5 12l5 5 9-10" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        )}
      </button>
    </div>
  );
}

/** Cuentas bancarias para depósitos y transferencias. */
export function MediosDePago() {
  return (
    <section className="mx-auto w-full max-w-[88rem] px-4 pb-10 lg:px-6 lg:pb-14">
      <div className="card p-6 max-[340px]:p-4 lg:p-10">
        <div className="mb-4 flex flex-col gap-2 border-b border-[var(--border)] pb-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:pb-8">
          <div className="text-center lg:pl-6 lg:text-left">
            <p className="flex items-center justify-center gap-3 text-xs font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase sm:text-[13px] lg:justify-start">
              <span className="flex shrink-0 items-center gap-1" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#F5A623]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
              </span>
              Medios de pago
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-[var(--text-primary)] sm:text-3xl">
              Cuentas para tu pago
            </h2>
          </div>
          <p className="text-center text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base lg:text-right">
            Depósitos y transferencias a nombre de
            <br />
            <strong className="font-semibold text-[var(--text-primary)]">
              {TITULAR}
            </strong>
          </p>
        </div>

        <div className="mb-5 flex lg:mb-6 lg:justify-end">
          <EnviarCuentas />
        </div>

        <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
          {BANCOS.map((banco) => (
            <article
              key={banco.nombre}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)]"
            >
              <div
                className="flex items-center justify-center border-b px-4 py-4"
                style={{
                  background: `${banco.color}12`,
                  borderColor: `${banco.color}33`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banco.logo}
                  alt={banco.nombre}
                  className={`block ${banco.alto} w-auto`}
                />
              </div>

              <div className="divide-y divide-[var(--border)]">
                {banco.cuentas.map((c) => (
                  <div
                    key={c.numero}
                    className="flex flex-col gap-4 px-4 py-5 max-[340px]:px-3 sm:px-8"
                  >
                    <span
                      className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider uppercase sm:text-[13px]"
                      style={{
                        background: `${COLOR_MONEDA[c.moneda]}1a`,
                        color: COLOR_MONEDA[c.moneda],
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: COLOR_MONEDA[c.moneda] }}
                      />
                      {c.moneda}
                    </span>
                    <Dato etiqueta="N° de cuenta" valor={c.numero} />
                    <Dato etiqueta="Código CCI" valor={c.cci} />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
