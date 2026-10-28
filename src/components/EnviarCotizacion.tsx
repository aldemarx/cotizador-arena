"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { toBlob } from "html-to-image";
import type { InicialModo, Lote } from "@/lib/arenas";
import { FORMATOS_FICHA, PEDIR_DATOS_CLIENTE } from "@/lib/configCotizacion";
import {
  cssDeFuentes,
  invalidarCacheFuentes,
  sinMenuDeCompartir,
} from "@/lib/capturaFicha";
import {
  FICHA_ALTO,
  FICHA_ANCHO,
  FichaCara1,
  FichaCara2,
  FichaCuentas,
  type ClienteFicha,
} from "@/components/FichaCotizacion";
import {
  celularValido,
  enlaceWaMe,
  enlaceWhatsAppWeb,
  mensajeCotizacion,
  soloCelular,
} from "@/lib/whatsapp";
import {
  ModalDatosCliente,
  type ErroresModal,
  type FaseModal,
} from "@/components/ModalDatosCliente";

/** Las imágenes preparadas dejan de ser "frescas" a los 10 minutos (llevan fecha y hora de emisión). */
const FRESCURA_MS = 10 * 60 * 1000;

/** La hoja de cuentas siempre usa el lienzo vertical. */
const ALTO_CUENTAS = FORMATOS_FICHA.vertical.alto;

type Preparadas = { clave: string; archivos: File[]; en: number };

/** ¿Puede el navegador copiar una imagen al portapapeles? (Firefox antiguo: no). */
function puedeCopiarImagenes(): boolean {
  return typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
}

function nombreArchivo(lote: Lote, n: number) {
  return `cotizacion-arenas-del-valle-mz${lote.mz}-lote${lote.lt}-${n}de3.png`;
}

/**
 * Nombre automático del PDF: proyecto, lote, cliente y fecha. Ej.: Cotizacion_Arenas-del-Valle_MZ5-LT20_ANA-PEREZ_2026-10-13.pdf
 * El cliente va sin tildes ni símbolos para que el nombre sea válido en cualquier sistema.
 */
function nombrePdf(lote: Lote, cliente: string, fecha: Date) {
  const persona = cliente
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 40);
  const dia = [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
  return `Cotizacion_Arenas-del-Valle_MZ${lote.mz}-LT${lote.lt}${persona ? `_${persona}` : ""}_${dia}.pdf`;
}

const leerComoDataUrl = (archivo: File) =>
  new Promise<string>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(archivo);
  });

const dosFotogramas = () =>
  new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );

/** Nombre sin espacios sobrantes; el DNI solo con dígitos. */
function normalizarNombre(v: string) {
  return v.replace(/\s+/g, " ").trim();
}

function validar(nombre: string, dni: string, celular: string): ErroresModal {
  const errores: ErroresModal = {};
  const limpio = normalizarNombre(nombre);
  // Basta con un nombre (el apellido es opcional).
  if (limpio.length < 2 || !/\p{L}/u.test(limpio)) {
    errores.nombre = "Escribe el nombre del cliente.";
  }
  // El DNI es opcional: si se escribe, debe tener 8 dígitos.
  if (dni !== "" && !/^\d{8}$/.test(dni))
    errores.dni = "El DNI debe tener 8 dígitos (o déjalo vacío).";
  if (celular !== "" && !celularValido(celular))
    errores.celular =
      "Escribe el celular (9 dígitos, o con el código de país si no es de Perú) o déjalo vacío.";
  return errores;
}

/**
 * Botón "Enviar": genera las dos caras de la cotización y la hoja de cuentas de pago como PNG y abre el menú de compartir del
 * sistema para mandarlas por WhatsApp como un álbum de dos fotos; el asesor elige el chat desde su
 * propio WhatsApp.
 *
 * - PRUEBA con PEDIR_DATOS_CLIENTE = true: antes de generar, un pop-up pide nombre y DNI, que se
 *   imprimen en las imágenes. Como los datos se conocen recién al enviar, las imágenes se generan
 *   en ese momento; si Safari ya venció el permiso de compartir, queda un botón "Compartir".
 * - Con PEDIR_DATOS_CLIENTE = false: no pide nada; las imágenes se preparan en segundo plano al
 *   cambiar de lote para que el menú se abra al instante.
 */
