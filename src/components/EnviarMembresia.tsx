"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toBlob } from "html-to-image";
import type { TandaMembresia } from "@/lib/membresiaClub";
import { FORMATOS_FICHA, INCLUIR_CUENTAS_DE_PAGO } from "@/lib/configCotizacion";
import { cssDeFuentes, invalidarCacheFuentes, sinMenuDeCompartir } from "@/lib/capturaFicha";
import {
  FICHA_ALTO_MEMBRESIA,
  FICHA_ANCHO,
  FichaCuentas,
  FichaMembresia,
  type ClienteFicha,
} from "@/components/FichaCotizacion";
import { celularValido, enlaceWaMe, enlaceWhatsAppWeb, mensajeMembresia, soloCelular } from "@/lib/whatsapp";
import { ModalDatosCliente, type ErroresModal, type FaseModal } from "@/components/ModalDatosCliente";

/** La hoja de cuentas siempre usa el lienzo vertical. */
const ALTO_CUENTAS = FORMATOS_FICHA.vertical.alto;

const puedeCopiarImagenes = () => typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;

const leerComoDataUrl = (archivo: File) =>
  new Promise<string>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(archivo);
  });

const dosFotogramas = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

const normalizarNombre = (v: string) => v.replace(/\s+/g, " ").trim();

function validar(nombre: string, dni: string, celular: string): ErroresModal {
  const errores: ErroresModal = {};
  const limpio = normalizarNombre(nombre);
  if (limpio.length < 2 || !/\p{L}/u.test(limpio)) errores.nombre = "Escribe el nombre del cliente.";
  if (dni !== "" && !/^\d{8}$/.test(dni)) errores.dni = "El DNI debe tener 8 dígitos (o déjalo vacío).";
  if (celular !== "" && !celularValido(celular))
    errores.celular = "Escribe el celular (9 dígitos, o con el código de país si no es de Perú) o déjalo vacío.";
  return errores;
}

/** Nombre del PDF: Cotizacion_Club-Carhuaz_70-DSCTO_ANA-PEREZ_2026-11-03.pdf (cliente sin tildes ni símbolos). */
function nombrePdf(tanda: TandaMembresia, cliente: string, fecha: Date) {
  const persona = cliente
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 40);
  const dia = [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, "0"), String(fecha.getDate()).padStart(2, "0")].join("-");
  return `Cotizacion_Club-Carhuaz_${Math.round(tanda.descuento * 100)}-DSCTO${persona ? `_${persona}` : ""}_${dia}.pdf`;
}

/**
 * Botón «Cotizar» de la membresía del Club Carhuaz. Mismo flujo que «Enviar» del cotizador de lotes: pide nombre, DNI y celular del
 * cliente, imprime la ficha de la tanda elegida (más la hoja de cuentas de pago) en dos imágenes PNG y las comparte por WhatsApp,
 * las descarga o las copia, o baja todo en un PDF.
 */
