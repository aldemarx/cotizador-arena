"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  cambiarBloqueoGerencia,
  cambiarEstado,
} from "@/app/admin/acciones";
import { ESTADO_ETIQUETA, numeroDeManzana, type EstadoLote } from "@/lib/arenas";

export type FilaLote = {
  id: string;
  manzana: string;
  lote: string;
  /** Sin metraje ni ubicación: lote que existe en el plano pero no tiene precio cargado. */
  metraje: number | null;
  ubicacion: string | null;
  estado: EstadoLote;
  /** Bloqueado por gerencia desde el mapa o este panel (aunque tenga precio). */
  bloqueo_gerencia: boolean;
};

export type FilaHistorial = {
  id: string;
  lote: string;
  de: string | null;
  a: string;
  quien: string;
  cuando: string;
};

/** Lo que se ve de cada lote: su estado, o «bloqueado por gerencia» (gris), que no es un estado sino una marca. */
type Categoria = EstadoLote | "gerencia";

const ETIQUETA: Record<Categoria, string> = {
  ...ESTADO_ETIQUETA,
  gerencia: "Bloqueado",
};

const COLOR_ESTADO: Record<Categoria, { texto: string; fondo: string }> = {
  gerencia: { texto: "#475569", fondo: "rgba(148,163,184,0.22)" },
  libre: { texto: "#059669", fondo: "rgba(16,185,129,0.12)" },
  bloqueado: { texto: "#b45309", fondo: "rgba(245,166,35,0.16)" },
  vendido: { texto: "#be123c", fondo: "rgba(225,29,72,0.10)" },
};

const POR_PAGINA = 60;

/** Columnas de la lista: lote · estado · detalle · acciones (iguales en la cabecera y en cada fila). */
const COLUMNAS = "sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_17rem]";

/** Lote que existe pero no tiene metraje ni precio (p. ej., bloqueado por gerencia y fuera del Excel). */
const sinPrecio = (l: FilaLote) => !l.metraje;

// Filtros: dos grupos con rótulo; la opción elegida destaca sobre una pista tenue.
const ROTULO =
  "m-0 mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase";
const PISTA =
  "flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1";
const OPCION =
  "rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors";
const OPCION_ACTIVA = "bg-[var(--ceinys-grafito-700)] text-white shadow-sm";
const OPCION_INACTIVA =
  "text-[var(--text-secondary)] hover:bg-white hover:text-[var(--text-primary)]";

function Insignia({ estado }: { estado: Categoria }) {
  const c = COLOR_ESTADO[estado];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase"
      style={{ color: c.texto, backgroundColor: c.fondo }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: c.texto }}
      />
      {ETIQUETA[estado]}
    </span>
  );
}

