"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cambiarBloqueoGerencia, cambiarEstado } from "@/app/admin/acciones";
import type { EstadoLote } from "@/lib/arenas";
import { BTN_MAPA as BTN, COLOR_CLASE, MapaLotes, NOMBRE_CLASE, claseDeLote, type LoteMapa } from "@/components/MapaLotes";

const BTN_ACCION =
  "flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50";
const BTN_CONFIRMAR =
  "min-h-10 rounded-lg bg-[var(--ceinys-grafito-700)] px-3 text-xs font-semibold text-white hover:bg-[var(--ceinys-grafito-900)] disabled:opacity-60";

/** Mapa del panel de administración: toca un lote y cámbiale el estado (separar, vender, liberar) o el bloqueo de gerencia. */
export function MapaAdmin({ lotes: lotesIniciales }: { lotes: LoteMapa[] }) {
  const [lotes, setLotes] = useState(lotesIniciales);
  const [confirmando, setConfirmando] = useState<EstadoLote | null>(null);
  // Bloqueo de gerencia pendiente de confirmar: true = bloquear, false = quitar el bloqueo.
  const [confirmaGerencia, setConfirmaGerencia] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function aplicar(l: LoteMapa, nuevo: EstadoLote) {
    setOcupado(true);
    setError(null);
    const r = await cambiarEstado(l.dbId!, nuevo);
    setOcupado(false);
    setConfirmando(null);
    if (!r.ok) return setError(r.error);
    setLotes((ls) => ls.map((x) => (x.id === l.id ? { ...x, estado: nuevo } : x)));
    setAviso(`${l.mz} · Lote ${l.lt} ahora está ${NOMBRE_CLASE[claseDeLote({ ...l, estado: nuevo })]}`);
  }
  async function aplicarGerencia(l: LoteMapa, bloquear: boolean) {
    setOcupado(true);
    setError(null);
    const r = await cambiarBloqueoGerencia(l.dbId!, bloquear);
    setOcupado(false);
    setConfirmaGerencia(null);
    if (!r.ok) return setError(r.error);
    setLotes((ls) => ls.map((x) => (x.id === l.id ? { ...x, bloqueoGerencia: bloquear } : x)));
    setAviso(`${l.mz} · Lote ${l.lt} ${bloquear ? "quedó bloqueado por gerencia" : "ya no está bloqueado por gerencia"}`);
  }
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  function pedir(l: LoteMapa, nuevo: EstadoLote) {
    // Vender y liberar un vendido piden confirmación; separar o liberar un separado, no.
    const delicado = nuevo === "vendido" || (l.estado === "vendido" && nuevo === "libre");
    if (delicado) setConfirmando(nuevo);
    else void aplicar(l, nuevo);
  }

  return (
    <>
      <MapaLotes
        lotes={lotes}
        volver={
          <Link href="/admin" className={`${BTN} inline-flex items-center shadow-sm`}>
            ← Volver a la lista
          </Link>
        }
        alSeleccionar={() => {
          setConfirmando(null);
          setConfirmaGerencia(null);
          setError(null);
        }}
        panel={({ elegido }) => {
          const clase = elegido ? claseDeLote(elegido) : null;
          return (
            <section className="card overflow-hidden p-0" aria-live="polite">
              {!elegido || !clase ? null : (
                <div className="flex flex-col">
                  <div className="flex flex-col gap-3 px-4 pt-4 pb-3.5">
                    <p className="m-0 text-xs text-[var(--text-secondary)]">Ubicación (Mz y Lote)</p>
                    <h2 className="m-0 flex items-baseline gap-2 whitespace-nowrap">
                      <span className="text-xl leading-none font-semibold text-[var(--text-secondary)]">MZ {elegido.mz}</span>
                      <span className="text-lg leading-none font-semibold text-[var(--text-muted)]">·</span>
                      <span className="text-xl leading-none font-extrabold tracking-tight text-[var(--text-primary)]">LOTE {elegido.lt}</span>
                    </h2>
                    <span
                      role="status"
                      className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] leading-none font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ background: `${COLOR_CLASE[clase]}1f`, color: COLOR_CLASE[clase] }}
                    >
                      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: COLOR_CLASE[clase] }} />
                      {NOMBRE_CLASE[clase]}
                    </span>
                  </div>

                  <dl className="m-0 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                      <dt className="text-sm text-[var(--text-secondary)]">Metraje</dt>
                      <dd className="m-0 text-sm font-semibold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                        {elegido.sinPrecio ? "—" : `${elegido.metraje} m²`}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] px-4 py-2.5">
                      <dt className="text-sm text-[var(--text-secondary)]">Ubicación</dt>
                      <dd className="m-0 -mr-2 rounded-md bg-[#3b82f6]/15 px-2 py-0.5 text-right text-sm font-semibold text-[var(--text-primary)]">
                        {elegido.sinPrecio ? "Sin precio" : elegido.ubicacion}
                      </dd>
                    </div>
                  </dl>

                  <div className="space-y-2.5 border-t border-[var(--border)] p-4">
                    {elegido.bloqueoGerencia && (
                      <p className="m-0 rounded-lg bg-[#94a3b8]/20 px-3 py-2 text-xs text-[#475569]">
                        Bloqueado por gerencia: el asesor no lo ve ni puede cotizarlo.
                      </p>
                    )}

                    {confirmaGerencia !== null ? (
                      <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                        <p className="m-0 text-sm font-semibold text-[var(--text-primary)]">
                          {confirmaGerencia
                            ? "¿Bloquear este lote por gerencia? Los asesores dejarán de verlo y de poder cotizarlo."
                            : "¿Quitar el bloqueo de gerencia? Los asesores podrán cotizarlo de nuevo."}
                        </p>
                        <div className="flex gap-2">
                          <button type="button" disabled={ocupado} onClick={() => setConfirmaGerencia(null)} className={BTN}>
                            Cancelar
                          </button>
                          <button type="button" disabled={ocupado} onClick={() => void aplicarGerencia(elegido, confirmaGerencia)} className={BTN_CONFIRMAR}>
                            {ocupado ? "Guardando…" : "Sí, confirmar"}
                          </button>
                        </div>
                      </div>
                    ) : confirmando ? (
                      <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                        <p className="m-0 text-sm font-semibold text-[var(--text-primary)]">
                          {confirmando === "vendido" ? "¿Marcar este lote como vendido?" : "Este lote está vendido. ¿Seguro que quieres liberarlo?"}
                        </p>
                        <div className="flex gap-2">
                          <button type="button" disabled={ocupado} onClick={() => setConfirmando(null)} className={BTN}>
                            Cancelar
                          </button>
                          <button type="button" disabled={ocupado} onClick={() => void aplicar(elegido, confirmando)} className={BTN_CONFIRMAR}>
                            {ocupado ? "Guardando…" : "Sí, confirmar"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-lg:grid max-lg:grid-cols-2 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2">
                        {elegido.estado === "libre" && (
                          <button type="button" disabled={ocupado} onClick={() => pedir(elegido, "bloqueado")} className={BTN_ACCION}>
                            Separar
                          </button>
                        )}
                        {elegido.estado !== "libre" && (
                          <button
                            type="button"
                            disabled={ocupado || elegido.sinPrecio}
                            title={elegido.sinPrecio ? "Primero hay que cargar su precio" : undefined}
                            onClick={() => pedir(elegido, "libre")}
                            className={BTN_ACCION}
                          >
                            {ocupado ? "Guardando…" : "Liberar"}
                          </button>
                        )}
                        {elegido.estado !== "vendido" && (
                          <button type="button" disabled={ocupado} onClick={() => pedir(elegido, "vendido")} className={BTN_ACCION}>
                            Marcar vendido
                          </button>
                        )}
                        {elegido.estado !== "vendido" && !elegido.sinPrecio && (
                          <button type="button" disabled={ocupado} onClick={() => setConfirmaGerencia(!elegido.bloqueoGerencia)} className={BTN_ACCION}>
                            {elegido.bloqueoGerencia ? "Quitar bloqueo de gerencia" : "Bloquear por gerencia"}
                          </button>
                        )}
                      </div>
                    )}
                    {error && (
                      <p role="alert" className="m-0 text-xs text-[#be123c]">
                        {error}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>
          );
        }}
      />

      {aviso && (
        <div
          role="status"
          className="fixed right-4 bottom-4 left-4 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-[0_12px_32px_rgba(20,22,28,0.18)] sm:right-6 sm:bottom-6 sm:left-auto sm:mx-0"
        >
          <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-xs font-bold text-white">
            ✓
          </span>
          {aviso}
        </div>
      )}
    </>
  );
}
