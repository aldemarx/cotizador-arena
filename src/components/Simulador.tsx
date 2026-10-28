"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PROYECTO,
  buscarLotePorId,
  conInicial,
  conPlazo,
  modalidadesDe,
  plazoDe,
  PARAMETROS,
  INICIAL_MODOS,
  INICIAL_POR_DEFECTO,
  filtrarLotesPorTexto,
  formatearMonto,
  manzanasDisponibles,
  ESTADO_ETIQUETA,
  estaLibre,
  segmentosDeTramo,
  notaMeses,
  type InicialModo,
  type Lote,
  type TipoModalidad,
} from "@/lib/arenas";
import { PLAZOS_CUOTAS } from "@/lib/configCotizacion";
import {
  EditorCuotasPie,
  ResumenCuotas,
  tamanoFilaCuota,
} from "@/components/BloqueCuotas";
import { BarrasCuotas, CuotasPorMes } from "@/components/BarrasCuotas";
import { Soles } from "@/components/Soles";
import { EnviarCotizacion } from "@/components/EnviarCotizacion";
import { CajaPrecio } from "@/components/CajaPrecio";
import { CuotaYPlazo } from "@/components/CuotaYPlazo";
import { ChipPromocion } from "@/components/ChipPromocion";
import { SelectorManzana } from "@/components/SelectorManzana";
import { useLoteActivo } from "@/components/LoteActivo";
// TODO(cotizador): reintegrar cronograma completo — ver plan de simplificación
// (iterative-hopping-bird.md). Estos imports vuelven junto con el bloque comentado
// más abajo.
// import {
//   construirCalendarioCompleto,
//   fraseUtil,
//   resumenModalidad,
// } from "@/lib/arenas";
// import { Cronograma } from "@/components/Cronograma";

