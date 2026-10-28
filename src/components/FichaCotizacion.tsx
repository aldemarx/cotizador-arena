"use client";

import { createContext, forwardRef, useContext } from "react";
import {
  formatearMonto,
  modalidadesDe,
  PARAMETROS,
  plazoDe,
  partesDeInicial,
  etiquetaMes,
  PROYECTO,
  segmentosDeTramo,
  type InicialModo,
  type Lote,
} from "@/lib/arenas";
import {
  ENMASCARAR_DNI,
  FORMATO_FICHA,
  FORMATOS_FICHA,
  type FormatoFicha,
} from "@/lib/configCotizacion";
import { REDES } from "@/components/RedesSociales";
import { Soles } from "@/components/Soles";
import { BANCOS, COLOR_MONEDA, TITULAR } from "@/lib/cuentasDePago";

/** Medidas de las imágenes que se envían; salen de src/lib/configCotizacion.ts. */
export const FICHA_ANCHO = FORMATOS_FICHA[FORMATO_FICHA].ancho;
export const FICHA_ALTO = FORMATOS_FICHA[FORMATO_FICHA].alto;

/** Altura de referencia con la que se diseñaron los espaciados (formato 4:5). */
const ALTO_BASE = FORMATOS_FICHA.cuadrado.alto;

export type ClienteFicha = { nombre: string; dni: string };

export type DatosFicha = {
  lote: Lote;
  inicialModo: InicialModo;
  emitida: Date;
  /** Si viene, se imprime en una franja bajo el título. */
  cliente?: ClienteFicha | null;
  /** Solo para comparar formatos en /ficha; el envío real usa FORMATO_FICHA. */
  formato?: FormatoFicha;
};

const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatearFecha(fecha: Date): string {
  return FORMATO_FECHA.format(fecha).replace(".", "").replace(",", " ·");
}

function dniVisible(dni: string): string {
  return ENMASCARAR_DNI ? `${dni.slice(0, 2)}••••${dni.slice(-2)}` : dni;
}

/**
 * Orden tipográfico de la ficha: 6 niveles (antes había 16 tamaños sueltos). Los pesos y los colores
 * son los del proyecto (grises cálidos y acentos azul / verde / naranja): el contraste lo da el peso,
 * no el color. Para volver a la versión anterior:
 * git checkout checkpoint-ficha-antes-de-tipografia -- src/components/FichaCotizacion.tsx
 */
const TIPO = {
  /** El lote (MZ 5 · LOTE 1). */
  h1: "text-[56px] leading-none font-extrabold text-[var(--text-primary)]",
  /** Cifra protagonista: cuota mensual y cantidad de cuotas. */
  cifra: "text-[68px] font-extrabold text-[var(--text-primary)]",
  /** Valores: precios, inicial, tabla. */
  dato: "text-[32px] font-bold text-[var(--text-primary)]",
  /** Etiquetas de fila y textos de apoyo (26 px). */
  medio: "text-[26px] font-semibold text-[var(--text-secondary)]",
  /** Eyebrows: el color lo pone cada uso (gris, azul, secundario). */
  eyebrow: "text-[20px] font-semibold uppercase tracking-[0.14em]",
  /** Aviso legal y notas al pie. */
  legal: "text-[19px] font-normal leading-snug text-[var(--text-muted)]",
} as const;

/** Factor vertical (1 en el formato 4:5): los espaciados lo multiplican para aprovechar la altura extra. */
const FactorVertical = createContext(1);

/**
 * Zona entre el título y el pie. Los bloques conservan sus espacios internos y el espacio que sobra
 * (o falta) se reparte por igual entre ellos, así la ficha cabe en cualquier formato y con nombres
 * de una o dos líneas, sin recortar nada.
 */
function Bloques({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-evenly">
      {children}
    </div>
  );
}