const fechaCorta = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function PanelEstados({
  lotes,
  historial,
}: {
  nombre: string;
  rol: string;
  lotes: FilaLote[];
  historial: FilaHistorial[];
}) {
  // Cambios ya confirmados por el servidor, aplicados sobre la lista sin esperar a recargarla.
  const [cambios, setCambios] = useState<Record<string, EstadoLote>>({});
  // Bloqueos de gerencia ya confirmados por el servidor (true = bloqueado).
  const [marcas, setMarcas] = useState<Record<string, boolean>>({});
  const [manzana, setManzana] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<Categoria | "todos">(
    "todos",
  );
  const [texto, setTexto] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);
  // Lotes cambiados mientras el filtro está activo: se quedan en la lista (marcados) hasta que
  // cambie el filtro, para que el lote liberado no desaparezca de golpe de «Vendido».
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  // Confirmación previa para los cambios delicados (marcar vendido, liberar un vendido).
  const [confirmacion, setConfirmacion] = useState<{
    lote: FilaLote;
    nuevo: EstadoLote;
    /** Si viene, la acción es el bloqueo de gerencia (true = bloquear, false = quitar) y `nuevo` no se usa. */
    gerencia?: boolean;
    titulo: string;
    texto?: string;
    boton: string;
  } | null>(null);
  // Aviso breve de que el cambio quedó guardado.
  const [aviso, setAviso] = useState<{
    lote: string;
    texto: string;
    estado: Categoria;
  } | null>(null);

  useEffect(() => {
    if (!confirmacion) return;
    const alEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmacion(null);
    };
    document.addEventListener("keydown", alEscape);
    return () => document.removeEventListener("keydown", alEscape);
  }, [confirmacion]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  const estadoDe = (l: FilaLote): EstadoLote => cambios[l.id] ?? l.estado;
  const bloqueadoPorGerencia = (l: FilaLote) =>
    marcas[l.id] ?? l.bloqueo_gerencia;
  /** Igual que el plano: un vendido siempre es vendido; el bloqueo de gerencia manda sobre disponible y separado. */
  const categoriaDe = (l: FilaLote): Categoria => {
    const e = estadoDe(l);
    if (e === "vendido") return "vendido";
    if (bloqueadoPorGerencia(l)) return "gerencia";
    if (e === "libre") return "libre";
    return sinPrecio(l) ? "gerencia" : "bloqueado";
  };
  const manzanas = useMemo(
    () =>
      Array.from(new Set(lotes.map((l) => l.manzana))).sort(
        (a, b) => numeroDeManzana(a) - numeroDeManzana(b),
      ),
    [lotes],
  );

  const conteo: Record<Categoria, number> = {
    libre: 0,
    bloqueado: 0,
    gerencia: 0,
    vendido: 0,
  };
  for (const l of lotes) conteo[categoriaDe(l)]++;

  const q = texto.trim();
  const filtrados = lotes.filter(
    (l) =>
      (manzana === "todas" || l.manzana === manzana) &&
      (filtroEstado === "todos" ||
        categoriaDe(l) === filtroEstado ||
        tocados.has(l.id)) &&
      // El número escrito es el número exacto del lote (1 → solo el lote 1, no los que lo contienen).
      (q === "" || l.lote === q),
  );

  function filtrar(cambio: () => void) {
    cambio();
    setTocados(new Set());
    setLimite(POR_PAGINA);
  }

  function mover(l: FilaLote, nuevo: EstadoLote) {
    if (nuevo === "vendido") {
      setConfirmacion({
        lote: l,
        nuevo,
        titulo: "Marcar como vendido",
        boton: "Sí, marcar vendido",
      });
      return;
    }
    if (estadoDe(l) === "vendido" && nuevo === "libre") {
      setConfirmacion({
        lote: l,
        nuevo,
        titulo: "Liberar un lote vendido",
        texto:
          "Está VENDIDO. Si lo liberas, volverá a estar disponible para cotizar.",
        boton: "Sí, liberar",
      });
      return;
    }
    aplicar(l, nuevo);
  }

  function aplicar(l: FilaLote, nuevo: EstadoLote) {
    const etiquetaLote = `Mz ${l.manzana} · Lote ${l.lote}`;
    setConfirmacion(null);
    setError(null);
    setOcupado(l.id);
    iniciar(async () => {
      const r = await cambiarEstado(l.id, nuevo);
      if (r.ok) {
        setCambios((c) => ({ ...c, [l.id]: nuevo }));
        setTocados((t) => new Set(t).add(l.id));
        setAviso({
          lote: etiquetaLote,
          texto: `ahora está ${ESTADO_ETIQUETA[nuevo]}`,
          estado: nuevo,
        });
      } else setError(`${etiquetaLote}: ${r.error}`);
      setOcupado(null);
    });
  }

  function pedirGerencia(l: FilaLote, bloquear: boolean) {
    setConfirmacion({
      lote: l,
      nuevo: "bloqueado",
      gerencia: bloquear,
      titulo: bloquear ? "Bloquear por gerencia" : "Quitar bloqueo de gerencia",
      texto: bloquear
        ? "Los asesores lo verán como «Reservado» y no podrán cotizarlo."
        : "Los asesores podrán cotizarlo de nuevo.",
      boton: bloquear ? "Sí, bloquear" : "Sí, quitar bloqueo",
    });
  }

  function aplicarGerencia(l: FilaLote, bloquear: boolean) {
    const etiquetaLote = `Mz ${l.manzana} · Lote ${l.lote}`;
    setConfirmacion(null);
    setError(null);
    setOcupado(l.id);
    iniciar(async () => {
      const r = await cambiarBloqueoGerencia(l.id, bloquear);
      if (r.ok) {
        setMarcas((m) => ({ ...m, [l.id]: bloquear }));
        setTocados((t) => new Set(t).add(l.id));
        setAviso({
          lote: etiquetaLote,
          texto: bloquear
            ? "quedó bloqueado por gerencia"
            : "ya no está bloqueado por gerencia",
          estado: bloquear
            ? "gerencia"
            : estadoDe(l) === "libre"
              ? "libre"
              : "bloqueado",
        });
      } else setError(`${etiquetaLote}: ${r.error}`);
      setOcupado(null);
    });
  }

  const iconoConfirmacion: Categoria = confirmacion
    ? confirmacion.gerencia !== undefined
      ? "gerencia"
      : confirmacion.nuevo === "vendido"
        ? "vendido"
        : "bloqueado"
    : "bloqueado";

  const BTN =
    "rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase">
            Panel de administración
          </p>
          <h1 className="mt-1 mb-0 text-2xl font-extrabold text-[var(--text-primary)]">
            Estado de los lotes
          </h1>
        </div>
        {/* Las cuentas se gestionan en el panel de Altos de Sacta (son las mismas). */}
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <Link href="/admin/mapa" className={BTN}>
            Mapa
          </Link>
        </div>
      </header>

      <section
        aria-label="Resumen"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {(["libre", "bloqueado", "gerencia", "vendido"] as const).map((e) => (
          <div
            key={e}
            className="card flex flex-col items-center px-4 py-3 text-center"
          >
            <Insignia estado={e} />
            <p className="m-0 mt-2 text-2xl font-extrabold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              {conteo[e].toLocaleString("es-PE")}
            </p>
          </div>
        ))}
      </section>

      <section className="card space-y-4 p-4 sm:p-5" aria-label="Lotes">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className={ROTULO}>Manzana</p>
            <div className={PISTA}>
              {["todas", ...manzanas].map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={manzana === m}
                  onClick={() => filtrar(() => setManzana(m))}
                  className={`${OPCION} ${manzana === m ? OPCION_ACTIVA : OPCION_INACTIVA}`}
                >
                  {m === "todas" ? "Todas" : `Mz ${m}`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={ROTULO}>Estado</p>
            <div className={PISTA}>
              {(
                ["todos", "libre", "bloqueado", "gerencia", "vendido"] as const
              ).map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={filtroEstado === e}
                  onClick={() => filtrar(() => setFiltroEstado(e))}
                  className={`${OPCION} inline-flex items-center gap-1.5 ${filtroEstado === e ? OPCION_ACTIVA : OPCION_INACTIVA}`}
                >
                  {e !== "todos" && (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: COLOR_ESTADO[e].texto }}
                    />
                  )}
                  {e === "todos" ? "Todos" : ETIQUETA[e]}
                  {e !== "todos" && (
                    <span className="font-medium opacity-70 [font-variant-numeric:tabular-nums]">
                      {conteo[e].toLocaleString("es-PE")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="relative ml-auto w-52">
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-1.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--ceinys-grafito-700)] text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20.5 20.5l-4.6-4.6" />
              </svg>
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={texto}
              onChange={(e) =>
                filtrar(() => setTexto(e.target.value.replace(/\D/g, "")))
              }
              placeholder="Buscar lote (ej. 321)"
              aria-label="Buscar lote"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] py-1.5 pr-3 pl-9 text-sm outline-none focus:border-[var(--ceinys-grafito-500)]"
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="m-0 rounded-xl bg-[#e11d48]/10 px-4 py-3 text-sm font-medium text-[#be123c]"
          >
            {error}
          </p>
        )}

        <div
          aria-hidden
          className={`hidden items-center gap-x-4 border-b border-[var(--border)] pb-2 text-[11px] font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase sm:grid ${COLUMNAS}`}
        >
          <span>Lote</span>
          <span>Estado</span>
          <span>Detalle</span>
          <span className="text-right">Acciones</span>
        </div>
        <ul className="m-0 list-none divide-y divide-[var(--border)] p-0">
          {filtrados.slice(0, limite).map((l) => {
            const estado = categoriaDe(l);
            const enCurso = ocupado === l.id;
            return (
              <li
                key={l.id}
                data-lote={`${l.manzana}-${l.lote}`}
                className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3 ${COLUMNAS} ${tocados.has(l.id) ? "-mx-2 rounded-lg bg-[var(--surface-2)] px-2" : ""}`}
              >
                <span className="text-sm font-extrabold whitespace-nowrap text-[var(--text-primary)]">
                  MZ {l.manzana} · LT {l.lote}
                </span>
                <span className="justify-self-start sm:order-none">
                  <Insignia estado={estado} />
                </span>
                <span className="col-span-2 min-w-0 text-xs text-[var(--text-muted)] sm:col-span-1">
                  {sinPrecio(l)
                    ? "Sin precio cargado (no se puede cotizar)"
                    : `${l.metraje} m² · ${l.ubicacion}`}
                </span>
                <span className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:justify-end">
                  {/* Un lote bloqueado por gerencia con la marca solo ofrece quitarla; el que no tiene precio se comporta como antes. */}
                  {estado === "gerencia" && bloqueadoPorGerencia(l) ? (
                    <button
                      type="button"
                      disabled={enCurso}
                      onClick={() => pedirGerencia(l, false)}
                      className={BTN}
                    >
                      {enCurso ? "Guardando…" : "Quitar bloqueo"}
                    </button>
                  ) : (
                    <>
                      {estado === "libre" && (
                        <button
                          type="button"
                          disabled={enCurso}
                          onClick={() => mover(l, "bloqueado")}
                          className={BTN}
                        >
                          {enCurso ? "Guardando…" : "Separar"}
                        </button>
                      )}
                      {estado !== "libre" && !sinPrecio(l) && (
                        <button
                          type="button"
                          disabled={enCurso}
                          onClick={() => mover(l, "libre")}
                          className={BTN}
                        >
                          {enCurso ? "Guardando…" : "Liberar"}
                        </button>
                      )}
                      {estado !== "vendido" && (
                        <button
                          type="button"
                          disabled={enCurso}
                          onClick={() => mover(l, "vendido")}
                          className={BTN}
                        >
                          Marcar vendido
                        </button>
                      )}
                      {estado !== "vendido" &&
                        estado !== "gerencia" &&
                        !sinPrecio(l) && (
                          <button
                            type="button"
                            disabled={enCurso}
                            onClick={() => pedirGerencia(l, true)}
                            className={BTN}
                          >
                            Bloquear por gerencia
                          </button>
                        )}
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        {filtrados.length === 0 && (
          <p className="m-0 py-4 text-center text-sm text-[var(--text-muted)]">
            No hay lotes con ese filtro.
          </p>
        )}
        {filtrados.length > limite && (
          <button
            type="button"
            onClick={() => setLimite((n) => n + POR_PAGINA)}
            className={`${BTN} w-full`}
          >
            Mostrar más ({(filtrados.length - limite).toLocaleString("es-PE")}{" "}
            restantes)
          </button>
        )}
      </section>

      <section className="card p-4 sm:p-5" aria-label="Últimos cambios">
        <h2 className="m-0 mb-3 text-base font-bold text-[var(--text-primary)]">
          Últimos cambios
        </h2>
        {historial.length === 0 ? (
          <p className="m-0 text-sm text-[var(--text-muted)]">
            Todavía no hay cambios registrados.
          </p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0 text-sm text-[var(--text-secondary)]">
            {historial.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-2">
                <span className="font-semibold text-[var(--text-primary)]">
                  Lote {h.lote}
                </span>
                <span>
                  {h.de ? ESTADO_ETIQUETA[h.de as EstadoLote] : "—"} →{" "}
                  {ESTADO_ETIQUETA[h.a as EstadoLote]}
                </span>
                <span className="text-[var(--text-muted)]">
                  · {h.quien} · {fechaCorta.format(new Date(h.cuando))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {confirmacion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmacion(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmar-titulo"
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-[0_24px_64px_rgba(20,22,28,0.3)]"
          >
            <div className="space-y-2 text-center">
              <div className="flex items-center justify-center gap-3">
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none font-bold"
                  style={{
                    color: COLOR_ESTADO[iconoConfirmacion].texto,
                    backgroundColor: COLOR_ESTADO[iconoConfirmacion].fondo,
                  }}
                >
                  !
                </span>
                <h2
                  id="confirmar-titulo"
                  className="m-0 text-base font-extrabold text-[var(--text-primary)]"
                >
                  {confirmacion.titulo}
                </h2>
              </div>
              {confirmacion.texto && (
                <p className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {confirmacion.texto}
                </p>
              )}
            </div>
            <div
              data-testid="confirmar-ubicacion"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-center"
            >
              <p className="m-0 flex items-baseline justify-center gap-2 whitespace-nowrap">
                <span className="text-lg leading-none font-semibold text-[var(--text-secondary)] sm:text-2xl">
                  MZ {confirmacion.lote.manzana}
                </span>
                <span className="text-base leading-none font-semibold text-[var(--text-muted)] sm:text-xl">
                  ·
                </span>
                <span className="text-lg leading-none font-extrabold tracking-tight sm:text-2xl text-[var(--text-primary)]">
                  LOTE {confirmacion.lote.lote}
                </span>
              </p>
              <p className="mt-1.5 mb-0 text-xs text-[var(--text-muted)]">
                {sinPrecio(confirmacion.lote)
                  ? "Sin precio cargado"
                  : `${confirmacion.lote.metraje} m² · ${confirmacion.lote.ubicacion}`}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmacion(null)}
                className={BTN}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  confirmacion.gerencia !== undefined
                    ? aplicarGerencia(confirmacion.lote, confirmacion.gerencia)
                    : aplicar(confirmacion.lote, confirmacion.nuevo)
                }
                className="rounded-lg bg-[var(--ceinys-grafito-700)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--ceinys-grafito-900)]"
              >
                {confirmacion.boton}
              </button>
            </div>
          </div>
        </div>
      )}

      {aviso && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-4 left-4 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-[0_12px_32px_rgba(20,22,28,0.18)] sm:right-6 sm:bottom-6 sm:left-auto sm:mx-0"
        >
          <span
            aria-hidden
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs leading-none font-bold text-white"
            style={{ backgroundColor: COLOR_ESTADO[aviso.estado].texto }}
          >
            ✓
          </span>
          <span>
            <strong className="font-extrabold">{aviso.lote}</strong>{" "}
            {aviso.texto}
          </span>
        </div>
      )}
    </div>
  );
}
