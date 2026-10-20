"use client";

import { createContext, forwardRef, useContext } from "react";
import {
  formatearMonto,
  INICIAL_MODOS,
  modalidadesDe,
  notaMeses,
  plazoDe,
  partesDeInicial,
  PROYECTO,
  segmentosDeTramo,
  type InicialModo,
  type Lote,
} from "@/lib/altosDeSacta";
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
      <div className="shrink-0 text-right">
        <p className={`m-0 ${TIPO.eyebrow} text-[var(--text-muted)]`}>
          DNI / Documento
        </p>
        <p className="m-0 mt-1.5 text-[32px] leading-tight font-extrabold [font-variant-numeric:tabular-nums]">
          {dniVisible(cliente.dni)}
        </p>
      </div>
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
}: {
  color: string;
  children: React.ReactNode;
}) {
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

/* ---------- cara 1: el lote y su fraccionamiento ---------- */

function ContenidoCara1({ lote, inicialModo, emitida, cliente }: DatosFicha) {
  const v = useV();
  const compacto = useCompacto();
  const cuota = lote.planes.fija.cuotas_por_tramo[0];
  const partes = partesDeInicial(lote, inicialModo, emitida);
  const modoInicial = INICIAL_MODOS.find((m) => m.key === inicialModo)!;

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
            src="/logo-altos-de-sacta.png"
            alt={PROYECTO}
            className="h-[88px] w-auto"
          />
          <div className="text-right">
            <p className={`m-0 ${TIPO.eyebrow} text-[var(--text-muted)]`}>
              {" "}
              Manzana y lote
            </p>
            <p
              className={`m-0 mt-1 flex items-baseline justify-end gap-3 ${TIPO.h1}`}
            >
              <span className="font-semibold text-[var(--text-secondary)]">
                MZ {lote.mz}
              </span>
              <span className="text-[40px] font-semibold text-[var(--text-muted)]">
                ·
              </span>
              <span>LOTE {lote.lt}</span>
            </p>
          </div>
        </div>

        {cliente && <FranjaCliente cliente={cliente} />}

        <div className="grid shrink-0 grid-cols-3 gap-4">
          {[
            ["Metraje", `${lote.metraje_m2} m²`],
            ["Ubicación", lote.ubicacion],
            ["Etapa", lote.etapa],
          ].map(([k, val]) => (
            <div
              key={k}
              className="rounded-[22px] bg-[#3b82f6]/12 px-4 text-center"
              style={{ paddingTop: v(26), paddingBottom: v(26) }}
            >
              <p className={`m-0 ${TIPO.eyebrow} text-[#2563eb]`}>{k}</p>
              <p className="m-0 mt-1 text-[26px] leading-tight font-bold">
                {val}
              </p>
            </div>
          ))}
        </div>

        <div className="shrink-0 overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-white">
          <div
            className="bg-[#10b981]/15 px-10 text-[26px] font-bold text-[#059669]"
            style={{ paddingTop: v(20), paddingBottom: v(20) }}
          >
            Fraccionamiento
          </div>

          <div
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-8 text-center"
            style={{ paddingTop: v(36), paddingBottom: v(36) }}
          >
            <div>
              <Etiqueta color="#10b981">Cuota mensual</Etiqueta>
              <p className="m-0 mt-3 flex items-baseline justify-center gap-2 leading-none whitespace-nowrap [font-variant-numeric:tabular-nums]">
                <span
                  className={
                    formatearMonto(cuota).length > 7
                      ? "text-[52px] font-extrabold text-[var(--text-primary)]"
                      : TIPO.cifra
                  }
                >
                  <Soles monto={cuota} />
                </span>
                <span className="text-[26px] font-medium text-[var(--text-muted)]">
                  / mes
                </span>
              </p>
            </div>
            <span className="h-[100px] w-[2px] bg-[var(--border)]" />
            <div>
              <Etiqueta color="#10b981">Cant. de cuotas</Etiqueta>
              <p className="m-0 mt-3 flex items-baseline justify-center gap-2 leading-none">
                <span className={TIPO.cifra}>{plazoDe(lote)}</span>
                <span className="text-[26px] font-medium text-[var(--text-muted)]">
                  cuotas
                </span>
              </p>
            </div>
          </div>

          <div
            className="border-t-2 border-[var(--border)] px-10"
            style={{ paddingTop: v(14), paddingBottom: v(14) }}
          >
            <div
              className="flex items-center justify-between text-[26px]"
              style={{ paddingTop: v(16), paddingBottom: v(16) }}
            >
              <span className="text-[var(--text-secondary)]">Precio total</span>
              <span className="font-semibold text-[var(--text-muted)] line-through [font-variant-numeric:tabular-nums]">
                <Soles monto={lote.precio_lista} />
              </span>
            </div>
            <div
              className="flex items-center justify-between border-t-2 border-[var(--border)]/50 text-[26px]"
              style={{ paddingTop: v(16), paddingBottom: v(16) }}
            >
              <span className="text-[var(--text-secondary)]">
                Precio con dscto
              </span>
              <span className="text-[32px] font-bold [font-variant-numeric:tabular-nums]">
                <Soles monto={lote.precio_con_dscto} />
              </span>
            </div>
          </div>

          <div
            className="border-t-2 border-[var(--border)] px-10"
            style={{ paddingTop: v(24), paddingBottom: v(32) }}
          >
            <div className="flex items-center justify-between text-[26px]">
              <span className="text-[var(--text-secondary)]">
                Inicial{" "}
                <span className="text-[20px] text-[var(--text-muted)]">
                  · {modoInicial.label.toLowerCase()}
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

function ContenidoCara2({ lote, inicialModo, emitida, cliente }: DatosFicha) {
  const v = useV();
  const segmentos = modalidadesDe(lote).map((m) => ({
    ...m,
    tramos: segmentosDeTramo(lote, m.key),
  }));
  const base = segmentos[0].tramos;
  const partes = partesDeInicial(lote, inicialModo, emitida);
  const columnas = `1.15fr ${"1fr ".repeat(segmentos.length)}`.trim();

  return (
    <>
      <Cabecera etiqueta="Opciones de cuota" emitida={emitida} />

      <Bloques>
        {cliente && <FranjaCliente cliente={cliente} />}

        <>
          <div className="flex shrink-0 items-end justify-between">
            <div>
              <Etiqueta color="#F5A623">Elige tu tipo de cuota</Etiqueta>
              <p className={`m-0 mt-3 ${TIPO.h1}`}>
                MZ {lote.mz} · LOTE {lote.lt}
                <span className="ml-4 text-[26px] font-medium text-[var(--text-muted)]">
                  {lote.metraje_m2} m²
                </span>
              </p>
            </div>
            <div className="text-right text-[26px] leading-snug text-[var(--text-secondary)]">
              <p className="m-0">
                Inicial{" "}
                <strong className="text-[var(--text-primary)]">
                  <Soles monto={lote.inicial} />
                </strong>
              </p>
              <p className="m-0 text-[20px] text-[var(--text-muted)]">
                {" "}
                {partes.map((p) => p.fecha).join(" · ")}
              </p>
            </div>
          </div>

          <div className="shrink-0 overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-white">
            <div
              className="grid items-center gap-3 px-6"
              style={{
                gridTemplateColumns: columnas,
                paddingTop: v(20),
                paddingBottom: v(20),
              }}
            >
              <span className={`${TIPO.eyebrow} text-[var(--text-muted)]`}>
                Año (meses*)
              </span>
              {segmentos.map((m) => (
                <span
                  key={m.key}
                  className="rounded-full py-2.5 text-center text-[24px] font-bold"
                  style={{
                    background: `color-mix(in srgb, ${m.color} 14%, white)`,
                    color: m.color,
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>
            {base.map((t, i) => (
              <div
                key={t.label}
                className="grid items-center gap-3 border-t-2 border-[var(--border)] px-6"
                style={{
                  gridTemplateColumns: columnas,
                  background: i % 2 === 0 ? "var(--surface-2)" : "white",
                  paddingTop: v(18),
                  paddingBottom: v(18),
                }}
              >
                <span className="text-[26px] font-semibold text-[var(--text-secondary)]">
                  {t.label}{" "}
                  <span className="font-medium text-[var(--text-muted)]">
                    ({t.meses}*)
                  </span>
                </span>
                {segmentos.map((m) => (
                  <span
                    key={m.key}
                    className="text-center text-[32px] font-bold [font-variant-numeric:tabular-nums]"
                  >
                    <Soles monto={m.tramos[i].monto} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </>

        <p
          className={`m-0 mx-auto max-w-[900px] shrink-0 text-center ${TIPO.legal}`}
        >
          <strong className="font-semibold text-[var(--text-secondary)]">
            (*) Meses de vigencia.
          </strong>{" "}
          {notaMeses(base)} Las cuotas incluyen el costo del fraccionamiento.
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

function FilaCuenta({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className={`m-0 ${TIPO.eyebrow} text-[var(--text-muted)]`}>
        {etiqueta}
      </p>
      <p className="m-0 mt-2 text-[44px] leading-none font-extrabold [font-variant-numeric:tabular-nums]">
        {valor}
      </p>
    </div>
  );
}

function ContenidoCuentas({ emitida }: { emitida: Date }) {
  return (
    <>
      <Cabecera etiqueta="Cuentas de pago" emitida={emitida} />

      <Bloques>
        <div>
          <Etiqueta color="#10b981">Medios de pago</Etiqueta>
          <p className={`m-0 mt-3 ${TIPO.h1}`}>Cuentas para tu pago</p>
          <p className={`m-0 mt-4 ${TIPO.medio}`}>
            Depósitos y transferencias a nombre de{" "}
            <strong className="font-bold text-[var(--text-primary)]">
              {TITULAR}
            </strong>
          </p>
        </div>

        {BANCOS.map((banco) => (
          <div
            key={banco.nombre}
            className="shrink-0 overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-white"
          >
            <div
              className="flex items-center justify-center border-b-2 py-6"
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
            </div>
            {banco.cuentas.map((c) => (
              <div key={c.numero} className="flex flex-col gap-7 px-10 py-9">
                <span
                  className={`inline-flex w-fit items-center gap-3 rounded-full px-5 py-2 ${TIPO.eyebrow}`}
                  style={{
                    background: `${COLOR_MONEDA[c.moneda]}1a`,
                    color: COLOR_MONEDA[c.moneda],
                  }}
                >
                  <span
                    className="h-[12px] w-[12px] rounded-full"
                    style={{ background: COLOR_MONEDA[c.moneda] }}
                  />
                  {c.moneda}
                </span>
                <FilaCuenta etiqueta="N° de cuenta" valor={c.numero} />
                <FilaCuenta etiqueta="Código CCI" valor={c.cci} />
              </div>
            ))}
          </div>
        ))}
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
