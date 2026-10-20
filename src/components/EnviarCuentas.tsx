"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toBlob } from "html-to-image";
import { FICHA_ANCHO, FichaCuentas } from "@/components/FichaCotizacion";
import { FORMATOS_FICHA } from "@/lib/configCotizacion";
import {
  cssDeFuentes,
  invalidarCacheFuentes,
  sinMenuDeCompartir,
} from "@/lib/capturaFicha";

const ALTO = FORMATOS_FICHA.vertical.alto;
/** La imagen lleva fecha y hora: pasado este tiempo se vuelve a generar. */
const FRESCURA_MS = 10 * 60 * 1000;
const NOMBRE = "cuentas-de-pago-ceinys.png";

/**
 * Botón "Enviar cuentas": genera una imagen con las cuentas bancarias. En teléfono y tableta abre el
 * menú de compartir (WhatsApp); en escritorio la descarga. La imagen se prepara en segundo plano para
 * que el menú se abra dentro del toque del usuario (Safari lo exige).
 */
export function EnviarCuentas() {
  const ficha = useRef<HTMLDivElement>(null);
  const lista = useRef<{ archivo: File; en: number } | null>(null);
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [emitida, setEmitida] = useState(() => new Date());
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  function avisar(texto: string) {
    setAviso(texto);
    window.setTimeout(() => setAviso(null), 4500);
  }

  async function generar(): Promise<File> {
    const nodo = ficha.current;
    if (!nodo) throw new Error("La lámina aún no está lista");
    await document.fonts?.ready;
    const fontEmbedCSS = await cssDeFuentes();
    if (!fontEmbedCSS) invalidarCacheFuentes();
    const opciones = {
      width: FICHA_ANCHO,
      height: ALTO,
      pixelRatio: 1,
      backgroundColor: "#FAFAF9",
      fontEmbedCSS,
    };
    await toBlob(nodo, opciones).catch(() => null); // Safari: la primera pasada sale incompleta
    const blob = await toBlob(nodo, opciones);
    if (!blob) throw new Error("No se pudo generar la imagen");
    return new File([blob], NOMBRE, { type: "image/png" });
  }

  const fresca = () =>
    lista.current && Date.now() - lista.current.en < FRESCURA_MS
      ? lista.current.archivo
      : null;

  async function preparar() {
    setEmitida(new Date());
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
    const archivo = await generar();
    lista.current = { archivo, en: Date.now() };
    return archivo;
  }

  // Se prepara en segundo plano al cargar la página.
  useEffect(() => {
    if (!montado) return;
    const espera = window.setTimeout(
      () => void preparar().catch(() => {}),
      1200,
    );
    return () => window.clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montado]);

  function descargar(archivo: File) {
    const url = URL.createObjectURL(archivo);
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo.name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function enviar() {
    if (ocupado) return;
    let archivo = fresca();
    if (!archivo) {
      setOcupado(true);
      try {
        archivo = await preparar();
      } catch {
        avisar("No se pudo generar la imagen. Intenta de nuevo.");
        setOcupado(false);
        return;
      }
      setOcupado(false);
    }
    if (sinMenuDeCompartir() || !navigator.canShare?.({ files: [archivo] })) {
      descargar(archivo);
      avisar("Se descargó la imagen de las cuentas.");
      return;
    }
    try {
      await navigator.share({ files: [archivo] });
    } catch (e) {
      const nombre = (e as DOMException).name;
      if (nombre === "NotAllowedError")
        avisar(
          "Imagen lista. Toca «Enviar cuentas» otra vez para compartirla.",
        );
      else if (nombre !== "AbortError") {
        descargar(archivo);
        avisar("Se descargó la imagen de las cuentas.");
      }
    }
  }

  const escritorio = montado && sinMenuDeCompartir();

  return (
    <>
      <button
        type="button"
        onClick={enviar}
        disabled={ocupado}
        aria-label={
          escritorio ? "Descargar cuentas de pago" : "Enviar cuentas de pago"
        }
        className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          {escritorio ? (
            <>
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </>
          ) : (
            <>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
              <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
            </>
          )}
        </svg>
        {ocupado
          ? "Preparando…"
          : escritorio
            ? "Descargar cuentas"
            : "Enviar cuentas"}
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
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed top-0 -left-[3000px]"
            style={{ width: FICHA_ANCHO }}
          >
            <FichaCuentas ref={ficha} emitida={emitida} />
          </div>,
          document.body,
        )}
    </>
  );
}
