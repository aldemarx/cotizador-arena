"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLoteActivo } from "@/components/LoteActivo";

const URL_SVG = "/plano/arenas.svg";
/** Metros de alto que se ven alrededor del lote (el ancho sale de la proporción de la caja). */
const ALTO_M = 56;
/** Con el mapa expandido (caja más alta) se muestra más alrededor del lote. */
const ALTO_M_EXPANDIDO = 110;
/** Lo más cerca que se puede acercar (metros de ancho visibles) y margen de calle que se deja alrededor de los lotes. */
const ANCHO_MIN_M = 18;
const MARGEN_M = 3;

type Vista = { x: number; y: number; w: number };

/** Color de la tarjeta (verde del logo de Arenas), como los de las demás tarjetas del cotizador. */
const COLOR = "#5f9b3c";

let cache: Promise<string> | null = null;
const cargarPlano = () =>
  (cache ??= fetch(URL_SVG).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status))))));

const ESTILO = `
.vista-lote svg { width: 100%; height: 100%; display: block; }
.vista-lote path.sel { fill: color-mix(in srgb, #000000 12%, #fef7e2); stroke: #1e3a8a !important; stroke-width: 0.6 !important; }
.vista-lote .ins.sel .cue { stroke: #1e3a8a; stroke-width: 0.35; }
`;

/**
 * Mini vista previa de la ubicación del lote que se cotiza: el plano de Arenas centrado en ese lote. Se puede arrastrar y acercar (rueda, pellizco o botones), sin salir de los lotes;
 * tocar otro lote lo elige en el cotizador; el botón «Ver plano completo» abre el plano en ese lote.
 */
