"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { formatSoles, type EstadoLote } from "@/lib/arenas";
import { SelectorManzana } from "@/components/SelectorManzana";

export type LoteMapa = {
  /** Código «R4-32». */
  id: string;
  mz: string;
  lt: number;
  metraje: number | null;
  ubicacion: string | null;
  /** Precio con descuento (el que ve el cliente). */
  precio: number | null;
  promocion?: "standard" | "preferencial";
  /** Estado del lote (libre, separado o vendido). Sin él se dibuja como libre. */
  estado?: EstadoLote;
  /** Bloqueado por gerencia (el asesor lo ve como «Reservado»; solo el administrador lo recibe). */
  bloqueoGerencia?: boolean;
  /** Existe en el plano pero no tiene precio cargado. */
  sinPrecio?: boolean;
  /** Identificador en la base de datos (solo el mapa de administración lo necesita). */
  dbId?: string;
};

export type ClaseLote = "libre" | "reservado" | "vendido" | "gerencia";

/** Un lote vendido siempre se ve vendido; el bloqueo de gerencia manda sobre disponible y separado. */
export const claseDeLote = (l: LoteMapa): ClaseLote => {
  if (l.estado === "vendido") return "vendido";
  if (l.bloqueoGerencia) return "gerencia";
  if ((l.estado ?? "libre") === "libre") return "libre";
  return l.sinPrecio ? "gerencia" : "reservado";
};

export const NOMBRE_CLASE: Record<ClaseLote, string> = {
  libre: "Disponible",
  reservado: "Separado",
  gerencia: "Bloqueado por gerencia",
  vendido: "Vendido",
};

/** Colores de cada estado (los mismos de los marcadores del plano). */
export const COLOR_CLASE: Record<ClaseLote, string> = {
  libre: "#10b981",
  reservado: "#f5a623",
  vendido: "#e11d48",
  gerencia: "#6b7280",
};

/** Datos del lote tocado, para el panel propio del modo administración. */
export type ContextoPanel = { elegido: LoteMapa | undefined };

type Vista = { x: number; y: number; w: number; h: number };

// Plano ilustrado: lotes claros con un marcador (insignia) con su número y, debajo, el metraje. Arenas aún no tiene estados por lote.
const URL_SVG = "/plano/arenas.svg";
const ANCHO_MIN_M = 18; // zoom máximo: unos 18 m de ancho
const UMBRAL_NUMEROS = 1.3; // los números se ven hasta un poco más allá de la vista completa; al alejar más se ocultan

const ESTILO = `
.mapa-lotes svg { width: 100%; height: 100%; display: block; touch-action: none; }
.mapa-lotes path[id^="lote-"] { cursor: pointer; }
.mapa-lotes path[id^="lote-"]:hover { fill: color-mix(in srgb, #000000 12%, #fef7e2); }
.mapa-lotes path.sel { fill: color-mix(in srgb, #000000 12%, #fef7e2); stroke: var(--sel, #1e3a8a) !important; stroke-width: 0.55 !important; }
.mapa-lotes.con-filtro g.ins[data-f="0"] { opacity: 0.14; }
.mapa-lotes.con-filtro path[id^="lote-"][data-f="0"] { fill: #efe9d8; }
.mapa-lotes.con-filtro #metrajes text[data-f="0"] { display: none; }
.mapa-lotes.sin-numeros #metrajes { display: none; }
.mapa-lotes.sin-numeros .ins text { display: none; }
.mapa-lotes #metrajes text { fill: #7a736c; font-weight: 600; paint-order: stroke; stroke: #fef7e2; stroke-opacity: 0.9; stroke-width: 0.35; stroke-linejoin: round; }
.mapa-lotes .ins.sel .cue { stroke: var(--sel, #1e3a8a); stroke-width: 0.35; }
/* El estado se pinta en el marcador del lote (el disponible conserva el verde del plano). */
.mapa-lotes g.ins[data-e="reservado"] .cue { fill: ${COLOR_CLASE.reservado}; }
.mapa-lotes g.ins[data-e="vendido"] .cue { fill: ${COLOR_CLASE.vendido}; }
.mapa-lotes g.ins[data-e="gerencia"] .cue { fill: ${COLOR_CLASE.gerencia}; }
.mapa-lotes #metrajes text[data-e="vendido"], .mapa-lotes #metrajes text[data-e="gerencia"] { fill: #b5aea1; }
`;