export function EnviarCotizacion({
  lote,
  inicialModo,
  bloqueo,
}: {
  lote: Lote;
  inicialModo: InicialModo;
  /** Si viene, el lote no está disponible: el botón queda inhabilitado y este texto explica por qué. */
  bloqueo?: string;
}) {
  const cara1 = useRef<HTMLDivElement>(null);
  const cara2 = useRef<HTMLDivElement>(null);
  // Hoja de cuentas de pago: tercera imagen de WhatsApp y tercera página del PDF.
  const cuentas = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  // true solo en el navegador (el portal necesita document); evita desajustes de hidratación.
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [emitida, setEmitida] = useState(() => new Date());
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const preparadas = useRef<Preparadas | null>(null);
  const clave = `${lote.lote}|${inicialModo}|${lote.plazo ?? ""}`;

  // --- pop-up de datos del cliente (prueba) ---
  const [fase, setFase] = useState<FaseModal | null>(null);
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  // Celular del cliente (opcional): solo sirve para armar el enlace al chat; no se guarda.
  const [celular, setCelular] = useState("");
  const [errores, setErrores] = useState<ErroresModal>({});
  const [cliente, setCliente] = useState<ClienteFicha | null>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [miniaturas, setMiniaturas] = useState<string[]>([]);
  // Escritorio: sin menú de compartir; se descarga o se copia cada imagen.
  const [escritorio, setEscritorio] = useState(false);
  const [puedeCopiar, setPuedeCopiar] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [descargadas, setDescargadas] = useState(false);

  const avisar = useCallback((texto: string) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(null), 4500);
  }, []);

  /** Convierte las fichas (2 hojas de cotización + hoja de cuentas de pago) en archivos PNG. */
  const generar = useCallback(async (): Promise<File[]> => {
    const nodos = [cara1.current, cara2.current, cuentas.current];
    if (nodos.some((n) => !n)) throw new Error("La ficha aún no está lista");
    await document.fonts?.ready;
    const fontEmbedCSS = await cssDeFuentes();
    if (!fontEmbedCSS) invalidarCacheFuentes(); // no había fuentes que leer: se reintenta la próxima vez
    const opciones = (alto: number) => ({
      width: FICHA_ANCHO,
      height: alto,
      pixelRatio: 1,
      backgroundColor: "#FAFAF9",
      fontEmbedCSS,
    });
    // Safari: la primera captura suele salir sin imágenes o sin fuentes. Se hace una pasada previa y se descarta.
    await toBlob(nodos[0]!, opciones(FICHA_ALTO)).catch(() => null);
    const resultado: File[] = [];
    for (const [i, nodo] of nodos.entries()) {
      const blob = await toBlob(
        nodo!,
        opciones(i === 2 ? ALTO_CUENTAS : FICHA_ALTO),
      );
      if (!blob) throw new Error("No se pudo generar la imagen");
      resultado.push(
        new File([blob], nombreArchivo(lote, i + 1), { type: "image/png" }),
      );
    }
    return resultado;
  }, [lote]);

  /**
   * Sin pop-up: se preparan las imágenes en segundo plano cuando cambia el lote o la forma de pagar
   * la inicial. Así, al tocar "Enviar", el menú de compartir se abre al instante: Safari exige que
   * se abra dentro del toque del usuario y rechaza el envío si antes hubo trabajo largo.
   */
  useEffect(() => {
    if (!montado || PEDIR_DATOS_CLIENTE) return;
    preparadas.current = null;
    let cancelado = false;
    const espera = window.setTimeout(() => {
      setEmitida(new Date());
      requestAnimationFrame(() =>
        requestAnimationFrame(async () => {
          try {
            const listas = await generar();
            if (!cancelado)
              preparadas.current = { clave, archivos: listas, en: Date.now() };
          } catch {
            /* se reintenta al tocar el botón */
          }
        }),
      );
    }, 700);
    return () => {
      cancelado = true;
      window.clearTimeout(espera);
    };
  }, [montado, clave, generar]);

  function descargar(listas: File[]) {
    listas.forEach((archivo, i) =>
      window.setTimeout(() => {
        const url = URL.createObjectURL(archivo);
        const a = document.createElement("a");
        a.href = url;
        a.download = archivo.name;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, i * 350),
    );
  }

  /** Abre el menú de compartir. Devuelve cómo terminó. */
  async function compartir(
    listas: File[],
  ): Promise<"compartido" | "cancelado" | "permiso" | "sin-menu"> {
    if (sinMenuDeCompartir() || !navigator.canShare?.({ files: listas }))
      return "sin-menu";
    try {
      await navigator.share({ files: listas });
      return "compartido";
    } catch (e) {
      const nombreError = (e as DOMException).name;
      if (nombreError === "AbortError") return "cancelado"; // el asesor cerró el menú
      if (nombreError === "NotAllowedError") return "permiso"; // Safari venció el permiso
      return "sin-menu";
    }
  }

  /* ---------- sin pop-up (envío directo) ---------- */

  async function envioDirecto() {
    if (ocupado) return;
    const lista = preparadas.current;
    let listas: File[];
    if (lista && lista.clave === clave && Date.now() - lista.en < FRESCURA_MS) {
      listas = lista.archivos; // camino rápido: dentro del toque del usuario
    } else {
      setOcupado(true);
      try {
        setEmitida(new Date());
        await dosFotogramas();
        listas = await generar();
        preparadas.current = { clave, archivos: listas, en: Date.now() };
      } catch {
        avisar("No se pudieron generar las imágenes. Intenta de nuevo.");
        setOcupado(false);
        return;
      }
      setOcupado(false);
    }
    const r = await compartir(listas);
    if (r === "permiso") {
      avisar("Imágenes listas. Toca «Enviar» otra vez para compartirlas.");
    } else if (r === "sin-menu") {
      descargar(listas);
      avisar("Se descargaron las 3 imágenes. Envíalas por WhatsApp.");
    }
  }

  /* ---------- con pop-up (prueba) ---------- */

  function abrirModal() {
    setNombre("");
    setDni("");
    setCelular("");
    setErrores({});
    setCliente(null);
    setArchivos([]);
    setMiniaturas([]);
    setEscritorio(sinMenuDeCompartir());
    setPuedeCopiar(puedeCopiarImagenes());
    setCopiado(null);
    setDescargadas(false);
    setFase("datos");
  }

  function cerrarModal() {
    setFase(null);
    // Los datos del cliente no se conservan: cada cotización es de una persona distinta.
    setNombre("");
    setDni("");
    setCelular("");
    setCliente(null);
    setArchivos([]);
    setMiniaturas([]);
    window.setTimeout(() => boton.current?.focus(), 0);
  }

  // Libera las vistas en miniatura al cambiarlas o al desmontar.
  useEffect(() => {
    return () => miniaturas.forEach((u) => URL.revokeObjectURL(u));
  }, [miniaturas]);

  async function generarConDatos() {
    const faltas = validar(nombre, dni, celular);
    setErrores(faltas);
    if (faltas.nombre || faltas.dni || faltas.celular) return;

    setFase("preparando");
    setErrores({});
    setCopiado(null);
    setDescargadas(false);
    setCliente({ nombre: normalizarNombre(nombre), dni });
    setEmitida(new Date());
    try {
      await dosFotogramas(); // la ficha ya muestra los datos nuevos
      const listas = await generar();
      setArchivos(listas);
      setMiniaturas(listas.map((f) => URL.createObjectURL(f)));
      if (sinMenuDeCompartir()) {
        setFase("listo"); // escritorio: el asesor elige descargar o copiar
        return;
      }
      // Se intenta compartir de inmediato; si Safari ya no lo permite, queda el botón "Compartir".
      const r = await compartir(listas);
      if (r === "compartido") cerrarModal();
      else if (r === "sin-menu") {
        descargar(listas);
        setFase("descargado");
      } else setFase("listo");
    } catch {
      setFase("datos");
      setErrores({
        general: "No se pudieron generar las imágenes. Intenta de nuevo.",
      });
    }
  }

  async function compartirDesdeModal() {
    const r = await compartir(archivos);
    if (r === "compartido") cerrarModal();
    else if (r === "sin-menu") {
      descargar(archivos);
      setFase("descargado");
    }
  }

  /** PDF oficial: las mismas 3 hojas (cotización x2 y cuentas de pago); se descarga con nombre automático. */
  async function descargarPdf() {
    if (archivos.length === 0) return;
    try {
      const { jsPDF } = await import("jspdf"); // se carga solo al pedir el PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [FICHA_ANCHO, FICHA_ALTO],
        hotfixes: ["px_scaling"],
        compress: true,
      });
      for (const [i, archivo] of archivos.entries()) {
        // La tercera hoja (cuentas) usa siempre el lienzo vertical.
        const alto = i === 2 ? ALTO_CUENTAS : FICHA_ALTO;
        if (i > 0) pdf.addPage([FICHA_ANCHO, alto], "portrait");
        pdf.addImage(
          await leerComoDataUrl(archivo),
          "PNG",
          0,
          0,
          FICHA_ANCHO,
          alto,
        );
      }
      pdf.setProperties({
        title: `Cotización Arenas del Valle · MZ ${lote.mz} · LOTE ${lote.lt}`,
        author: "CEINYS Constructora e Inmobiliaria",
      });
      pdf.save(nombrePdf(lote, cliente?.nombre ?? "", emitida));
      setErrores({});
    } catch {
      setErrores({
        general:
          "No se pudo crear el PDF. Descarga las imágenes e intenta de nuevo.",
      });
    }
  }

  async function copiarImagen(i: number) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": archivos[i] }),
      ]);
      setCopiado(i);
      setErrores({});
      window.setTimeout(() => setCopiado((c) => (c === i ? null : c)), 2200);
    } catch {
      setErrores({
        general:
          "El navegador no permitió copiar la imagen. Usa «Descargar las 3 imágenes».",
      });
    }
  }

  function descargarDesdeModal() {
    descargar(archivos);
    // Escritorio: se queda en la misma vista para poder copiar también; móvil pasa a «descargado».
    if (escritorio) setDescargadas(true);
    else setFase("descargado");
  }

  // Enlaces al chat del cliente (solo si escribió un celular válido).
  const textoChat = mensajeCotizacion(nombre, lote.mz, lote.lt);
  const enlaceChat = celularValido(celular)
    ? enlaceWaMe(celular, textoChat)
    : null;
  const enlaceChatWeb = celularValido(celular)
    ? enlaceWhatsAppWeb(celular, textoChat)
    : null;

  function alTocarEnviar() {
    if (bloqueo) return;
    if (PEDIR_DATOS_CLIENTE) abrirModal();
    else void envioDirecto();
  }

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={alTocarEnviar}
        disabled={ocupado || !!bloqueo}
        aria-label={bloqueo ?? "Enviar cotización por WhatsApp"}
        title={bloqueo}
        className="flex shrink-0 items-center gap-2 rounded-xl border border-[#4c8030] bg-[#5f9b3c] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#528a33] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:py-3 sm:text-base max-[360px]:px-3"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 sm:h-[22px] sm:w-[22px]"
          aria-hidden
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
        </svg>
        <span>{ocupado ? "Preparando…" : "Enviar"}</span>
      </button>

      {aviso && (
        <p
          role="status"
          className="fixed bottom-6 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl bg-[var(--ceinys-grafito-900)] px-4 py-3 text-center text-sm font-medium text-white shadow-[0_12px_32px_rgba(20,22,28,0.3)]"
        >
          {aviso}
        </p>
      )}

      {montado &&
        fase &&
        createPortal(
          <ModalDatosCliente
            fase={fase}
            nombre={nombre}
            dni={dni}
            celular={celular}
            enlaceChat={enlaceChat}
            enlaceChatWeb={enlaceChatWeb}
            errores={errores}
            miniaturas={miniaturas}
            onNombre={(v) => {
              setNombre(v.replace(/[^\p{L}\s'’.-]/gu, ""));
              setErrores((e) => ({
                ...e,
                nombre: undefined,
                general: undefined,
              }));
            }}
            onDni={(v) => {
              setDni(v.replace(/\D/g, "").slice(0, 8));
              setErrores((e) => ({ ...e, dni: undefined, general: undefined }));
            }}
            onCelular={(v) => {
              setCelular(soloCelular(v));
              setErrores((e) => ({
                ...e,
                celular: undefined,
                general: undefined,
              }));
            }}
            onEnviar={generarConDatos}
            onCerrar={cerrarModal}
            onCompartir={compartirDesdeModal}
            onDescargar={descargarDesdeModal}
            onPdf={descargarPdf}
            onEditar={() => setFase("datos")}
            escritorio={escritorio}
            puedeCopiar={puedeCopiar}
            copiado={copiado}
            descargado={descargadas}
            onCopiar={copiarImagen}
          />,
          document.body,
        )}

      {/* Las fichas viven fuera de pantalla y fuera del bloque que se reescala, para capturarlas a tamaño real. */}
      {montado &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed top-0 -left-[3000px]"
            style={{ width: FICHA_ANCHO }}
          >
            <FichaCara1
              ref={cara1}
              lote={lote}
              inicialModo={inicialModo}
              emitida={emitida}
              cliente={cliente}
            />
            <FichaCara2
              ref={cara2}
              lote={lote}
              inicialModo={inicialModo}
              emitida={emitida}
              cliente={cliente}
            />
            <FichaCuentas ref={cuentas} emitida={emitida} />
          </div>,
          document.body,
        )}
    </>
  );
}