export function VistaPreviaLote({ expandido = false, onExpandir }: { expandido?: boolean; onExpandir?: () => void }) {
  const { codigo, pedir } = useLoteActivo();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const envoltura = useRef<HTMLDivElement>(null);
  const [dibujado, setDibujado] = useState(true);
  // Vista actual (esquina y ancho, en metros del plano) y límites del plano: no se puede salir de los lotes (sin zonas vacías).
  const vista = useRef<Vista | null>(null);
  const limites = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const pellizco = useRef<number | null>(null);

  function aplicar(v: Vista) {
    const raiz = caja.current;
    const s = raiz?.querySelector("svg");
    const lim = limites.current;
    if (!raiz || !s || !lim) return;
    const r = raiz.getBoundingClientRect();
    if (r.width === 0) return;
    const prop = r.height / r.width;
    const w = Math.min(Math.max(v.w, ANCHO_MIN_M), lim.w, lim.h / prop);
    const h = w * prop;
    const x = Math.min(Math.max(v.x, lim.x), lim.x + lim.w - w);
    const y = Math.min(Math.max(v.y, lim.y), lim.y + lim.h - h);
    vista.current = { x, y, w };
    s.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  }

  /** Acerca o aleja manteniendo fijo el punto (px, py) de la caja, en píxeles. */
  function zoomEn(factor: number, px?: number, py?: number) {
    const raiz = caja.current;
    const v = vista.current;
    if (!raiz || !v) return;
    const r = raiz.getBoundingClientRect();
    const fx = (px ?? r.width / 2) / r.width;
    const fy = (py ?? r.height / 2) / r.height;
    const prop = r.height / r.width;
    const w = v.w * factor;
    aplicar({ x: v.x + v.w * fx - w * fx, y: v.y + v.w * prop * fy - w * prop * fy, w });
  }

  // La rueda del ratón acerca o aleja; debe registrarse sin «passive» para poder frenar el desplazamiento de la página.
  useEffect(() => {
    const el = envoltura.current;
    if (!el) return;
    const alRodar = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomEn(Math.exp(e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", alRodar, { passive: false });
    return () => el.removeEventListener("wheel", alRodar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un toque (sin arrastrar) sobre un lote lo elige para cotizarlo.
  const toque = useRef<{ x: number; y: number; mov: boolean; multi: boolean } | null>(null);

  // Si la caja cambia de tamaño (ventana, fuentes que cargan), la vista se recalcula con la nueva proporción.
  useEffect(() => {
    const el = envoltura.current;
    if (!el) return;
    const o = new ResizeObserver(() => vista.current && aplicar(vista.current));
    o.observe(el);
    return () => o.disconnect();
  }, []);

  function alPresionar(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pellizco.current = null;
    if (punteros.current.size === 1) toque.current = { x: e.clientX, y: e.clientY, mov: false, multi: false };
    else if (toque.current) toque.current.multi = true;
  }

  function loteEn(px: number, py: number): string | null {
    const raiz = caja.current;
    const s = raiz?.querySelector("svg");
    const v = vista.current;
    if (!raiz || !s || !v) return null;
    const r = raiz.getBoundingClientRect();
    const m = v.w / r.width;
    const pt = new DOMPoint(v.x + (px - r.left) * m, v.y + (py - r.top) * m);
    for (const p of s.querySelectorAll<SVGGeometryElement>('path[id^="lote-"]')) {
      if (p.isPointInFill(pt)) return p.id.slice(5);
    }
    return null;
  }

  function alMover(e: React.PointerEvent) {
    const ps = punteros.current;
    const antes = ps.get(e.pointerId);
    const v = vista.current;
    const raiz = caja.current;
    if (!antes || !v || !raiz) return;
    const r = raiz.getBoundingClientRect();
    ps.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toque.current && Math.hypot(e.clientX - toque.current.x, e.clientY - toque.current.y) > 5) toque.current.mov = true;
    if (ps.size === 1) {
      const m = v.w / r.width; // metros por píxel
      aplicar({ ...v, x: v.x - (e.clientX - antes.x) * m, y: v.y - (e.clientY - antes.y) * m });
    } else if (ps.size === 2) {
      const [a, b] = [...ps.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pellizco.current) zoomEn(pellizco.current / dist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pellizco.current = dist;
    }
  }

  function alSoltar(e: React.PointerEvent) {
    const t = toque.current;
    if (t && !t.mov && !t.multi && e.type === "pointerup") {
      const c = loteEn(e.clientX, e.clientY);
      if (c && c !== codigo) pedir(c);
    }
    if (punteros.current.size <= 1) toque.current = null;
    punteros.current.delete(e.pointerId);
    pellizco.current = null;
  }

  useEffect(() => {
    cargarPlano().then(setSvg, () => setError(true));
  }, []);

  // Cada vez que cambia el lote: se resalta y el plano se centra en él.
  useLayoutEffect(() => {
    const raiz = caja.current;
    const s = raiz?.querySelector("svg");
    if (!raiz || !s || !svg) return;
    s.removeAttribute("width");
    s.removeAttribute("height");
    raiz.querySelectorAll(".sel").forEach((n) => n.classList.remove("sel"));
    const p = codigo ? raiz.querySelector<SVGGraphicsElement>(`[id="lote-${codigo}"]`) : null;
    setDibujado(!!p || !codigo);
    const r = raiz.getBoundingClientRect();
    const ref = p ?? s.querySelector<SVGGraphicsElement>("#insignias");
    if (!ref || r.width === 0) return;
    if (p) {
      p.classList.add("sel");
      p.parentElement?.appendChild(p);
      raiz.querySelector(`g.ins[data-lote="${codigo}"]`)?.classList.add("sel");
    }
    const lotes = s.querySelector<SVGGraphicsElement>("#insignias")?.getBBox();
    if (lotes) limites.current = { x: lotes.x - MARGEN_M, y: lotes.y - MARGEN_M, w: lotes.width + 2 * MARGEN_M, h: lotes.height + 2 * MARGEN_M };
    const b = ref.getBBox();
    const v = vista.current;
    if (v) {
      // Ya hay una vista (la primera vez se acerca al lote; después se respeta el acercamiento del usuario): si el lote nuevo se ve completo,
      // no se mueve nada; si queda fuera, solo se desplaza para centrarlo.
      const h = v.w * (r.height / r.width);
      const visible = b.x >= v.x && b.y >= v.y && b.x + b.width <= v.x + v.w && b.y + b.height <= v.y + h;
      if (!visible) aplicar({ x: b.x + b.width / 2 - v.w / 2, y: b.y + b.height / 2 - h / 2, w: v.w });
      return;
    }
    const h = ALTO_M;
    const w = h * (r.width / r.height);
    aplicar({ x: b.x + b.width / 2 - w / 2, y: b.y + b.height / 2 - h / 2, w });
  }, [svg, codigo]);

  // Al expandir o contraer la tarjeta, el plano vuelve a centrarse en el lote con el mismo acercamiento.
  useEffect(() => {
    const id = requestAnimationFrame(() => centrar());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandido]);

  function centrar() {
    const raiz = caja.current;
    const p = codigo ? raiz?.querySelector<SVGGraphicsElement>(`[id="lote-${codigo}"]`) : null;
    const r = raiz?.getBoundingClientRect();
    if (!p || !r) return;
    const b = p.getBBox();
    const alto = expandido ? ALTO_M_EXPANDIDO : ALTO_M;
    const w = alto * (r.width / r.height);
    aplicar({ x: b.x + b.width / 2 - w / 2, y: b.y + b.height / 2 - alto / 2, w });
  }

  return (
    <section className="card flex flex-col rounded-xl p-0 lg:min-h-0 lg:flex-1">
      <style>{ESTILO}</style>
      {/* Mismo encabezado que las tarjetas del cotizador: cuadro con ícono y título en el color de la tarjeta */}
      <div
        className="flex items-center gap-3 rounded-t-[11px] py-3 pr-5 pl-8"
        style={{ backgroundColor: `${COLOR}26` }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]" style={{ backgroundColor: COLOR }}>
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
            <path d="M9 3v15M15 6v15" />
          </svg>
        </div>
        <h2 className="ml-1.5 text-sm font-bold sm:text-base lg:text-[17px]" style={{ color: COLOR }}>
          Ubicación del lote
        </h2>
        {onExpandir && (
          <button
            type="button"
            onClick={onExpandir}
            aria-pressed={expandido}
            aria-label={expandido ? "Reducir el mapa" : "Expandir el mapa"}
            title={expandido ? "Reducir el mapa" : "Expandir el mapa"}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
          >
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              {expandido ? <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /> : <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />}
            </svg>
          </button>
        )}
        <Link
          href={codigo ? `/mapa?lote=${encodeURIComponent(codigo)}` : "/mapa"}
          className={`${onExpandir ? "" : "ml-auto"} shrink-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] sm:text-[13px]`}
        >
          Ver plano completo
        </Link>
      </div>

      <div className="flex flex-col px-4 pt-3 pb-6 lg:min-h-0 lg:flex-1">
        <div
          ref={envoltura}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onDoubleClick={centrar}
          className={`relative ${expandido ? "h-[26rem]" : "h-44 sm:h-52"} cursor-grab touch-none overflow-hidden rounded-xl border border-[var(--border)] bg-[#f3f2ef] select-none active:cursor-grabbing lg:h-auto lg:min-h-[120px] lg:flex-[1_1_0px]`}
        >
          <div ref={caja} className="vista-lote pointer-events-none absolute inset-0" dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
          {svg && (
            <div className="absolute right-2 bottom-2 flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" aria-label="Acercar" onClick={() => zoomEn(0.7)} className="flex h-8 w-8 items-center justify-center text-lg leading-none font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)]">+</button>
              <button type="button" aria-label="Alejar" onClick={() => zoomEn(1 / 0.7)} className="flex h-8 w-8 items-center justify-center border-t border-[var(--border)] text-lg leading-none font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)]">−</button>
              <button type="button" aria-label="Volver al lote" title="Volver al lote" onClick={centrar} className="flex h-8 w-8 items-center justify-center border-t border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]">
                <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
              </button>
            </div>
          )}
          {error && <p className="absolute inset-0 m-0 flex items-center justify-center text-sm text-[var(--text-muted)]">No se pudo cargar el plano.</p>}
          {svg && !dibujado && (
            <p className="absolute inset-x-3 bottom-3 m-0 rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-[var(--text-muted)] shadow-sm">
              Este lote aún no está dibujado en el plano.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