export function EnviarMembresia({ tanda }: { tanda: TandaMembresia }) {
  const ficha = useRef<HTMLDivElement>(null);
  const cuentas = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [emitida, setEmitida] = useState(() => new Date());
  const [fase, setFase] = useState<FaseModal | null>(null);
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [celular, setCelular] = useState("");
  const [errores, setErrores] = useState<ErroresModal>({});
  const [cliente, setCliente] = useState<ClienteFicha | null>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [miniaturas, setMiniaturas] = useState<string[]>([]);
  const [escritorio, setEscritorio] = useState(false);
  const [puedeCopiar, setPuedeCopiar] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [descargadas, setDescargadas] = useState(false);

  const nombreArchivo = (n: number) => `cotizacion-club-carhuaz-${Math.round(tanda.descuento * 100)}dscto-${n}de${INCLUIR_CUENTAS_DE_PAGO ? 2 : 1}.png`;

  const generar = useCallback(async (): Promise<File[]> => {
    const nodos = INCLUIR_CUENTAS_DE_PAGO ? [ficha.current, cuentas.current] : [ficha.current];
    if (nodos.some((n) => !n)) throw new Error("La ficha aún no está lista");
    await document.fonts?.ready;
    const fontEmbedCSS = await cssDeFuentes();
    if (!fontEmbedCSS) invalidarCacheFuentes();
    const opciones = (alto: number) => ({ width: FICHA_ANCHO, height: alto, pixelRatio: 1, backgroundColor: "#FAFAF9", fontEmbedCSS });
    // Safari: la primera captura suele salir sin imágenes o sin fuentes; se hace una pasada previa y se descarta.
    await toBlob(nodos[0]!, opciones(FICHA_ALTO_MEMBRESIA)).catch(() => null);
    const resultado: File[] = [];
    for (const [i, nodo] of nodos.entries()) {
      const blob = await toBlob(nodo!, opciones(i === 1 ? ALTO_CUENTAS : FICHA_ALTO_MEMBRESIA));
      if (!blob) throw new Error("No se pudo generar la imagen");
      resultado.push(new File([blob], nombreArchivo(i + 1), { type: "image/png" }));
    }
    return resultado;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanda]);

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

  async function compartir(listas: File[]): Promise<"compartido" | "cancelado" | "permiso" | "sin-menu"> {
    if (sinMenuDeCompartir() || !navigator.canShare?.({ files: listas })) return "sin-menu";
    try {
      await navigator.share({ files: listas });
      return "compartido";
    } catch (e) {
      const nombreError = (e as DOMException).name;
      if (nombreError === "AbortError") return "cancelado";
      if (nombreError === "NotAllowedError") return "permiso";
      return "sin-menu";
    }
  }

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
        setFase("listo");
        return;
      }
      const r = await compartir(listas);
      if (r === "compartido") cerrarModal();
      else if (r === "sin-menu") {
        descargar(listas);
        setFase("descargado");
      } else setFase("listo");
    } catch {
      setFase("datos");
      setErrores({ general: "No se pudieron generar las imágenes. Intenta de nuevo." });
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

  async function descargarPdf() {
    if (archivos.length === 0) return;
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [FICHA_ANCHO, FICHA_ALTO_MEMBRESIA], hotfixes: ["px_scaling"], compress: true });
      for (const [i, archivo] of archivos.entries()) {
        const alto = i === 1 ? ALTO_CUENTAS : FICHA_ALTO_MEMBRESIA;
        if (i > 0) pdf.addPage([FICHA_ANCHO, alto], "portrait");
        pdf.addImage(await leerComoDataUrl(archivo), "PNG", 0, 0, FICHA_ANCHO, alto);
      }
      pdf.setProperties({
        title: `Cotización Club Carhuaz · ${Math.round(tanda.descuento * 100)} % de descuento`,
        author: "CEINYS Constructora e Inmobiliaria",
      });
      pdf.save(nombrePdf(tanda, cliente?.nombre ?? "", emitida));
      setErrores({});
    } catch {
      setErrores({ general: "No se pudo crear el PDF. Descarga las imágenes e intenta de nuevo." });
    }
  }

  async function copiarImagen(i: number) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": archivos[i] })]);
      setCopiado(i);
      setErrores({});
      window.setTimeout(() => setCopiado((c) => (c === i ? null : c)), 2200);
    } catch {
      setErrores({ general: "El navegador no permitió copiar la imagen. Usa «Descargar las imágenes»." });
    }
  }

  function descargarDesdeModal() {
    descargar(archivos);
    if (escritorio) setDescargadas(true);
    else setFase("descargado");
  }

  const textoChat = mensajeMembresia(nombre);
  const enlaceChat = celularValido(celular) ? enlaceWaMe(celular, textoChat) : null;
  const enlaceChatWeb = celularValido(celular) ? enlaceWhatsAppWeb(celular, textoChat) : null;

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={abrirModal}
        aria-label="Cotizar la membresía y enviarla por WhatsApp"
        className="mx-3 mb-3 flex items-center justify-center gap-2 rounded-xl border border-[#4c8030] bg-[#5f9b3c] px-4 py-3 text-base font-bold text-white transition-colors hover:bg-[#528a33] active:translate-y-px sm:mx-4 sm:mb-4 sm:py-3.5 sm:text-lg"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 sm:h-[22px] sm:w-[22px]" aria-hidden>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
        </svg>
        Cotizar
      </button>

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
              setErrores((e) => ({ ...e, nombre: undefined, general: undefined }));
            }}
            onDni={(v) => {
              setDni(v.replace(/\D/g, "").slice(0, 8));
              setErrores((e) => ({ ...e, dni: undefined, general: undefined }));
            }}
            onCelular={(v) => {
              setCelular(soloCelular(v));
              setErrores((e) => ({ ...e, celular: undefined, general: undefined }));
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

      {/* Las fichas viven fuera de pantalla para capturarlas a tamaño real. */}
      {montado &&
        createPortal(
          <div aria-hidden className="pointer-events-none fixed top-0 -left-[3000px]" style={{ width: FICHA_ANCHO }}>
            <FichaMembresia ref={ficha} tanda={tanda} emitida={emitida} cliente={cliente} />
            {INCLUIR_CUENTAS_DE_PAGO && <FichaCuentas ref={cuentas} emitida={emitida} />}
          </div>,
          document.body,
        )}
    </>
  );
}