/** Aviso al pie de la cara 1 (propuesta económica). */
const TEXTO_LEGAL =
  "Propuesta económica sujeta a disponibilidad de lote y firma de contrato de compraventa. No genera reserva vinculante sin el pago de la inicial.";

function useV() {
  const k = useContext(FactorVertical);
  return (px: number) => Math.round(px * k);
}

/** Formato cuadrado (4:5): no hay altura para el aviso legal; se compactan los espaciados. */
function useCompacto() {
  return useContext(FactorVertical) < 1;
}

/* ---------- piezas compartidas ---------- */

function Cabecera({ etiqueta, emitida }: { etiqueta: string; emitida: Date }) {
  return (
    <header className="flex shrink-0 items-start justify-between">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-ceinys-horizontal.png"
        alt="CEINYS"
        className="h-[52px] w-auto"
      />
      <div className="text-right">
        <p className={`m-0 ${TIPO.eyebrow} text-[var(--text-secondary)]`}>
          {etiqueta}
        </p>
        <p className="m-0 mt-2 text-[20px] font-medium text-[var(--text-muted)] [font-variant-numeric:tabular-nums]">
          {formatearFecha(emitida)}
        </p>
      </div>
    </header>
  );
}

/** Franja con los datos del cliente (nombre y DNI), justo bajo el título. */
function FranjaCliente({ cliente }: { cliente: ClienteFicha }) {
  const v = useV();
  const largo = cliente.nombre.length > 30;
  return (
    <div
      className="flex shrink-0 items-center justify-between gap-8 rounded-[24px] border-2 border-[var(--border)] bg-[var(--ceinys-grafito-100)] px-9"
      style={{ paddingTop: v(20), paddingBottom: v(20) }}
    >
      <div className="min-w-0">
        <p className={`m-0 ${TIPO.eyebrow} text-[var(--text-muted)]`}>
          Titular / Cliente
        </p>
        <p
          className="m-0 mt-1.5 leading-tight font-extrabold break-words uppercase"
          style={{ fontSize: largo ? 28 : 32 }}
        >
          {cliente.nombre}
        </p>
      </div>
      {cliente.dni && (
        <div className="shrink-0 text-right">
          <p className={`m-0 ${TIPO.eyebrow} text-[var(--text-muted)]`}>
            DNI / Documento
          </p>
          <p className="m-0 mt-1.5 text-[32px] leading-tight font-extrabold [font-variant-numeric:tabular-nums]">
            {dniVisible(cliente.dni)}
          </p>
        </div>
      )}
    </div>
  );
}

function Pie({ legal }: { legal?: string }) {
  const v = useV();
  return (
    <footer
      className="mt-auto flex shrink-0 flex-col items-center gap-4 border-t-2 border-[var(--border)] text-center"
      style={{ paddingTop: v(20) }}
    >
      {legal && <p className={`m-0 max-w-[900px] ${TIPO.legal}`}>{legal}</p>}

      <div className="flex items-center gap-4">
        {REDES.map((r) => (
          <span
            key={r.label}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--ceinys-grafito-100)] text-[var(--ceinys-grafito-700)]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-[26px] w-[26px]"
            >
              {r.icono}
            </svg>
          </span>
        ))}
      </div>
      <p className={`m-0 ${TIPO.legal}`}>
        © 2026 CEINYS — Constructora e Inmobiliaria · RUC 20611776391
        <br />
        Todos los derechos reservados.
      </p>
    </footer>
  );
}

function Lienzo({
  formato,
  children,
}: {
  formato: FormatoFicha;
  children: React.ReactNode;
}) {
  const { ancho, alto } = FORMATOS_FICHA[formato];
  return (
    <FactorVertical.Provider value={alto <= ALTO_BASE ? 0.7 : alto / ALTO_BASE}>
      <div
        className="flex flex-col overflow-hidden bg-[var(--page-plane)] px-[64px] pt-[44px] pb-[36px] text-[var(--text-primary)]"
        style={{
          width: ancho,
          height: alto,
          fontFamily: "var(--font-sans), 'Segoe UI', Arial, sans-serif",
        }}
      >
        {children}
      </div>
    </FactorVertical.Provider>
  );
}

