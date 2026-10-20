"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PROYECTO,
  buscarLotePorId,
  conPlazo,
  modalidadesDe,
  INICIAL_MODOS,
  filtrarLotesPorTexto,
  formatearMonto,
  manzanasDisponibles,
  ESTADO_ETIQUETA,
  estaLibre,
  segmentosDeTramo,
  notaMeses,
  partesDeInicial,
  type InicialModo,
  type Lote,
  type TipoModalidad,
} from "@/lib/altosDeSacta";
import { PLAZOS_CUOTAS } from "@/lib/configCotizacion";
import {
  BloqueCuotas,
  CuotaUnica,
  EditorCuotasPie,
  ResumenCuotas,
  tamanoFilaCuota,
} from "@/components/BloqueCuotas";
import { BarrasCuotas } from "@/components/BarrasCuotas";
import { Soles } from "@/components/Soles";
import { EnviarCotizacion } from "@/components/EnviarCotizacion";
// TODO(cotizador): reintegrar cronograma completo — ver plan de simplificación
// (iterative-hopping-bird.md). Estos imports vuelven junto con el bloque comentado
// más abajo.
// import {
//   construirCalendarioCompleto,
//   fraseUtil,
//   resumenModalidad,
// } from "@/lib/altosDeSacta";
// import { Cronograma } from "@/components/Cronograma";

type Vista = "normal" | "opciones";

/** El plazo más largo que se ofrece: sus textos son los más extensos y fijan el espacio que se reserva. */
const PLAZO_MAX = Math.max(...PLAZOS_CUOTAS);

const TEXTO_BOTON_VISTA: Record<Vista, string> = {
  normal: "Ver opciones de cuotas",
  opciones: "Volver",
};

function siguienteVista(vista: Vista): Vista {
  return vista === "normal" ? "opciones" : "normal";
}