/** Botón «Ver opciones de cuotas» de la cabecera: desactivado, solo queda «Enviar». Poner en true para volver a mostrarlo. */
const MOSTRAR_VISTA_OPCIONES = false;

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
  loteInicial,
}: {
  /** Todos los lotes con su estado: los separados y vendidos se ven, pero su cotización no se envía. */
  lotes: Lote[];
  /** Código pedido en la URL (/?lote=R4-32), p. ej. al volver desde el plano. */
  loteInicial?: string;
}) {
  // Lote pedido en la URL o, si no hay, el primero disponible (si el primero estuviera vendido, la pantalla se vería vacía).
  const LOTE_INICIAL =
    (loteInicial ? buscarLotePorId(loteInicial, lotes) : undefined) ??
    lotes.find(estaLibre) ??
    lotes[0];
  const [vista, setVista] = useState<Vista>("normal");
  const [modalidadVista, setModalidadVista] = useState<TipoModalidad>("fija");
  const [mzFiltro, setMzFiltro] = useState<string>(LOTE_INICIAL.mz);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [codigo, setCodigo] = useState(LOTE_INICIAL.lote);
  const [inicialModo, setInicialModo] =
    useState<InicialModo>(INICIAL_POR_DEFECTO);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  // Tras elegir un lote, el campo muestra lo elegido; al tocarlo se vacía para escribir de nuevo.
  const [mostrandoSeleccion, setMostrandoSeleccion] = useState(true);
  // ¿La persona ya escogió un lote? (el que aparece al abrir es solo el primero disponible, no una elección)
  const eligioLote = useRef(false);
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
  // Sin conexión se sirve la copia guardada, que trae el lote con el que se guardó: al abrir, manda el
  // lote de la dirección real (?lote=). Debe ir antes del efecto que escribe la dirección.
  useEffect(() => {
    const deLaUrl = new URLSearchParams(window.location.search).get("lote");
    const l = deLaUrl ? buscarLotePorId(deLaUrl, lotes) : undefined;
    if (l) eligioLote.current = true; // venía un lote en la dirección: es una elección
    if (l && l.lote !== codigo) {
      // Sincroniza con la dirección real del navegador (sistema externo); solo ocurre al montar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCodigo(l.lote);
      setMzFiltro(l.mz);
    }
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El lote en pantalla queda en la dirección (?lote=5-574): así «Ver plano» abre el mapa en ese lote
  // y la dirección se puede compartir. replaceState no recarga la página ni agrega pasos al historial.
  // Solo cuando la persona eligió un lote (o venía uno en la dirección): si no cotizó nada, «Ver plano» abre el plano
  // completo y centrado, no acercado al primer lote disponible que se muestra por defecto.
  useEffect(() => {
    if (!eligioLote.current) return;
    window.history.replaceState(null, "", `/?lote=${loteBase.lote}`);
  }, [loteBase.lote]);

  const lote: Lote = useMemo(
    () => conPlazo(conInicial(loteBase, Number(inicialModo)), plazo),
    [loteBase, inicialModo, plazo],
  );
  // La vista previa del lote (otra parte de la página) sigue al lote que se cotiza.
  const { elegir: publicarLote, pedido } = useLoteActivo();
  useEffect(() => {
    publicarLote(loteBase.lote);
  }, [loteBase.lote, publicarLote]);
  // Un lote tocado en la vista previa pasa a ser el que se cotiza.
  useEffect(() => {
    if (!pedido) return;
    const l = buscarLotePorId(pedido.codigo, lotes);
    if (!l) return;
    // Atiende un pedido de otro componente (sistema externo al cotizador).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMzFiltro(l.mz);
    elegirLote(l.lote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);
  const modalidades = modalidadesDe(lote);
  const libre = estaLibre(lote);
  const manzanas = manzanasDisponibles(lotes);
  // Sin texto se sugieren los primeros lotes disponibles de la manzana, en orden de número.
  const sinTexto = textoBusqueda.trim() === "";
  const resultados = sinTexto
    ? filtrarLotesPorTexto("", { mz: mzFiltro, limite: Infinity }, lotes)
        .filter(estaLibre)
        .slice(0, 12)
    : filtrarLotesPorTexto(textoBusqueda, { mz: mzFiltro, limite: 12 }, lotes);

  // Versión simplificada: siempre se muestra el plan "fija" (cuota constante).
  const planFijo = lote.planes.fija;
  const cuotaMensual = planFijo.cuotas_por_tramo[0];
  const tamanoFila = tamanoFilaCuota(formatearMonto(cuotaMensual).length);

  // TODO(cotizador): reintegrar cronograma completo — ver plan de simplificación
  // const resumen = resumenModalidad(lote, modalidad);
  // const calendario = useMemo(() => construirCalendarioCompleto(lote, modalidad), [lote, modalidad]);
  // const frase = fraseUtil(lote, modalidad);

  function elegirLote(nuevoCodigo: string) {
    eligioLote.current = true;
    setCodigo(nuevoCodigo);
    setTextoBusqueda("");
    setMostrandoSeleccion(true);
  }

  function elegirManzana(mz: string) {
    setMzFiltro(mz);
    // Se prefiere el primer lote disponible: uno vendido dejaría la cotización vacía.
    const todos = filtrarLotesPorTexto("", { mz, limite: Infinity }, lotes);
    const primero = todos.find(estaLibre) ?? todos[0];
    if (primero) elegirLote(primero.lote);
  }

  function buscarAhora() {
    // Sin texto se muestran los primeros lotes disponibles para elegir uno.
    if (sinTexto) {
      setMostrandoSeleccion(false);
      setBuscadorAbierto(true);
      return;
    }
    const exacto = buscarLotePorId(textoBusqueda, lotes);
    if (exacto) elegirLote(exacto.lote);
    else if (resultados.length > 0) elegirLote(resultados[0].lote);
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
            src="/logos-arenas/logo-arenas.png"
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
            {MOSTRAR_VISTA_OPCIONES && (
            <button
              onClick={() => setVista(siguienteVista)}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold sm:text-[13px] max-[360px]:px-2 max-[360px]:text-[11px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
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
            )}
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex w-full items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:shrink-0 sm:gap-3">
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
            {/* Manzana y lote en dos columnas; las listas emergentes se anclan a este contenedor y abren con todo el ancho debajo. */}
            <div className="relative grid grid-cols-2 gap-3 px-4 pt-3 pb-3">
              <SelectorManzana
                manzanas={manzanas}
                valor={mzFiltro}
                onCambiar={elegirManzana}
                anchoCompleto
              />
              <div ref={buscadorRef}>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    enterKeyHint="search"
                    autoComplete="off"
                    value={
                      mostrandoSeleccion ? `Lote ${lote.lt}` : textoBusqueda
                    }
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
                    placeholder="Buscar lote (ej. 9)"
                    className={`selectCampo h-12 w-full !py-0 !pr-12 !pl-12 text-center ${mostrandoSeleccion ? "!font-semibold" : ""}`}
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
                </div>
                {buscadorAbierto && (
                  <div className="absolute inset-x-4 top-full z-20 -mt-1 rounded-xl border border-[var(--border)] bg-white p-2 shadow-[0_12px_32px_rgba(20,22,28,0.14)]">
                    {resultados.length > 0 ? (
                      <div className="grid max-h-56 grid-cols-2 gap-1.5 sm:max-h-64 sm:grid-cols-3 sm:gap-1 overflow-y-auto">
                        {resultados.map((l, i) => (
                          <button
                            key={l.lote}
                            onClick={() => {
                              elegirLote(l.lote);
                              setBuscadorAbierto(false);
                            }}
                            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left max-sm:justify-start max-sm:gap-3 text-xs font-semibold max-sm:border max-sm:border-[var(--border)] max-sm:px-3.5 max-sm:py-3 sm:py-2.5 sm:text-sm ${sinTexto && i >= 10 ? "sm:hidden" : ""} text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]`}
                          >
                            <span className="flex items-baseline gap-2 whitespace-nowrap">
                              <span className="text-[11px] font-medium tracking-[0.16em] text-[var(--text-muted)] uppercase sm:hidden">
                                Lote
                              </span>
                              <span className="max-sm:hidden">Lote {l.lt}</span>
                              <span className="text-[15px] leading-none font-medium text-[var(--text-primary)] tabular-nums sm:hidden">
                                {l.lt}
                              </span>
                            </span>
                            <span className="text-[11px] font-medium text-[var(--text-muted)] sm:text-[13px]">
                              {l.metraje_m2} m²
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="px-2 py-1.5 text-xs text-[var(--text-muted)]">
                        {sinTexto
                          ? `No hay lotes disponibles en la Manzana ${mzFiltro}.`
                          : `No hay lotes que coincidan en la Manzana ${mzFiltro}.`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TarjetaInfo>

          <TarjetaInfo
            color="#2b7de0"
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
            <div className="grid grid-cols-2 gap-3 px-4 pt-3 pb-3">
              <CajaPrecio etiqueta="Metraje" grande>
                {/* La cifra va más grande que el resto y la unidad en letra menor, para que quepa en media columna. */}
                <span className="text-[1.75rem] leading-none sm:text-[2.5rem]">
                  {lote.metraje_m2}
                </span>
                <span className="ml-1 text-base font-bold text-[var(--text-secondary)] sm:ml-1.5 sm:text-[1.35rem]">
                  m²
                </span>
              </CajaPrecio>
              <CajaPrecio etiqueta="Ubicación" azul grande>
                {/* «ESQUINA - FRENTE AL PARQUE»: la ubicación va grande y el detalle debajo, en letra menor. */}
                <span className="block">{lote.ubicacion.split(" - ")[0]}</span>
                {lote.ubicacion.includes(" - ") && (
                  <span className="mt-1 block text-[11px] leading-tight font-bold text-[#2468bd] sm:text-sm">
                    {lote.ubicacion.split(" - ").slice(1).join(" - ")}
                  </span>
                )}
              </CajaPrecio>
            </div>
            {lote.etapa && <FilaDato label="Etapa" valor={lote.etapa} />}
          </TarjetaInfo>

          <TarjetaInfo
            color="#5f9b3c"
            titulo="Fraccionamiento"
            acciones={
              lote.promocion && (
                <ChipPromocion
                  promocion={lote.promocion}
                  tono="verde"
                  alinear="derecha"
                />
              )
            }
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
            <CuotaYPlazo
              cuota={cuotaMensual}
              plazo={plazo}
              onCambiarPlazo={setPlazo}
              total={planFijo.precio_financiado}
              tamano={tamanoFila}
            />
            <div className="grid grid-cols-2 gap-3 px-4 pt-3 pb-3">
              <CajaPrecio etiqueta="Precio total" tachado medio>
                <Soles monto={lote.precio_lista} />
              </CajaPrecio>
              <CajaPrecio etiqueta="Precio con dscto" destacado medio>
                <Soles monto={lote.precio_con_dscto} />
              </CajaPrecio>
            </div>
            <InicialDinamica
              modo={inicialModo}
              azul={plazo === PLAZOS_CUOTAS[0]}
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
                <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg lg:text-xl">
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
                {plazoDe(lote) <= PARAMETROS.meses_por_tramo ? (
                  <CuotasPorMes
                    monto={primero}
                    cuotas={plazoDe(lote)}
                    color={modalidadActiva.color}
                  />
                ) : (
                  <BarrasCuotas
                    segmentos={segmentos}
                    color={modalidadActiva.color}
                  />
                )}
                <EditorCuotasPie
                  plazo={plazo}
                  onCambiarPlazo={setPlazo}
                  color={modalidadActiva.color}
                />
                {/* La nota cambia de largo con la cantidad de cuotas (con 80 hay un tramo más que explicar). Se
                    reserva el alto de la versión más larga con una copia invisible apilada en la misma celda,
                    así la tarjeta no cambia de alto ni empuja lo que hay debajo. */}
                <div className="mx-auto grid max-w-[34rem] border-t border-[var(--border)] pt-4 text-center text-[11px] leading-relaxed sm:text-[13px] text-[var(--text-muted)]">
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
  acciones,
  children,
}: {
  color: string;
  fondo?: string;
  titulo: React.ReactNode;
  icono: React.ReactNode;
  /** Algo a la derecha del título (por ejemplo la etiqueta de promoción). */
  acciones?: React.ReactNode;
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
        <h2
          className="ml-1.5 text-sm font-bold sm:text-base lg:text-[17px]"
          style={{ color: color }}
        >
          {titulo}
        </h2>
        {acciones && <div className="-mr-3 ml-auto shrink-0">{acciones}</div>}
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
        <span className="text-sm text-[var(--text-secondary)] sm:text-[18px]">
          {label}
        </span>
        <span
          className={`text-right [font-variant-numeric:tabular-nums] ${
            grande
              ? destacado
                ? "text-lg sm:text-2xl"
                : "text-base sm:text-xl"
              : "text-sm sm:text-[18px]"
          } ${
            resaltado ? "-mr-2 rounded-md bg-[#2b7de0]/15 px-2 py-0.5" : ""
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

/** Inicial a elegir entre tres montos (S/ 500, 1,000 o 2,000); se paga completa al firmar y cambia la cuota. */
function InicialDinamica({
  modo,
  azul,
  onCambiar,
}: {
  modo: InicialModo;
  /** Con el plazo corto (60) la selección va en azul, igual que en el selector de cuotas. */
  azul: boolean;
  onCambiar: (m: InicialModo) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <div className="flex w-full flex-col gap-3.5">
        <p className="m-0 text-center text-sm font-semibold tracking-wider text-[var(--text-muted)] uppercase sm:text-base">
          Elige tu inicial
        </p>

        <div
          role="radiogroup"
          aria-label="Monto de la inicial"
          className="grid grid-cols-3 gap-2"
        >
          {INICIAL_MODOS.map((m) => (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={modo === m.key}
              onClick={() => onCambiar(m.key)}
              className={`rounded-lg border py-3.5 text-base font-bold transition-colors sm:py-4 sm:text-xl ${
                modo === m.key
                  ? `${azul ? "border-[#2b7de0] bg-[#2b7de0]" : "border-[#5f9b3c] bg-[#5f9b3c]"} text-white shadow-sm`
                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