const RANGOS_METRAJE = [
  { texto: "Hasta 160 m²", min: "", max: "160" },
  { texto: "161 – 200 m²", min: "161", max: "200" },
  { texto: "201 – 300 m²", min: "201", max: "300" },
  { texto: "Más de 300 m²", min: "301", max: "" },
];

export const BTN_MAPA =
  "min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50";

/**
 * Plano interactivo de lotes (SVG): mover, acercar, buscar un lote y tocarlo. Desde un lote se pasa al cotizador.
 * Mismo diseño que el plano de Altos de Sacta (marcadores con número, metraje, filtro por metraje y ficha del lote).
 */
export function MapaLotes({
  lotes,
  loteInicial,
  volver,
  panel,
  alSeleccionar,
}: {
  lotes: LoteMapa[];
  /** Panel propio para el lote tocado (el mapa de administración pone aquí sus botones de estado). Sin él se muestra la ficha con «Cotizar». */
  panel?: (ctx: ContextoPanel) => ReactNode;
  /** Se llama cada vez que se toca otro lote (o el fondo): sirve para limpiar confirmaciones pendientes. */
  alSeleccionar?: () => void;
  /** Lote («R4-32») que arranca seleccionado y con el plano acercado a él. */
  loteInicial?: string;
  /** Botón de regreso (flota arriba a la izquierda del plano). */
  volver?: ReactNode;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const base = useRef<Vista | null>(null);
  const vista = useRef<Vista | null>(null);
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const arrastre = useRef({ movio: false, distPrev: 0 });

  const [svg, setSvg] = useState<string | null>(null);
  const [errorSvg, setErrorSvg] = useState(false);
  const porClave = useMemo(() => new Map(lotes.map((l) => [l.id, l])), [lotes]);
  const [sel, setSel] = useState<string | null>(() =>
    loteInicial && lotes.some((l) => l.id === loteInicial) ? loteInicial : null,
  );
  const [busca, setBusca] = useState("");
  const [errorBusca, setErrorBusca] = useState<string | null>(null);

  // ── Carga del plano ───────────────────────────────────────
  useEffect(() => {
    let vivo = true;
    fetch(URL_SVG)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => vivo && setSvg(t))
      .catch(() => vivo && setErrorSvg(true));
    return () => {
      vivo = false;
    };
  }, []);

  const elSvg = () => contenedor.current?.querySelector("svg") ?? null;

  const aplicarVista = useCallback((v: Vista) => {
    const s = elSvg();
    if (!s || !base.current) return;
    vista.current = v;
    s.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
    const escala = v.w / base.current.w;
    contenedor.current?.classList.toggle("sin-numeros", escala > UMBRAL_NUMEROS);
  }, []);

  // Inicializa el plano. Sin lote elegido, la cámara muestra todos los lotes; «Ver todo» (⤢) muestra todo.
  useLayoutEffect(() => {
    const s = elSvg();
    if (!svg || !s) return;
    const vb = (s.getAttribute("viewBox") ?? "0 0 100 100").split(/\s+/).map(Number);
    base.current = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
    s.removeAttribute("width");
    s.removeAttribute("height");
    const r = contenedor.current?.getBoundingClientRect();
    const lotesBox = s.querySelector<SVGGraphicsElement>("#insignias")?.getBBox();
    if (!sel && r && r.width > 0 && lotesBox) {
      // Se encaja el plano entero (con un margen) según la proporción de la pantalla, dejando libre arriba la franja
      // de los botones («Volver», buscador) para que no tapen las manzanas del borde.
      const franjaPx = Math.min(80, r.height * 0.12);
      const k = Math.max((lotesBox.width * 1.06) / r.width, (lotesBox.height * 1.1) / (r.height - franjaPx)); // m por px
      const w = k * r.width;
      const h = k * r.height;
      aplicarVista({
        x: lotesBox.x + lotesBox.width / 2 - w / 2,
        y: lotesBox.y - k * franjaPx - ((r.height - franjaPx) * k - lotesBox.height) / 2,
        w,
        h,
      });
    } else aplicarVista({ ...base.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg, aplicarVista]);

  // Escribe el metraje de cada lote debajo de su marcador. El plano trae, por lote, dónde va (`data-m`: x, y, giro,
  // largo libre y alto); aquí solo se ajusta la letra a ese largo.
  useEffect(() => {
    const raiz = contenedor.current;
    if (!svg || !raiz) return;
    const NS = "http://www.w3.org/2000/svg";
    const insignias = raiz.querySelector("#insignias");
    raiz.querySelector("#metrajes")?.remove();
    const grupo = document.createElementNS(NS, "g");
    grupo.setAttribute("id", "metrajes");
    grupo.setAttribute("font-family", "Montserrat, Arial, sans-serif");
    grupo.setAttribute("text-anchor", "middle");
    grupo.setAttribute("pointer-events", "none");
    raiz.querySelectorAll<SVGGElement>("g.ins[data-lote]").forEach((g) => {
      const l = porClave.get(g.getAttribute("data-lote") ?? "");
      if (!l) return;
      const clase = claseDeLote(l);
      g.setAttribute("data-e", clase);
      const pos = g.getAttribute("data-m")?.split(" ").map(Number);
      if (!l.metraje || !pos || pos.length < 6) return;
      const [x, y, giro, largo, alto, lado] = pos;
      const texto = `${Number(l.metraje.toFixed(2))} m²`;
      let em = 0;
      for (const c of texto)
        em += c === "." ? 0.3 : c === " " ? 0.28 : c === "m" ? 0.95 : c === "²" ? 0.45 : 0.66;
      const fuente = Math.min(1.6, largo / em, alto);
      if (fuente < 0.6) return;
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", String(x));
      t.setAttribute("y", String(y + fuente * 0.35 + lado * fuente * 0.62));
      t.setAttribute("font-size", fuente.toFixed(2));
      t.setAttribute("transform", `rotate(${giro} ${x} ${y})`);
      t.setAttribute("data-lote", g.getAttribute("data-lote") ?? "");
      t.setAttribute("data-e", clase);
      t.textContent = texto;
      grupo.appendChild(t);
    });
    insignias?.parentNode?.insertBefore(grupo, insignias);
  }, [svg, porClave]);

  // Resaltado del lote elegido
  useEffect(() => {
    const raiz = contenedor.current;
    if (!raiz) return;
    raiz.querySelectorAll(".sel").forEach((p) => p.classList.remove("sel"));
    if (sel) {
      const p = raiz.querySelector(`#lote-${sel}`);
      p?.classList.add("sel");
      p?.parentElement?.appendChild(p); // se dibuja encima de sus vecinos
      raiz.querySelector(`g.ins[data-lote="${sel}"]`)?.classList.add("sel");
    }
  }, [sel, svg]);

  // ── Mover y acercar ───────────────────────────────────────
  const aSvg = useCallback((cx: number, cy: number) => {
    const s = contenedor.current?.querySelector("svg");
    const m = s?.getScreenCTM();
    if (!s || !m) return { x: 0, y: 0 };
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const zoomEn = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const v = vista.current,
        b = base.current;
      const r = contenedor.current?.getBoundingClientRect();
      if (!v || !b || !r) return;
      const px = cx ?? r.left + r.width / 2,
        py = cy ?? r.top + r.height / 2;
      const c = aSvg(px, py);
      const w = Math.min(b.w * 3, Math.max(ANCHO_MIN_M, v.w * factor));
      const k = w / v.w;
      aplicarVista({ x: c.x - (c.x - v.x) * k, y: c.y - (c.y - v.y) * k, w, h: v.h * k });
    },
    [aplicarVista, aSvg],
  );

  useEffect(() => {
    const raiz = contenedor.current;
    if (!raiz) return;
    const alRueda = (e: WheelEvent) => {
      e.preventDefault();
      zoomEn(e.deltaY > 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY);
    };
    raiz.addEventListener("wheel", alRueda, { passive: false });
    return () => raiz.removeEventListener("wheel", alRueda);
  }, [zoomEn, svg]);

  const alBajar = (e: React.PointerEvent) => {
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    arrastre.current.movio = false;
    arrastre.current.distPrev = 0;
  };
  const alMover = (e: React.PointerEvent) => {
    const p = punteros.current.get(e.pointerId);
    const v = vista.current;
    const r = contenedor.current?.getBoundingClientRect();
    if (!p || !v || !r) return;
    const prev = { ...p };
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (arrastre.current.distPrev) {
        zoomEn(arrastre.current.distPrev / dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
        arrastre.current.movio = true;
      }
      arrastre.current.distPrev = dist;
      return;
    }
    const dx = e.clientX - prev.x,
      dy = e.clientY - prev.y;
    if (!arrastre.current.movio && Math.hypot(dx, dy) < 3) return;
    if (!arrastre.current.movio) {
      // Solo al empezar a arrastrar se captura el puntero: si se capturara antes, el clic simple
      // se entregaría al contenedor y no al lote tocado.
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    arrastre.current.movio = true;
    const k = Math.max(v.w / r.width, v.h / r.height);
    aplicarVista({ ...v, x: v.x - dx * k, y: v.y - dy * k });
  };
  const alSoltar = (e: React.PointerEvent) => {
    punteros.current.delete(e.pointerId);
    arrastre.current.distPrev = 0;
  };

  const alHacerClic = (e: React.MouseEvent) => {
    if (arrastre.current.movio) return;
    const p = (e.target as Element).closest('path[id^="lote-"]');
    alSeleccionar?.();
    setSel(p ? p.id.slice(5) : null);
  };

  const acercarA = (clave: string) => {
    const p = contenedor.current?.querySelector<SVGGraphicsElement>(`#lote-${clave}`);
    const r = contenedor.current?.getBoundingClientRect();
    if (!p || !base.current || !r) return;
    const bb = p.getBBox();
    // Acercamiento cómodo para cotizar: unos 5,5 px por metro (se ve el lote y lo que hay alrededor); en celular, el mínimo
    const w = Math.min(300, Math.max(110, r.width / 5.5));
    const h = w * (r.height / r.width);
    aplicarVista({ x: bb.x + bb.width / 2 - w / 2, y: bb.y + bb.height / 2 - h / 2, w, h });
  };

  // Con un lote inicial, el plano abre acercado a él (una sola vez, cuando el plano ya cargó).
  const zoomInicialHecho = useRef(false);
  useLayoutEffect(() => {
    if (!svg || !sel || zoomInicialHecho.current) return;
    zoomInicialHecho.current = true;
    acercarA(sel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg]);

  // Buscador: se elige la manzana y se escriben solo dígitos; la lista muestra cada coincidencia.
  const manzanas = useMemo(
    () =>
      Array.from(new Set(lotes.map((l) => l.mz))).sort(
        (a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")),
      ),
    [lotes],
  );
  const [mzBusca, setMzBusca] = useState<string>(
    () => (loteInicial && porClave.get(loteInicial)?.mz) || manzanas[0] || "R1",
  );
  const [listaAbierta, setListaAbierta] = useState(false);

  // Filtro por metraje: los lotes que no cumplen se atenúan en el plano. Se compara con el metraje redondeado a m² (el que se lee).
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [fMin, setFMin] = useState("");
  const [fMax, setFMax] = useState("");
  const filtroActivo = fMin !== "" || fMax !== "";
  const cumpleFiltro = useCallback(
    (l: LoteMapa) => {
      if (!l.metraje) return false;
      const m = Math.round(l.metraje);
      return (fMin === "" || m >= Number(fMin)) && (fMax === "" || m <= Number(fMax));
    },
    [fMin, fMax],
  );
  const coinciden = useMemo(
    () => (filtroActivo ? lotes.filter(cumpleFiltro).length : 0),
    [filtroActivo, lotes, cumpleFiltro],
  );
  useEffect(() => {
    const raiz = contenedor.current;
    if (!svg || !raiz) return;
    raiz.classList.toggle("con-filtro", filtroActivo);
    const ok = new Set<string>();
    if (filtroActivo) for (const l of lotes) if (cumpleFiltro(l)) ok.add(l.id);
    const marca = (el: Element, clave: string) =>
      el.setAttribute("data-f", !filtroActivo || ok.has(clave) ? "1" : "0");
    raiz.querySelectorAll("g.ins[data-lote]").forEach((g) => marca(g, g.getAttribute("data-lote") ?? ""));
    raiz.querySelectorAll('path[id^="lote-"]').forEach((p) => marca(p, p.id.slice(5)));
    raiz.querySelectorAll("#metrajes text[data-lote]").forEach((t) => marca(t, t.getAttribute("data-lote") ?? ""));
  }, [svg, lotes, filtroActivo, cumpleFiltro]);

  const cajaBusca = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (!cajaBusca.current?.contains(e.target as Node)) setListaAbierta(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);
  const coincidencias = useMemo(() => {
    const t = busca.trim();
    if (!t) return [];
    return lotes
      .filter((l) => l.mz === mzBusca && String(l.lt).includes(t))
      .sort((x, y) => {
        const ex = String(x.lt) === t ? 0 : 1;
        const ey = String(y.lt) === t ? 0 : 1;
        return ex - ey || x.lt - y.lt;
      })
      .slice(0, 12);
  }, [busca, lotes, mzBusca]);

  const irA = (clave: string) => {
    setErrorBusca(null);
    setListaAbierta(false);
    alSeleccionar?.();
    setSel(clave);
    acercarA(clave);
  };

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const t = busca.trim();
    if (!t) return;
    const exacta = `${mzBusca}-${Number(t)}`;
    if (porClave.has(exacta)) return irA(exacta);
    if (coincidencias.length > 0) return irA(coincidencias[0].id);
    setErrorBusca(`No hay un lote «${t}» en la Manzana ${mzBusca}.`);
  };

  const elegido = sel ? porClave.get(sel) : undefined;
  // Leyenda: solo los estados que de verdad hay en el plano.
  const clasesPresentes = useMemo(() => {
    const presentes = new Set(lotes.map(claseDeLote));
    return (["reservado", "vendido", "gerencia"] as const).filter((c) => presentes.has(c));
  }, [lotes]);
  const hayEstados = clasesPresentes.length > 0;
  // ¿Está dibujado en el plano? (el DWG de origen no trae los contornos de algunos lotes)
  const dibujado = useMemo(
    () => !!elegido && !!svg && svg.includes(`id="lote-${elegido.id}"`),
    [elegido, svg],
  );

  const formularioBusqueda = (
    <div
      ref={cajaBusca}
      className="relative w-full rounded-xl border border-[var(--border)] bg-white/95 p-1.5 shadow-[0_6px_20px_-8px_rgba(20,22,28,0.35)] backdrop-blur lg:p-2"
    >
      <form onSubmit={buscar} className="flex h-10 items-stretch gap-1.5 lg:gap-2">
        <SelectorManzana
          compacto
          manzanas={manzanas}
          valor={mzBusca}
          onCambiar={(mz) => {
            setMzBusca(mz);
            setErrorBusca(null);
          }}
        />
        <label htmlFor="ir-lote" className="sr-only">
          Número de lote
        </label>
        <input
          id="ir-lote"
          value={busca}
          onChange={(e) => {
            // Los lotes son numéricos: solo se aceptan dígitos.
            setBusca(e.target.value.replace(/\D/g, "").slice(0, 4));
            setErrorBusca(null);
            setListaAbierta(true);
          }}
          onFocus={() => setListaAbierta(true)}
          onKeyDown={(e) => e.key === "Escape" && setListaAbierta(false)}
          placeholder="Lote (ej. 12)"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          enterKeyHint="search"
          autoComplete="off"
          className="h-10 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm outline-none focus:border-[var(--ceinys-grafito-500)]"
        />
        <button type="submit" className={`${BTN_MAPA} h-10 min-h-0 shrink-0 px-3 lg:px-4`}>
          Ir
        </button>
      </form>

      {listaAbierta && busca.trim() !== "" && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 rounded-xl border border-[var(--border)] bg-white p-2 shadow-[0_12px_32px_rgba(20,22,28,0.14)]">
          {coincidencias.length > 0 ? (
            <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto">
              {coincidencias.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => irA(l.id)}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                >
                  <span className="whitespace-nowrap">Lote {l.lt}</span>
                  <span className="font-medium text-[var(--text-muted)]">{l.metraje} m²</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="m-0 px-2 py-1.5 text-xs text-[var(--text-muted)]">
              No hay lotes que coincidan en la Manzana {mzBusca}.
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-x-0 top-[var(--barra-h)] bottom-0 z-0 flex flex-col overflow-hidden bg-[#f3f2ef]">
      <style>{ESTILO}</style>

      {/* Celular: título sobre el plano (no flota); el buscador sí flota */}
      <div className="flex shrink-0 flex-col border-b border-[var(--border)] bg-white px-4 pt-3 pb-3.5 lg:hidden">
        <p className="m-0 flex items-center justify-center gap-3 text-[10.5px] font-semibold tracking-[0.2em] whitespace-nowrap text-[var(--text-muted)] uppercase">
          Plano Comercial
          <span aria-hidden className="h-3.5 w-px bg-[var(--ceinys-grafito-300)]" />
          <span className="text-[var(--text-primary)]">Arenas del Valle</span>
        </p>
      </div>

      <div className="relative min-h-0 flex-1">
        {errorSvg && (
          <p role="alert" className="m-6 text-sm text-[#be123c]">
            No se pudo cargar el plano.
          </p>
        )}
        {!svg && !errorSvg && <p className="m-6 text-sm text-[var(--text-muted)]">Cargando plano…</p>}
        <div
          ref={contenedor}
          className="mapa-lotes h-full w-full select-none"
          style={{ touchAction: "none" }}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onClick={alHacerClic}
          dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
        />

        {/* Barra flotante superior: volver y buscador */}
        <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex flex-col gap-1.5 lg:inset-x-3 lg:top-3 lg:flex-row lg:items-start lg:justify-between lg:gap-2">
          <div className="pointer-events-auto flex w-full items-stretch gap-1.5 lg:ml-auto lg:w-auto lg:gap-2">
            {volver && (
              <div className="flex shrink-0 max-lg:hidden [&>a]:flex [&>a]:h-full [&>a]:min-h-0 [&>a]:items-center [&>a]:rounded-xl [&>a]:!border-transparent [&>a]:!bg-[var(--ceinys-grafito-700)] [&>a]:px-4 [&>a]:text-sm [&>a]:font-semibold [&>a]:!text-white [&>a]:shadow-[0_6px_20px_-8px_rgba(20,22,28,0.45)] [&>a]:hover:!bg-[var(--ceinys-grafito-900)]">
                {volver}
              </div>
            )}
            <div className="min-w-0 flex-1 lg:w-[27rem] lg:flex-none">
              {formularioBusqueda}
              {errorBusca && (
                <p
                  role="alert"
                  className="m-0 mt-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs text-[#be123c] shadow-sm"
                >
                  {errorBusca}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Volver en celular: va en una barra propia sobre el plano */}
        {volver && (
          <div className="absolute top-[3.9rem] left-2 z-10 lg:hidden [&>a]:flex [&>a]:min-h-10 [&>a]:items-center [&>a]:rounded-lg [&>a]:bg-white/95 [&>a]:px-3 [&>a]:text-xs [&>a]:font-semibold [&>a]:text-[var(--text-secondary)] [&>a]:shadow-sm">
            {volver}
          </div>
        )}

        {/* Datos del lote tocado: bajo el buscador en escritorio; hoja inferior en celular */}
        <div
          className={`absolute inset-x-2 bottom-2 z-20 lg:inset-x-auto lg:top-[4.9rem] lg:right-3 lg:bottom-auto lg:w-[20rem] ${elegido ? "" : "hidden"} ${listaAbierta && busca.trim() !== "" ? "lg:hidden" : ""}`}
        >
          <button
            type="button"
            aria-label="Cerrar la ficha del lote"
            onClick={() => setSel(null)}
            className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-base leading-none text-[var(--text-secondary)] lg:hidden"
          >
            ×
          </button>
          <div className="max-h-[52dvh] overflow-y-auto rounded-2xl shadow-[0_10px_30px_-10px_rgba(20,22,28,0.4)] lg:max-h-[calc(100dvh-14rem)]">
            {panel ? panel({ elegido }) : <FichaLote lote={elegido} dibujado={dibujado} />}
          </div>
        </div>

        {/* Filtro por metraje: abajo a la izquierda; el panel se abre hacia arriba */}
        <div className="absolute bottom-2 left-2 z-10 flex flex-col items-start gap-2 lg:bottom-3 lg:left-3">
          {hayEstados && (
            <ul className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[var(--border)] bg-white/95 px-3 py-2 text-[11px] font-semibold text-[var(--text-secondary)] shadow-sm">
              {(["libre", ...clasesPresentes] as ClaseLote[]).map((c) => (
                <li key={c} className="flex items-center gap-1.5">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_CLASE[c] }} />
                  {c === "gerencia" && !panel ? "Reservado" : NOMBRE_CLASE[c]}
                </li>
              ))}
            </ul>
          )}
          {filtroAbierto && (
            <div className="w-[17.5rem] rounded-2xl border border-[var(--border)] bg-white/95 p-3.5 shadow-[0_10px_30px_-10px_rgba(20,22,28,0.4)] backdrop-blur">
              <p className="m-0 mb-2.5 text-[11px] font-semibold tracking-[0.16em] text-[var(--text-muted)] uppercase">
                Filtrar por metraje
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {RANGOS_METRAJE.map((r) => {
                  const activo = fMin === r.min && fMax === r.max;
                  return (
                    <button
                      key={r.texto}
                      type="button"
                      onClick={() => {
                        setFMin(activo ? "" : r.min);
                        setFMax(activo ? "" : r.max);
                      }}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                        activo
                          ? "border-[var(--ceinys-grafito-700)] bg-[var(--ceinys-grafito-700)] text-white"
                          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      {r.texto}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                {(
                  [
                    ["Mín.", fMin, setFMin],
                    ["Máx.", fMax, setFMax],
                  ] as const
                ).map(([et, valor, poner]) => (
                  <label
                    key={et}
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs text-[var(--text-muted)]"
                  >
                    {et}
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={valor}
                      onChange={(e) => poner(e.target.value.replace(/\D/g, ""))}
                      className="w-full min-w-0 border-0 bg-transparent p-0 text-right text-sm font-semibold text-[var(--text-primary)] outline-none"
                      aria-label={`Metraje ${et === "Mín." ? "mínimo" : "máximo"} en metros cuadrados`}
                    />
                    <span className="shrink-0">m²</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5">
                <span className="text-xs text-[var(--text-secondary)]">
                  {filtroActivo ? (
                    <>
                      <b className="text-[var(--text-primary)]">{coinciden}</b>{" "}
                      {coinciden === 1 ? "lote coincide" : "lotes coinciden"}
                    </>
                  ) : (
                    "Elige un rango o escribe uno"
                  )}
                </span>
                {filtroActivo && (
                  <button
                    type="button"
                    onClick={() => {
                      setFMin("");
                      setFMax("");
                    }}
                    className="text-xs font-semibold text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)]"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            aria-expanded={filtroAbierto}
            onClick={() => setFiltroAbierto((a) => !a)}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold shadow-[0_6px_20px_-8px_rgba(20,22,28,0.45)] transition-colors ${
              filtroActivo
                ? "border-[var(--ceinys-grafito-700)] bg-[var(--ceinys-grafito-700)] text-white"
                : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4" aria-hidden>
              <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="8" cy="17" r="2" />
            </svg>
            {filtroActivo ? `Metraje: ${fMin || "0"}–${fMax || "más"} m²` : "Filtrar por metraje"}
          </button>
        </div>

        <div className="absolute top-[3.9rem] right-2 z-10 flex flex-col gap-1.5 max-lg:scale-90 lg:top-auto lg:right-3 lg:bottom-3 lg:translate-y-0">
          <button type="button" aria-label="Acercar" className={`${BTN_MAPA} w-10 text-base shadow-sm`} onClick={() => zoomEn(1 / 1.5)}>
            +
          </button>
          <button type="button" aria-label="Alejar" className={`${BTN_MAPA} w-10 text-base shadow-sm`} onClick={() => zoomEn(1.5)}>
            −
          </button>
          <button
            type="button"
            aria-label="Ver todo el plano"
            title="Ver todo"
            className={`${BTN_MAPA} w-10 shadow-sm`}
            onClick={() => base.current && aplicarVista({ ...base.current })}
          >
            ⤢
          </button>
        </div>
      </div>
    </div>
  );
}

/** Ficha del lote tocado: mismo encabezado que el cotizador (check verde + MZ · LOTE) y paso al cotizador. */
function FichaLote({ lote, dibujado }: { lote: LoteMapa | undefined; dibujado: boolean }) {
  return (
    <section className="card overflow-hidden p-0" aria-live="polite">
      {!lote ? (
        <p className="m-0 px-4 py-4 text-sm text-[var(--text-muted)]">
          Toca un lote del mapa para ver sus datos y cotizarlo.
        </p>
      ) : (
        <div className="flex flex-col">
          <div className="flex flex-col gap-3 px-4 pt-4 pb-3.5 max-lg:flex-row max-lg:flex-wrap max-lg:items-center max-lg:justify-between max-lg:gap-x-3 max-lg:gap-y-2 max-lg:pt-3 max-lg:pr-12 max-lg:pb-3 sm:px-5">
            <p className="m-0 text-xs text-[var(--text-secondary)] max-lg:hidden">Ubicación (Mz y Lote)</p>
            <h2 className="m-0 flex items-center gap-2.5 whitespace-nowrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={lote.id}
                src="/icons/verificado-verde.png"
                alt="Ubicación encontrada"
                className="animate-pop block h-5 w-5 shrink-0 lg:h-6 lg:w-6"
              />
              <span className="flex items-baseline gap-2">
                <span className="text-lg leading-none font-semibold text-[var(--text-secondary)] lg:text-2xl">
                  MZ {lote.mz}
                </span>
                <span className="text-lg leading-none font-semibold text-[var(--text-muted)]">·</span>
                <span className="text-lg leading-none font-extrabold tracking-tight text-[var(--text-primary)] lg:text-2xl">
                  LOTE {lote.lt}
                </span>
              </span>
            </h2>
          </div>

          {claseDeLote(lote) !== "libre" && (
            <p
              role="status"
              className="m-0 border-t border-[var(--border)] px-4 py-2.5 text-xs font-bold tracking-wider uppercase sm:px-5"
              style={{ color: COLOR_CLASE[claseDeLote(lote)] }}
            >
              ● {claseDeLote(lote) === "gerencia" ? "Reservado" : NOMBRE_CLASE[claseDeLote(lote)]}{claseDeLote(lote) === "gerencia" ? " · no está disponible" : " · no se puede enviar la cotización"}
            </p>
          )}

          <dl className="m-0 border-t border-[var(--border)] max-lg:grid max-lg:grid-cols-2">
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 max-lg:flex-col max-lg:items-center max-lg:justify-center max-lg:gap-0.5 max-lg:py-2 sm:px-5">
              <dt className="text-sm text-[var(--text-secondary)]">Metraje</dt>
              <dd className="m-0 text-sm font-semibold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                {lote.metraje} m²
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] px-4 py-2.5 max-lg:flex-col max-lg:items-center max-lg:justify-center max-lg:gap-0.5 max-lg:border-t-0 max-lg:border-l max-lg:py-2 sm:px-5">
              <dt className="text-sm text-[var(--text-secondary)]">Ubicación</dt>
              <dd className="m-0 -mr-2 rounded-md bg-[#3b82f6]/15 px-2 py-0.5 text-right text-sm font-semibold text-[var(--text-primary)] max-lg:mr-0 max-lg:text-center max-lg:text-xs">
                {lote.ubicacion}
              </dd>
            </div>
            {lote.precio != null && (
              <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] px-4 py-2.5 max-lg:col-span-2 max-lg:flex-col max-lg:items-center max-lg:justify-center max-lg:gap-0.5 max-lg:py-2 sm:px-5">
                <dt className="text-sm text-[var(--text-secondary)]">Precio con dscto</dt>
                <dd className="m-0 text-sm font-bold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                  {formatSoles(lote.precio)}
                </dd>
              </div>
            )}
          </dl>

          {!dibujado && (
            <p className="m-0 border-t border-[var(--border)] px-4 py-2.5 text-xs text-[var(--text-muted)] sm:px-5">
              Este lote aún no está dibujado en el plano.
            </p>
          )}

          {claseDeLote(lote) !== "gerencia" && (
          <div className="border-t border-[var(--border)] p-4 max-lg:p-3 sm:px-5">
            <Link
              href={`/?lote=${encodeURIComponent(lote.id)}`}
              className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--ceinys-grafito-700)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--ceinys-grafito-900)] max-lg:min-h-10"
            >
              Cotizar este lote
            </Link>
          </div>
          )}
        </div>
      )}
    </section>
  );
}