function Etiqueta({
  color,
  children,
  centrada = false,
}: {
  color: string;
  children: React.ReactNode;
  /** El texto se centra de verdad sobre la cifra: el punto queda colgando a la izquierda y no cuenta. */
  centrada?: boolean;
}) {
  if (centrada)
    return (
      <p
        className={`m-0 flex justify-center ${TIPO.eyebrow} text-[var(--text-muted)]`}
      >
        <span className="relative inline-flex items-center whitespace-nowrap">
          <span
            className="absolute right-full mr-3 h-[14px] w-[14px] rounded-full"
            style={{ background: color }}
          />
          {children}
        </span>
      </p>
    );
  return (
    <p
      className={`m-0 flex items-center gap-3 ${TIPO.eyebrow} text-[var(--text-muted)]`}
    >
      <span
        className="h-[14px] w-[14px] rounded-full"
        style={{ background: color }}
      />
      {children}
    </p>
  );
}

/** Sello verde de «verificado» (borde ondulado y check blanco) que acompaña al lote. */
function SelloVerificado({ tamano = 40 }: { tamano?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      style={{ width: tamano, height: tamano }}
      className="shrink-0"
    >
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill="#10b981"
      />
      <path
        d="m8.6 12.2 2.4 2.4 4.5-4.8"
        fill="none"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- cara 1: el lote y su fraccionamiento ---------- */

function ContenidoCara1({ lote, emitida, cliente }: DatosFicha) {
  // Solo se muestran los datos que existen (una cotización puntual puede no traer ubicación o etapa)
  const datosDelLote = (
    [
      [
        "Metraje",
        `${Number.isInteger(lote.metraje_m2) ? lote.metraje_m2 : lote.metraje_m2.toFixed(2)} m²`,
      ],
      ["Ubicación", lote.ubicacion],
      ["Etapa", lote.etapa],
    ] as [string, string][]
  ).filter(([, valor]) => valor);
  const v = useV();
  const compacto = useCompacto();
  const cuota = lote.planes.fija.cuotas_por_tramo[0];
  const partes = partesDeInicial(lote, emitida);

  return (
    <>
      <Cabecera etiqueta="Cotización referencial" emitida={emitida} />

      <Bloques>
        <div
          className="flex shrink-0 items-center justify-between rounded-[28px] border-2 border-[var(--border)] bg-white px-10"
          style={{ paddingTop: v(28), paddingBottom: v(28) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos-arenas/logo-arenas.png"
            alt={PROYECTO}
            className="h-[88px] w-auto"
          />
          <div className="text-right">
            <p className={`m-0 ${TIPO.eyebrow} text-[var(--text-muted)]`}>
              {" "}
              Manzana y lote
            </p>
            <p
              className={`m-0 mt-1 flex items-center justify-end gap-3 ${TIPO.h1}`}
            >
              <SelloVerificado />
              <span className="flex items-baseline gap-3">
                <span className="font-semibold text-[var(--text-secondary)]">
                  MZ {lote.mz}
                </span>
                <span className="text-[40px] font-semibold text-[var(--text-muted)]">
                  ·
                </span>
                <span>LOTE {lote.lt}</span>
              </span>
            </p>
          </div>
        </div>

        {cliente && <FranjaCliente cliente={cliente} />}

        {/* Misma estructura que «Fraccionamiento»: títulos resaltados arriba y la información en blanco debajo */}
        <div className="shrink-0 overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-white">
          <div
            className="grid bg-[#3b82f6]/12"
            style={{
              gridTemplateColumns: `repeat(${datosDelLote.length}, minmax(0, 1fr))`,
            }}
          >
            {datosDelLote.map(([k], i) => (
              <p
                key={k}
                className={`m-0 px-4 text-center ${TIPO.eyebrow} text-[#2563eb] ${i > 0 ? "border-l-2 border-white/70" : ""}`}
                style={{ paddingTop: v(18), paddingBottom: v(18) }}
              >
                {k}
              </p>
            ))}
          </div>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${datosDelLote.length}, minmax(0, 1fr))`,
            }}
          >
            {datosDelLote.map(([k, val], i) => (
              <p
                key={k}
                className={`m-0 px-4 text-center text-[28px] leading-tight font-bold ${i > 0 ? "border-l-2 border-[var(--border)]" : ""}`}
                style={{ paddingTop: v(22), paddingBottom: v(22) }}
              >
                {val}
              </p>
            ))}
          </div>
        </div>

        <div className="shrink-0 overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-white">
          <div
            className="bg-[#10b981]/15 px-10 text-[26px] font-bold text-[#059669]"
            style={{ paddingTop: v(20), paddingBottom: v(20) }}
          >
            Fraccionamiento{" "}
            <span className="ml-2 text-[18px] font-semibold tracking-wider uppercase">
              (sin intereses)
            </span>
          </div>

          <div
            className="grid grid-cols-[minmax(0,1.3fr)_auto_minmax(0,1fr)] items-start gap-6 px-8 text-center"
            style={{ paddingTop: v(36), paddingBottom: v(36) }}
          >
            {/* Igual que el cotizador: la cifra va centrada bajo su etiqueta y «/ mes» cuelga a la derecha sin contar */}
            <div>
              <Etiqueta color="#10b981" centrada>
                Cuota mensual
              </Etiqueta>
              <p className="m-0 mt-3 flex h-[84px] items-center justify-center leading-none whitespace-nowrap [font-variant-numeric:tabular-nums]">
                <span className="relative inline-flex items-baseline">
                  <span
                    className={
                      formatearMonto(cuota).length > 7
                        ? "text-[52px] font-extrabold text-[var(--text-primary)]"
                        : TIPO.cifra
                    }
                  >
                    <Soles monto={cuota} />
                  </span>
                  <span className="absolute bottom-[0.1em] left-full ml-2 text-[26px] font-medium text-[var(--text-muted)]">
                    / mes
                  </span>
                </span>
              </p>
            </div>
            <span className="mt-1 h-[100px] w-[2px] bg-[var(--border)]" />
            <div>
              <Etiqueta color="#10b981" centrada>
                Cant. de cuotas
              </Etiqueta>
              <p className="m-0 mt-3 flex h-[84px] items-center justify-center gap-2 leading-none">
                <span className="inline-flex items-baseline gap-2">
                  <span className={TIPO.cifra}>{plazoDe(lote)}</span>
                  <span className="text-[26px] font-medium text-[var(--text-muted)]">
                    cuotas
                  </span>
                </span>
              </p>
            </div>
          </div>

          <div
            className="border-t-2 border-[var(--border)] px-10"
            style={{ paddingTop: v(14), paddingBottom: v(14) }}
          >
            {lote.precio_lista === lote.precio_con_dscto ? (
              <div
                className="flex items-center justify-between text-[26px]"
                style={{ paddingTop: v(16), paddingBottom: v(16) }}
              >
                <span className="text-[var(--text-secondary)]">
                  Precio total
                </span>
                <span className="text-[32px] font-bold [font-variant-numeric:tabular-nums]">
                  <Soles monto={lote.precio_con_dscto} />
                </span>
              </div>
            ) : (
              <div
                className="grid grid-cols-2 gap-5"
                style={{ paddingTop: v(10), paddingBottom: v(10) }}
              >
                <div
                  className="flex flex-col items-center rounded-[20px] border-2 border-[var(--border)] bg-[var(--surface-2)] px-4 text-center"
                  style={{ gap: v(12), paddingTop: v(22), paddingBottom: v(22) }}
                >
                  <span className="rounded-full bg-[var(--ceinys-grafito-100)] px-5 py-1 text-[19px] font-bold tracking-[0.12em] whitespace-nowrap text-[var(--text-secondary)] uppercase">
                    Precio total
                  </span>
                  <span className="text-[34px] font-medium text-[var(--text-muted)] line-through [font-variant-numeric:tabular-nums]">
                    <Soles monto={lote.precio_lista} />
                  </span>
                </div>
                <div
                  className="flex flex-col items-center rounded-[20px] border-2 border-[#10b981]/35 bg-[#10b981]/10 px-4 text-center"
                  style={{ gap: v(12), paddingTop: v(22), paddingBottom: v(22) }}
                >
                  <span className="rounded-full bg-[#10b981]/15 px-5 py-1 text-[19px] font-bold tracking-[0.12em] whitespace-nowrap text-[#059669] uppercase">
                    Precio con dscto
                  </span>
                  <span className="text-[38px] font-extrabold [font-variant-numeric:tabular-nums]">
                    <Soles monto={lote.precio_con_dscto} />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div
            className="border-t-2 border-[var(--border)] px-10"
            style={{ paddingTop: v(24), paddingBottom: v(32) }}
          >
            <div className="flex items-center justify-between text-[26px]">
              <span className="text-[var(--text-secondary)]">
                Inicial{" "}
                <span className="text-[20px] text-[var(--text-muted)]">
                  · se paga al firmar
                </span>
              </span>
              <span className="text-[32px] font-bold [font-variant-numeric:tabular-nums]">
                <Soles monto={lote.inicial} />
              </span>
            </div>
            <div
              className="mt-3 grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${partes.length}, minmax(0, 1fr))`,
              }}
            >
              {partes.map((p) => (
                <div
                  key={p.fecha}
                  className="rounded-[18px] bg-[var(--surface-2)] px-4 text-center"
                  style={{ paddingTop: v(16), paddingBottom: v(16) }}
                >
                  <p
                    className={`m-0 whitespace-nowrap ${TIPO.eyebrow} text-[var(--text-muted)]`}
                  >
                    {p.fecha}
                  </p>
                  <p className="m-0 mt-1 text-[32px] font-bold [font-variant-numeric:tabular-nums]">
                    <Soles monto={p.monto} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Bloques>

      <Pie legal={compacto ? undefined : TEXTO_LEGAL} />
    </>
  );
}

export const FichaCara1 = forwardRef<HTMLDivElement, DatosFicha>(
  function FichaCara1(props, ref) {
    const formato = props.formato ?? FORMATO_FICHA;
    return (
      <div ref={ref}>
        <Lienzo formato={formato}>
          <ContenidoCara1 {...props} />
        </Lienzo>
      </div>
    );
  },
);

/* ---------- cara 2: las tres modalidades, año por año ---------- */

function ContenidoCara2({ lote, emitida, cliente }: DatosFicha) {
  const v = useV();
  const compacto = useCompacto();
  const segmentos = modalidadesDe(lote).map((m) => ({
    ...m,
    tramos: segmentosDeTramo(lote, m.key),
  }));
  const base = segmentos[0].tramos;
  // Plazo de un solo año: las tres modalidades coinciden, así que en vez de una tabla de una fila se muestra mes por mes
  const porMes = plazoDe(lote) <= PARAMETROS.meses_por_tramo;
  const titulo = porMes
    ? "Tu cronograma de cuotas"
    : segmentos.length > 1
      ? "Escoge tu opción de pago"
      : "Tu plan de cuotas";
  const cuotaFija = lote.planes.fija.cuotas_por_tramo[0];
  const mesesPlan = base.reduce((t, b) => t + b.meses, 0);
  const partes = partesDeInicial(lote, emitida);
  const columnas = `1.15fr ${"1fr ".repeat(segmentos.length)}`.trim();

  return (
    <>
      <Cabecera etiqueta="Opciones de cuota" emitida={emitida} />

      <Bloques>
        {cliente && <FranjaCliente cliente={cliente} />}

        <>
          {/* Misma tarjeta del lote que la primera hoja: «Manzana y lote» a la izquierda y la inicial a la derecha */}
          <div
            className="flex shrink-0 items-center justify-between gap-6 rounded-[28px] border-2 border-[var(--border)] bg-white px-8"
            style={{ paddingTop: v(22), paddingBottom: v(22) }}
          >
            <div>
              <p className={`m-0 ${TIPO.eyebrow} text-[var(--text-muted)]`}>
                Manzana y lote
              </p>
              <p className="m-0 mt-1 flex items-center gap-3 text-[42px] leading-none font-extrabold text-[var(--text-primary)]">
                <SelloVerificado tamano={32} />
                <span className="flex items-baseline gap-2.5">
                  <span className="font-semibold text-[var(--text-secondary)]">
                    MZ {lote.mz}
                  </span>
                  <span className="text-[32px] font-semibold text-[var(--text-muted)]">
                    ·
                  </span>
                  <span>LOTE {lote.lt}</span>
                </span>
              </p>
            </div>
            <span
              aria-hidden
              className="h-[72px] w-[2px] shrink-0 bg-[var(--border)]"
            />
            <div className="text-right">
              <p className={`m-0 ${TIPO.eyebrow} text-[var(--text-muted)]`}>
                Inicial
              </p>
              <p className="m-0 mt-1 text-[40px] leading-none font-extrabold text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                <Soles monto={lote.inicial} />
              </p>
              <p className="m-0 mt-2 text-[20px] leading-none text-[var(--text-muted)]">
                {partes.map((p) => p.fecha).join(" · ")}
              </p>
            </div>
          </div>

          {/* El título y la tabla van juntos: el espacio sobrante se reparte alrededor del conjunto, no entre ellos */}
          <div className="shrink-0">
            {porMes ? (
              <div className="overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-white">
                <div
                  className="bg-[var(--ceinys-grafito-700)] px-10 text-center text-[26px] font-extrabold tracking-[0.14em] text-white uppercase"
                  style={{ paddingTop: v(20), paddingBottom: v(20) }}
                >
                  {titulo}
                </div>
                <div
                  className="grid grid-cols-3 items-center gap-3 px-6"
                  style={{ paddingTop: v(18), paddingBottom: v(18) }}
                >
                  {["Cuota", "Mes de pago", "Monto"].map((t, k) => (
                    <span
                      key={t}
                      className={`${TIPO.eyebrow} text-[var(--text-muted)] ${k === 0 ? "" : k === 1 ? "text-center" : "text-right"}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {Array.from({ length: mesesPlan }, (_, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-3 items-center gap-3 border-t-2 border-[var(--border)] px-6"
                    style={{
                      background: i % 2 === 0 ? "var(--surface-2)" : "white",
                      paddingTop: v(compacto ? 4 : 10),
                      paddingBottom: v(compacto ? 4 : 10),
                    }}
                  >
                    <span className="text-[26px] font-semibold text-[var(--text-secondary)]">
                      Cuota {i + 1}
                    </span>
                    <span className="text-center text-[26px] font-medium text-[var(--text-secondary)]">
                      {etiquetaMes(i + 1, emitida)}
                    </span>
                    <span className="text-right text-[30px] font-bold [font-variant-numeric:tabular-nums]">
                      <Soles monto={cuotaFija} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-white">
                <div
                  className="bg-[var(--ceinys-grafito-700)] px-10 text-center text-[26px] font-extrabold tracking-[0.14em] text-white uppercase"
                  style={{ paddingTop: v(20), paddingBottom: v(20) }}
                >
                  {titulo}
                </div>
                {/* Cada tipo de cuota es una columna con su color (encabezado sólido y celdas teñidas) para que no se confunda */}
                <div className="grid" style={{ gridTemplateColumns: columnas }}>
                  <span
                    className={`${TIPO.eyebrow} flex items-center pl-6 text-[var(--text-muted)]`}
                  >
                    Año (meses*)
                  </span>
                  {segmentos.map((m) => (
                    <span
                      key={m.key}
                      className="flex flex-col items-center justify-center border-l-2 border-white text-center text-white"
                      style={{
                        background: m.color,
                        paddingTop: v(16),
                        paddingBottom: v(16),
                      }}
                    >
                      <span className="block text-[19px] leading-none font-semibold opacity-90">
                        Cuota
                      </span>
                      <span className="mt-1 block text-[26px] leading-none font-extrabold">
                        {m.label}
                      </span>
                    </span>
                  ))}
                </div>
                {base.map((t, i) => (
                  <div
                    key={t.label}
                    className="grid border-t-2 border-white"
                    style={{ gridTemplateColumns: columnas }}
                  >
                    <span
                      className="flex items-center pl-6 text-[26px] font-semibold text-[var(--text-secondary)]"
                      style={{
                        background: i % 2 === 0 ? "var(--surface-2)" : "white",
                        paddingTop: v(18),
                        paddingBottom: v(18),
                      }}
                    >
                      <span>
                        {t.label}{" "}
                        <span className="font-medium text-[var(--text-muted)]">
                          ({t.meses}*)
                        </span>
                      </span>
                    </span>
                    {segmentos.map((m) => (
                      <span
                        key={m.key}
                        className="flex items-center justify-center border-l-2 border-white text-center text-[32px] font-bold [font-variant-numeric:tabular-nums]"
                        style={{
                          background: `color-mix(in srgb, ${m.color} ${i % 2 === 0 ? 20 : 11}%, white)`,
                          paddingTop: v(18),
                          paddingBottom: v(18),
                        }}
                      >
                        <Soles monto={m.tramos[i].monto} />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>

        <p
          className={`m-0 mx-auto max-w-[900px] shrink-0 text-center ${TIPO.legal}`}
        >
          {porMes ? (
            <>{mesesPlan} cuotas mensuales, fraccionamiento incluido.</>
          ) : (
            <>
              <strong className="font-semibold text-[var(--text-secondary)]">
                (*) Meses que se paga cada cuota.
              </strong>{" "}
              {mesesPlan} cuotas en total, fraccionamiento incluido.
            </>
          )}
        </p>
      </Bloques>

      <Pie />
    </>
  );
}

export const FichaCara2 = forwardRef<HTMLDivElement, DatosFicha>(
  function FichaCara2(props, ref) {
    const formato = props.formato ?? FORMATO_FICHA;
    return (
      <div ref={ref}>
        <Lienzo formato={formato}>
          <ContenidoCara2 {...props} />
        </Lienzo>
      </div>
    );
  },
);

/* ---------- cuentas de pago ---------- */

const AVISO_CUENTAS =
  "Realiza tus pagos únicamente a las cuentas a nombre de la empresa. Conserva tu voucher y envíalo a tu asesor para validar el pago.";

/** Dato de la cuenta en el mismo formato de «Metraje / Ubicación»: título resaltado arriba y el valor en blanco debajo. */
function FilaCuenta({
  etiqueta,
  valor,
  color,
}: {
  etiqueta: string;
  valor: string;
  color: string;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border-2 border-[var(--border)] bg-white">
      <p
        className={`m-0 px-7 py-2 ${TIPO.eyebrow} text-[var(--text-secondary)]`}
        style={{ background: `${color}14` }}
      >
        {etiqueta}
      </p>
      <p className="m-0 px-7 py-3.5 text-[42px] leading-none font-extrabold [font-variant-numeric:tabular-nums]">
        {valor}
      </p>
    </div>
  );
}

const PASOS_PAGO = [
  "Elige la cuenta de tu preferencia",
  "Paga por depósito o transferencia",
  "Envía tu voucher a tu asesor",
];

function ContenidoCuentas({ emitida }: { emitida: Date }) {
  return (
    <>
      <Cabecera etiqueta="Cuentas de pago" emitida={emitida} />

      <Bloques>
        {/* Misma tarjeta de presentación que la cotización: el proyecto a la izquierda y el título a la derecha */}
        <div className="flex shrink-0 items-center justify-between gap-6 rounded-[28px] border-2 border-[var(--border)] bg-white px-10 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos-arenas/logo-arenas.png"
            alt={PROYECTO}
            className="h-[88px] w-auto"
          />
          <div className="text-right">
            <div className="flex items-center justify-end">
              <Etiqueta color="#10b981">Medios de pago</Etiqueta>
            </div>
            <p className="m-0 mt-2 text-[44px] leading-none font-extrabold whitespace-nowrap">
              Cuentas bancarias
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-8 rounded-[24px] border-2 border-[var(--border)] bg-[var(--ceinys-grafito-100)] px-9 py-4">
          <div className="min-w-0">
            <p className={`m-0 ${TIPO.eyebrow} text-[var(--text-muted)]`}>
              Depósitos y transferencias a nombre de
            </p>
            <p className="m-0 mt-1.5 text-[24px] leading-tight font-extrabold uppercase">
              {TITULAR}
            </p>
          </div>
          <SelloVerificado tamano={56} />
        </div>

        {BANCOS.map((banco) => (
          <div
            key={banco.nombre}
            className="shrink-0 overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-white"
          >
            <div
              className="relative flex items-center justify-center border-b-2 py-4"
              style={{
                background: `${banco.color}12`,
                borderColor: `${banco.color}33`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banco.logo}
                alt={banco.nombre}
                className="block h-[52px] w-auto"
              />
              <span
                className={`absolute right-8 inline-flex items-center gap-3 rounded-full bg-white px-5 py-2 ${TIPO.eyebrow}`}
                style={{ color: COLOR_MONEDA[banco.cuentas[0].moneda] }}
              >
                <span
                  className="h-[12px] w-[12px] rounded-full"
                  style={{ background: COLOR_MONEDA[banco.cuentas[0].moneda] }}
                />
                {banco.cuentas[0].moneda}
              </span>
            </div>
            {banco.cuentas.map((c) => (
              <div key={c.numero} className="flex flex-col gap-3 px-8 py-5">
                <FilaCuenta
                  etiqueta="N° de cuenta"
                  valor={c.numero}
                  color={banco.color}
                />
                <FilaCuenta
                  etiqueta="Código CCI"
                  valor={c.cci}
                  color={banco.color}
                />
              </div>
            ))}
          </div>
        ))}

        <div className="shrink-0 overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-white">
          <div className="bg-[#10b981]/15 px-10 py-3 text-center text-[24px] font-medium text-[#059669]">
            Cómo realizar tu pago
          </div>
          <div className="grid grid-cols-3">
            {PASOS_PAGO.map((texto, i) => (
              <div
                key={texto}
                className={`flex items-center justify-center gap-4 px-6 py-4 ${i > 0 ? "border-l-2 border-[var(--border)]" : ""}`}
              >
                <span className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-[#10b981] text-[26px] font-semibold text-white">
                  {i + 1}
                </span>
                <p className="m-0 text-[21px] leading-snug font-normal text-[var(--text-secondary)]">
                  {texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Bloques>

      <Pie legal={AVISO_CUENTAS} />
    </>
  );
}

/** Lámina con las cuentas bancarias para el pago; mismo lienzo y pie que la cotización. */
export const FichaCuentas = forwardRef<HTMLDivElement, { emitida: Date }>(
  function FichaCuentas({ emitida }, ref) {
    return (
      <div ref={ref}>
        <Lienzo formato="vertical">
          <ContenidoCuentas emitida={emitida} />
        </Lienzo>
      </div>
    );
  },
);
