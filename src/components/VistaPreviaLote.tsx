"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLoteActivo } from "@/components/LoteActivo";

const URL_SVG = "/plano/arenas.svg";
/** Metros de alto que se ven alrededor del lote (el ancho sale de la proporción de la caja). */
const ALTO_M = 56;

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
 * Mini vista previa de la ubicación del lote que se cotiza: el plano de Arenas centrado en ese lote. Es solo de lectura;
 * al tocarla se abre el plano completo en ese lote.
 */
export function VistaPreviaLote() {
  const { codigo } = useLoteActivo();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const [dibujado, setDibujado] = useState(true);

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
    const b = ref.getBBox();
    const h = ALTO_M;
    const w = h * (r.width / r.height);
    s.setAttribute("viewBox", `${b.x + b.width / 2 - w / 2} ${b.y + b.height / 2 - h / 2} ${w} ${h}`);
  }, [svg, codigo]);

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
        <Link
          href={codigo ? `/mapa?lote=${encodeURIComponent(codigo)}` : "/mapa"}
          className="ml-auto shrink-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] sm:text-[13px]"
        >
          Ver plano completo
        </Link>
      </div>

      <div className="flex flex-col px-4 pt-3 pb-4 lg:min-h-0 lg:flex-1">
        <div className="relative h-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[#f3f2ef] sm:h-52 lg:h-auto lg:min-h-[120px] lg:flex-[1_1_0px]">
          <div ref={caja} className="vista-lote pointer-events-none absolute inset-0" dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
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