export function Simulador({
  lotes,
}: {
  /** Todos los lotes con su estado: los reservados y vendidos se ven, pero su cotización no se envía. */
  lotes: Lote[];
}) {
  // Primer lote disponible: si el primero estuviera vendido, la pantalla se vería vacía.
  const LOTE_INICIAL = lotes.find(estaLibre) ?? lotes[0];
  const [vista, setVista] = useState<Vista>("normal");
  const [modalidadVista, setModalidadVista] = useState<TipoModalidad>("fija");
  const [mzFiltro, setMzFiltro] = useState<number>(LOTE_INICIAL.mz);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [codigo, setCodigo] = useState(LOTE_INICIAL.lote);
  const [inicialModo, setInicialModo] = useState<InicialModo>("dos");
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  // Tras elegir un lote, el campo muestra lo elegido; al tocarlo se vacía para escribir de nuevo.
  const [mostrandoSeleccion, setMostrandoSeleccion] = useState(true);
  const buscadorRef = useRef<HTMLDivElement>(null);
  // Cantidad de cuotas: 80 por defecto; el asesor la cambia desde el lápiz junto a la cifra.
  const [plazo, setPlazo] = useState<number>(80);

  // El listado de coincidencias es emergente: se cierra al hacer clic fuera o con Esc.
  useEffect(() => {
    function cerrarFuera(e: MouseEvent) {
      if (!buscadorRef.current?.contains(e.target as Node))
        setBuscadorAbierto(false);
    }
    document.addEventListener("mousedown", cerrarFuera);
    return () => document.removeEventListener("mousedown", cerrarFuera);
  }, []);

  const loteBase: Lote = useMemo(
    () => buscarLotePorId(codigo, lotes) ?? LOTE_INICIAL,
    [codigo, lotes, LOTE_INICIAL],
  );
  const lote: Lote = useMemo(
    () => conPlazo(loteBase, plazo),
    [loteBase, plazo],
  );
  const modalidades = modalidadesDe(lote);
  const libre = estaLibre(lote);
  const manzanas = manzanasDisponibles(lotes);
  const resultados = filtrarLotesPorTexto(
    textoBusqueda,
    { mz: mzFiltro, limite: 12 },
    lotes,
  );

  // Versión simplificada: siempre se muestra el plan "fija" (cuota constante).
  const planFijo = lote.planes.fija;
  const cuotaMensual = planFijo.cuotas_por_tramo[0];
  const tamanoFila = tamanoFilaCuota(formatearMonto(cuotaMensual).length);

  // TODO(cotizador): reintegrar cronograma completo — ver plan de simplificación
  // const resumen = resumenModalidad(lote, modalidad);
  // const calendario = useMemo(() => construirCalendarioCompleto(lote, modalidad), [lote, modalidad]);
  // const frase = fraseUtil(lote, modalidad);

  function elegirLote(nuevoCodigo: string) {
    setCodigo(nuevoCodigo);
    setTextoBusqueda("");
    setMostrandoSeleccion(true);
  }

  function elegirManzana(mz: number) {
    setMzFiltro(mz);
    // Se prefiere el primer lote disponible: uno vendido dejaría la cotización vacía.
    const todos = filtrarLotesPorTexto("", { mz, limite: Infinity }, lotes);
    const primero = todos.find(estaLibre) ?? todos[0];
    if (primero) elegirLote(primero.lote);
  }

  function buscarAhora() {
    // Sin texto no hay nada que buscar: se conserva el lote elegido.
    if (textoBusqueda.trim() !== "") {
      const exacto = buscarLotePorId(textoBusqueda, lotes);
      if (exacto) elegirLote(exacto.lote);
      else if (resultados.length > 0) elegirLote(resultados[0].lote);
    }
    setBuscadorAbierto(false);
  }

  function onBuscarSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") buscarAhora();
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-1">
      <header className="card flex flex-col gap-4 px-5 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-altos-de-sacta.png"
            alt={PROYECTO}
            className="ml-2 block h-8 w-auto shrink-0 max-[360px]:ml-0 max-[360px]:h-6 sm:ml-6 sm:h-12"
          />
          <div className="flex shrink-0 items-center gap-2">
            <EnviarCotizacion
              lote={lote}
              inicialModo={inicialModo}
              bloqueo={
                libre
                  ? undefined
                  : `Lote ${ESTADO_ETIQUETA[lote.estado ?? "libre"].toLowerCase()}: no se puede enviar la cotización`
              }
            />
            <button
              onClick={() => setVista(siguienteVista)}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold max-[360px]:px-2 max-[360px]:text-[11px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
            >
              {vista === "normal" ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-[18px] w-[18px]"
                >
                  <path d="m7.29289 4.29289c.39053-.39052 1.02369-.39052 1.41422 0 .39052.39053.39052 1.02369 0 1.41422l-2.29289 2.29289h8.58578c3.3137 0 6 2.6863 6 6s-2.6863 6-6 6h-5c-.55228 0-1-.4477-1-1s.44772-1 1-1h5c2.2091 0 4-1.7909 4-4s-1.7909-4-4-4h-8.58579l2.2929 2.2929c.39052.3905.39052 1.0237 0 1.4142-.39053.3905-1.02369.3905-1.41422 0l-4-3.99998c-.18753-.18754-.29289-.44189-.29289-.70711 0-.26521.10536-.51957.29289-.70711z" />
                </svg>
              )}
              {vista === "normal" ? (
                <>
                  <span className="max-sm:hidden">
                    {TEXTO_BOTON_VISTA[vista]}
                  </span>
                  <span className="sm:hidden">Opciones</span>
                </>
              ) : (
                TEXTO_BOTON_VISTA[vista]
              )}
            </button>
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex w-full items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:shrink-0 sm:gap-3">
              {!libre && (
                <span
                  role="status"
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] leading-none font-bold tracking-wider whitespace-nowrap uppercase sm:px-3 sm:text-xs ${lote.estado === "vendido" ? "bg-[#e11d48]/10 text-[#be123c]" : "bg-[#F5A623]/15 text-[#b45309]"}`}
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${lote.estado === "vendido" ? "bg-[#e11d48]" : "bg-[#F5A623]"}`}
                  />
                  {ESTADO_ETIQUETA[lote.estado ?? "libre"]}
                </span>
              )}
              <span className="min-w-0 text-xs text-[var(--text-secondary)] max-sm:truncate sm:text-sm">
                Ubicación (Mz y Lote)
              </span>
            </div>
            <h1 className="mr-3 flex shrink-0 items-center gap-2 whitespace-nowrap sm:mr-0 sm:gap-3">
              {/* El check verde indica que la ubicación existe, sea cual sea su estado. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={lote.lote}
                src="/icons/verificado-verde.png"
                alt="Ubicación encontrada"
                className="animate-pop block h-5 w-5 shrink-0"
              />
              <span className="flex items-baseline gap-2">
                <span className="text-base leading-none font-semibold text-[var(--text-secondary)] sm:text-2xl">
                  MZ {lote.mz}
                </span>
                <span className="text-base leading-none font-semibold text-[var(--text-muted)] sm:text-xl">
                  ·
                </span>
                <span className="text-base leading-none font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
                  LOTE {lote.lt}
                </span>
              </span>
            </h1>
          </div>
        </div>
      </header>

      {/* Las dos vistas comparten la misma celda: la caja mide siempre lo mismo y no se deforma al cambiar. */}
      <div className="grid lg:flex-1">
        <div
          aria-hidden={vista !== "normal"}
          className={`col-start-1 row-start-1 flex flex-col gap-4 ${vista === "normal" ? "" : "pointer-events-none invisible"}`}
        >
          <TarjetaInfo
            color="#3F4147"
            fondo="#F5F4F2"
            titulo="Selecciona tu lote"
            icono={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m12 8 6-3-6-3v10" />
                <path d="m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12" />
                <path d="m6.49 12.85 11.02 6.3" />
                <path d="M17.51 12.85 6.5 19.15" />
              </svg>
            }
          >
            <div className="px-4 pb-1">
              <div className="flex gap-2 py-1.5">
                {manzanas.map((mz) => (
                  <button
                    key={mz}
                    onClick={() => elegirManzana(mz)}
                    className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                      mzFiltro === mz
                        ? "border-[var(--ceinys-grafito-700)] bg-[var(--ceinys-grafito-700)] text-white"
                        : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    Manzana {mz}
                  </button>
                ))}
              </div>
              <div ref={buscadorRef} className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  enterKeyHint="search"
                  autoComplete="off"
                  value={mostrandoSeleccion ? `Lote ${lote.lt}` : textoBusqueda}
                  onChange={(e) => {
                    setMostrandoSeleccion(false);
                    // Los lotes son numéricos: solo se aceptan dígitos.
                    setTextoBusqueda(e.target.value.replace(/\D/g, ""));
                    setBuscadorAbierto(true);
                  }}
                  onFocus={() => {
                    if (mostrandoSeleccion) {
                      setMostrandoSeleccion(false);
                      setTextoBusqueda("");
                    }
                    setBuscadorAbierto(true);
                  }}
                  onBlur={() => {
                    // Si no escribió nada, vuelve a mostrarse el lote elegido.
                    if (textoBusqueda.trim() === "")
                      setMostrandoSeleccion(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setBuscadorAbierto(false);
                    onBuscarSubmit(e);
                  }}
                  placeholder={`Buscar lote en Manzana ${mzFiltro} (ej. 9)…`}
                  className={`selectCampo w-full !pl-12 ${mostrandoSeleccion ? "!font-semibold" : ""}`}
                />
                <button
                  type="button"
                  onClick={buscarAhora}
                  aria-label="Buscar lote"
                  className="absolute top-1/2 left-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--ceinys-grafito-700)] text-white transition-colors hover:bg-[var(--ceinys-grafito-900)]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20.5 20.5l-4.6-4.6" />
                  </svg>
                </button>
                {buscadorAbierto && textoBusqueda.trim() !== "" && (
                  <div className="absolute inset-x-0 top-full z-20 mt-1.5 rounded-xl border border-[var(--border)] bg-white p-2 shadow-[0_12px_32px_rgba(20,22,28,0.14)]">
                    {resultados.length > 0 ? (
                      <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto">
                        {resultados.map((l) => (
                          <button
                            key={l.lote}
                            onClick={() => {
                              elegirLote(l.lote);
                              setBuscadorAbierto(false);
                            }}
                            className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                          >
                            <span>Lote {l.lt}</span>
                            {estaLibre(l) ? (
                              <span className="font-medium text-[var(--text-muted)]">
                                {l.metraje_m2} m²
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-bold tracking-wider uppercase ${l.estado === "vendido" ? "text-[#be123c]" : "text-[#b45309]"}`}
                              >
                                {ESTADO_ETIQUETA[l.estado ?? "libre"]}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="px-2 py-1.5 text-xs text-[var(--text-muted)]">
                        No hay lotes que coincidan en la Manzana {mzFiltro}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TarjetaInfo>

          <TarjetaInfo
            color="#3b82f6"
            titulo="Datos del lote"
            icono={
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
          >
            <FilaDato label="Metraje" valor={`${lote.metraje_m2} m²`} />
            <FilaDato label="Ubicación" valor={lote.ubicacion} resaltado />
            <FilaDato label="Etapa" valor={lote.etapa} />
          </TarjetaInfo>

          <TarjetaInfo
            color="#10b981"
            titulo="Fraccionamiento"
            icono={
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M12.5 19H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v4" />
                <path d="M2 10h20" />
                <path d="M6 14h2" />
                <path d="m16 17 2 2 4-4" />
              </svg>
            }
          >
            <BloqueCuotas
              izquierda={
                <CuotaUnica monto={cuotaMensual} tamano={tamanoFila} />
              }
              plazo={plazo}
              onCambiarPlazo={setPlazo}
              tamano={tamanoFila}
            />
            <FilaDato
              label="Precio total"
              valor={<Soles monto={lote.precio_lista} />}
              tachado
              grande
            />
            <FilaDato
              label="Precio con dscto"
              valor={<Soles monto={lote.precio_con_dscto} />}
              destacado
              grande
            />
            <InicialDinamica
              lote={lote}
              modo={inicialModo}
              onCambiar={setInicialModo}
            />
          </TarjetaInfo>
        </div>
        <div
          aria-hidden={vista !== "opciones"}
          className={`col-start-1 row-start-1 flex flex-col ${vista === "opciones" ? "" : "pointer-events-none invisible"}`}
        >
          {(() => {
            const modalidadActiva =
              modalidades.find((m) => m.key === modalidadVista) ??
              modalidades[0];
            const segmentos = segmentosDeTramo(lote, modalidadActiva.key);
            const primero = segmentos[0].monto;
            const ultimo = segmentos[segmentos.length - 1].monto;
            return (
              <div className="card flex flex-1 flex-col gap-4 p-5">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Elige tu tipo de cuota
                </h2>
                <div className="flex gap-1.5">
                  {modalidades.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setModalidadVista(m.key)}
                      className="flex-1 rounded-full border py-2.5 text-sm font-medium transition-colors"
                      style={
                        modalidadActiva.key === m.key
                          ? {
                              borderColor: m.color,
                              backgroundColor: `${m.color}1a`,
                              color: m.color,
                            }
                          : {
                              borderColor: "var(--border)",
                              color: "var(--text-secondary)",
                            }
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <ResumenCuotas
                  desde={primero}
                  hasta={primero === ultimo ? undefined : ultimo}
                  color={modalidadActiva.color}
                  etiqueta={`Cuota mensual · ${modalidadActiva.label}`}
                  anios={segmentos.length}
                />
                <BarrasCuotas
                  segmentos={segmentos}
                  color={modalidadActiva.color}
                />
                <EditorCuotasPie
                  plazo={plazo}
                  onCambiarPlazo={setPlazo}
                  color={modalidadActiva.color}
                />
                {/* La nota cambia de largo con la cantidad de cuotas (con 80 hay un tramo más que explicar). Se
                    reserva el alto de la versión más larga con una copia invisible apilada en la misma celda,
                    así la tarjeta no cambia de alto ni empuja lo que hay debajo. */}
                <div className="mx-auto grid max-w-[34rem] border-t border-[var(--border)] pt-4 text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
                  <p className="col-start-1 row-start-1">
                    <strong className="font-semibold text-[var(--text-secondary)]">
                      (*) Meses de vigencia.
                    </strong>{" "}
                    {notaMeses(segmentos)} Las cuotas incluyen el costo del
                    fraccionamiento.
                  </p>
                  <p aria-hidden className="invisible col-start-1 row-start-1">
                    <strong className="font-semibold">
                      (*) Meses de vigencia.
                    </strong>{" "}
                    {notaMeses(
                      segmentosDeTramo(
                        conPlazo(loteBase, PLAZO_MAX),
                        modalidadActiva.key,
                      ),
                    )}{" "}
                    Las cuotas incluyen el costo del fraccionamiento.
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* TODO(cotizador): reintegrar cronograma completo — ver plan de
          simplificación (iterative-hopping-bird.md). Bloque comentado a
          propósito, no borrado: frase dinámica por modalidad elegida y
          cronograma de 82 cuotas.

      <p
        className="mt-2 flex items-center gap-2 text-base font-medium"
        style={{ color: modalidadActiva.color }}
      >
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: modalidadActiva.color }}
        />
        {frase}
      </p>

      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-medium text-[var(--text-secondary)]">
          Ver cronograma completo (82 filas) · {modalidadActiva.label}
        </summary>
        <div className="mt-3">
          <Cronograma filas={calendario} />
        </div>
      </details>

      */}
    </div>
  );
}

function TarjetaInfo({
  color,
  fondo,
  titulo,
  icono,
  children,
}: {
  color: string;
  fondo?: string;
  titulo: string;
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card rounded-xl p-0">
      <div
        className="flex items-center gap-3 rounded-t-[11px] py-3 pr-8 pl-8"
        style={{ backgroundColor: fondo ?? `${color}26` }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
          style={{ backgroundColor: color }}
        >
          {icono}
        </div>
        <h2 className="ml-1.5 text-sm font-bold" style={{ color: color }}>
          {titulo}
        </h2>
      </div>
      <div className="flex flex-col gap-0.5 px-4 py-1.5">{children}</div>
    </div>
  );
}

function FilaDato({
  label,
  valor,
  destacado = false,
  tachado = false,
  resaltado = false,
  grande = false,
}: {
  label: string;
  valor: React.ReactNode;
  destacado?: boolean;
  tachado?: boolean;
  resaltado?: boolean;
  grande?: boolean;
}) {
  return (
    <div
      className={`flex border-t border-[var(--border)] first:border-t-0 ${grande ? "py-[0.6rem]" : "py-2"}`}
    >
      <div className="flex w-full items-center justify-between gap-4 px-4">
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
        <span
          className={`text-right [font-variant-numeric:tabular-nums] ${
            grande ? (destacado ? "text-lg" : "text-base") : "text-sm"
          } ${
            resaltado ? "-mr-2 rounded-md bg-[#3b82f6]/15 px-2 py-0.5" : ""
          } ${
            tachado
              ? "text-[var(--text-muted)] line-through"
              : destacado
                ? "font-bold text-[var(--text-primary)]"
                : "font-semibold text-[var(--text-primary)]"
          }`}
        >
          {valor}
        </span>
      </div>
    </div>
  );
}

/**
 * Inicial con forma de pago elegible (completa, 2 o 3 partes). La caja mide
 * siempre lo mismo: solo cambia cuántas celdas se muestran en la fila.
 */
function InicialDinamica({
  lote,
  modo,
  onCambiar,
}: {
  lote: Lote;
  modo: InicialModo;
  onCambiar: (m: InicialModo) => void;
}) {
  const partes = partesDeInicial(lote, modo);
  return (
    <div className="border-t border-[var(--border)] py-[0.6rem]">
      <div className="flex w-full flex-col gap-2.5 px-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-medium text-[var(--text-secondary)]">
            Inicial
          </span>
          <span className="text-right text-xl font-bold [font-variant-numeric:tabular-nums] text-[var(--text-primary)]">
            <Soles monto={lote.inicial} />
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Forma de pago de la inicial"
          className="grid grid-cols-3 gap-2"
        >
          {INICIAL_MODOS.map((m) => (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={modo === m.key}
              onClick={() => onCambiar(m.key)}
              className={`rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                modo === m.key
                  ? "border-[var(--ceinys-grafito-700)] bg-[var(--ceinys-grafito-700)] text-white"
                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${partes.length}, minmax(0, 1fr))`,
          }}
        >
          {partes.map((p, i) => (
            <div
              key={i}
              className="rounded-lg bg-[var(--surface-2)] px-1.5 py-2.5 text-center"
            >
              <p className="m-0 text-[11px] font-semibold tracking-wide whitespace-nowrap text-[var(--text-muted)] uppercase sm:text-xs">
                {p.fecha}
              </p>
              <p className="m-0 mt-1 text-base max-[340px]:text-sm font-bold whitespace-nowrap [font-variant-numeric:tabular-nums] text-[var(--text-primary)] sm:text-xl">
                <Soles monto={p.monto} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
