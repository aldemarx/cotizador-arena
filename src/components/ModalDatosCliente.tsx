"use client";

import { useEffect, useRef } from "react";

/**
 * Pop-up para pedir nombre y DNI antes de generar la cotización.
 * Mismo estilo del pop-up "Recibe el brochure" de la web de Ceinys: fondo difuminado,
 * tarjeta blanca de 420 px, ícono redondo, campos con etiqueta en mayúsculas y botón de ancho completo.
 */

export type FaseModal = "datos" | "preparando" | "listo" | "descargado";

export type ErroresModal = {
  nombre?: string;
  dni?: string;
  celular?: string;
  general?: string;
};

type Props = {
  fase: FaseModal;
  nombre: string;
  dni: string;
  /** Celular del cliente (opcional): solo sirve para abrir su chat de WhatsApp. */
  celular: string;
  /** Enlaces ya armados (wa.me y WhatsApp Web) cuando hay un celular válido. */
  enlaceChat: string | null;
  enlaceChatWeb: string | null;
  errores: ErroresModal;
  /** Vistas en miniatura (URLs de objeto) de las 3 imágenes ya generadas. */
  miniaturas: string[];
  onNombre: (valor: string) => void;
  onDni: (valor: string) => void;
  onCelular: (valor: string) => void;
  onEnviar: () => void;
  onCerrar: () => void;
  onCompartir: () => void;
  onDescargar: () => void;
  /** Descarga las 3 hojas (cotización y cuentas de pago) en un solo PDF con nombre automático. */
  onPdf: () => void;
  onEditar: () => void;
  /** Escritorio: sin menú de compartir; se descarga o se copia cada imagen. */
  escritorio: boolean;
  /** El navegador permite copiar imágenes al portapapeles. */
  puedeCopiar: boolean;
  /** Índice de la imagen recién copiada (0 o 1), o null. */
  copiado: number | null;
  /** Ya se descargaron las 3 imágenes (escritorio). */
  descargado: boolean;
  onCopiar: (i: number) => void;
};

const CAMPO =
  "w-full rounded-[10px] border bg-[#F8F8F9] px-[14px] py-[13px] text-base font-medium text-[#1B1D22] transition-colors placeholder:text-[#ACAEB4] focus:bg-white focus:outline-none disabled:opacity-60";
const BOTON_SEC =
  "mt-2.5 flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#D5D7DD] bg-white px-5 py-3 text-[14px] font-bold text-[var(--ceinys-grafito-700)] transition-colors hover:bg-[#F5F4F2]";
const BOTON =
  "mt-3.5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--ceinys-grafito-700)] px-5 py-3.5 text-[14.5px] font-bold text-white transition-colors hover:bg-[var(--ceinys-grafito-900)] disabled:cursor-default disabled:opacity-70";

function Icono({
  tono,
  children,
}: {
  tono: "gris" | "verde";
  children: React.ReactNode;
}) {
  return (
    <div
      className="mx-auto mb-[18px] flex h-14 w-14 items-center justify-center rounded-full"
      style={
        tono === "verde"
          ? { background: "#E4F5EB", color: "#1E9E5A" }
          : { background: "#EEF0F3", color: "var(--ceinys-grafito-700)" }
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[26px] w-[26px]"
        aria-hidden
      >
        {children}
      </svg>
    </div>
  );
}

/** Abre el chat de WhatsApp del cliente (wa.me) con el mensaje ya escrito. */
function BotonChat({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#1E9E5A] px-5 py-3.5 text-[14.5px] font-bold text-white transition-colors hover:bg-[#177f48]"
    >
      {/* Logo oficial de WhatsApp (public/icons/whatsapp.svg), en blanco sobre el verde del botón. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/whatsapp.svg"
        alt=""
        aria-hidden
        className="h-[22px] w-[22px] [filter:brightness(0)_invert(1)]"
      />
      Abrir chat de WhatsApp
    </a>
  );
}

function Girando() {
  return (
    <span
      aria-hidden
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}

export function ModalDatosCliente(p: Props) {
  const tarjeta = useRef<HTMLDivElement>(null);
  const primero = useRef<HTMLInputElement>(null);
  const ocupado = p.fase === "preparando";

  // Foco al abrir, Esc para cerrar, y el fondo de la página no se desplaza mientras está abierto.
  useEffect(() => {
    const foco = window.setTimeout(() => primero.current?.focus(), 60);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape" && !ocupado) p.onCerrar();
    }
    document.addEventListener("keydown", alTeclear);
    return () => {
      window.clearTimeout(foco);
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", alTeclear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocupado]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-cliente"
    >
      <div
        className="animate-fade-in absolute inset-0 bg-[rgba(17,18,20,0.55)] backdrop-blur-[4px]"
        onClick={() => !ocupado && p.onCerrar()}
      />
      <div
        ref={tarjeta}
        className="animate-modal-in relative max-h-[calc(100dvh-40px)] w-full max-w-[420px] overflow-y-auto rounded-[20px] bg-white px-8 pt-10 pb-7 text-center shadow-[0_24px_60px_rgba(17,18,20,0.28),0_4px_12px_rgba(17,18,20,0.08)] max-[480px]:rounded-[18px] max-[480px]:px-[22px] max-[480px]:pt-8 max-[480px]:pb-6"
      >
        <button
          type="button"
          onClick={p.onCerrar}
          disabled={ocupado}
          aria-label="Cerrar"
          className="absolute top-3.5 right-3.5 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F4F4F5] text-[#55575D] transition-colors hover:bg-[#E9E9EC] hover:text-[#1B1D22] disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {(p.fase === "datos" || p.fase === "preparando") && (
          <>
            <Icono tono="gris">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
            </Icono>
            <h3
              id="titulo-modal-cliente"
              className="m-0 mb-2 text-[21px] leading-tight font-extrabold text-[#1B1D22]"
            >
              Datos del cliente
            </h3>
            <p className="m-0 mb-[22px] text-[14.5px] leading-[1.55] text-[#6B6D74]">
              Ingresa el nombre del cliente (el DNI es opcional) para emitir la
              cotización. Se imprimirán en la cotización. Con el celular podrás
              abrir su chat de WhatsApp.
            </p>

            <form
              className="flex flex-col gap-3.5 text-left"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (!ocupado) p.onEnviar();
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-[0.03em] text-[#8A8C92] uppercase">
                  Nombre del cliente
                </span>
                <input
                  ref={primero}
                  type="text"
                  value={p.nombre}
                  onChange={(e) => p.onNombre(e.target.value)}
                  placeholder="Ej. Ana (el apellido es opcional)"
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  maxLength={60}
                  disabled={ocupado}
                  aria-invalid={!!p.errores.nombre}
                  className={`${CAMPO} ${p.errores.nombre ? "border-[#D64545]" : "border-[#E3E4E8] focus:border-[var(--ceinys-grafito-700)]"}`}
                />
                {p.errores.nombre && (
                  <span className="text-[12.5px] text-[#D64545]">
                    {p.errores.nombre}
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-[0.03em] text-[#8A8C92] uppercase">
                  DNI{" "}
                  <span className="font-medium normal-case">(opcional)</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={p.dni}
                  onChange={(e) => p.onDni(e.target.value)}
                  placeholder="8 dígitos (opcional)"
                  autoComplete="off"
                  enterKeyHint="send"
                  disabled={ocupado}
                  aria-invalid={!!p.errores.dni}
                  className={`${CAMPO} ${p.errores.dni ? "border-[#D64545]" : "border-[#E3E4E8] focus:border-[var(--ceinys-grafito-700)]"}`}
                />
                {p.errores.dni && (
                  <span className="text-[12.5px] text-[#D64545]">
                    {p.errores.dni}
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-[0.03em] text-[#8A8C92] uppercase">
                  Celular del cliente{" "}
                  <span className="font-medium normal-case">(opcional)</span>
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={p.celular}
                  onChange={(e) => p.onCelular(e.target.value)}
                  placeholder="Perú: 9 dígitos · otro país: con código (ej. 573001234567)"
                  autoComplete="off"
                  enterKeyHint="send"
                  disabled={ocupado}
                  aria-invalid={!!p.errores.celular}
                  className={`${CAMPO} ${p.errores.celular ? "border-[#D64545]" : "border-[#E3E4E8] focus:border-[var(--ceinys-grafito-700)]"}`}
                />
                {p.errores.celular && (
                  <span className="text-[12.5px] text-[#D64545]">
                    {p.errores.celular}
                  </span>
                )}
              </label>

              {p.errores.general && (
                <p role="alert" className="m-0 text-[12.5px] text-[#D64545]">
                  {p.errores.general}
                </p>
              )}

              <button type="submit" disabled={ocupado} className={BOTON}>
                {ocupado ? (
                  <>
                    <Girando /> Preparando imágenes…
                  </>
                ) : (
                  "Generar cotización"
                )}
              </button>
            </form>

            <p className="m-0 mt-3.5 text-[11.5px] text-[#ACAEB4]">
              Los datos se usan solo para emitir esta cotización y abrir el
              chat; no se guardan en el simulador.
            </p>
          </>
        )}

        {(p.fase === "listo" || p.fase === "descargado") && (
          <>
            <Icono tono="verde">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </Icono>
            <h3
              id="titulo-modal-cliente"
              className="m-0 mb-2 text-[21px] leading-tight font-extrabold text-[#1B1D22]"
            >
              {p.fase === "listo" ? "Cotización lista" : "Imágenes descargadas"}
            </h3>
            <p className="m-0 mb-[18px] text-[14.5px] leading-[1.55] text-[#6B6D74]">
              {p.fase === "listo"
                ? p.escritorio
                  ? p.puedeCopiar
                    ? "Descárgalas, o copia cada imagen y pégala con Ctrl+V en el chat de WhatsApp Web."
                    : "Descárgalas y súbelas al chat de WhatsApp Web con el clip."
                  : "Revisa los datos y compártela por WhatsApp. Llegan como 3 fotos (la última, con las cuentas de pago)."
                : "Súbelas a WhatsApp desde tu galería o carpeta de descargas."}
            </p>

            {p.miniaturas.length > 0 && (
              <div className="mb-1 grid grid-cols-3 gap-2.5">
                {p.miniaturas.map((src, i) => (
                  <div key={src} className="flex flex-col gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Imagen ${i + 1} de 3`}
                      className="w-full rounded-[10px] border border-[#E3E4E8]"
                    />
                    {p.fase === "listo" && p.escritorio && p.puedeCopiar && (
                      <button
                        type="button"
                        onClick={() => p.onCopiar(i)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E3E4E8] bg-white px-2 py-2 text-[12.5px] font-bold text-[var(--ceinys-grafito-700)] transition-colors hover:bg-[#F4F4F5]"
                      >
                        {p.copiado === i ? (
                          <>
                            <span className="text-[#1E9E5A]">✓</span> Copiada
                          </>
                        ) : (
                          <>
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3.5 w-3.5"
                              aria-hidden
                            >
                              <rect width="14" height="14" x="8" y="8" rx="2" />
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                            </svg>
                            Copiar imagen {i + 1}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {p.errores.general && (
              <p
                role="alert"
                className="m-0 mt-2.5 text-[12.5px] text-[#D64545]"
              >
                {p.errores.general}
              </p>
            )}

            {p.fase === "listo" && p.escritorio ? (
              <>
                <button type="button" onClick={p.onDescargar} className={BOTON}>
                  {p.descargado
                    ? "✓ Descargadas · volver a descargar"
                    : "Descargar las 3 imágenes"}
                </button>
                <button type="button" onClick={p.onPdf} className={BOTON_SEC}>
                  Descargar PDF
                </button>
                {p.enlaceChat && <BotonChat href={p.enlaceChat} />}
                <div className="mt-3.5 flex items-center justify-center gap-5 text-[13px] font-bold">
                  <a
                    href={p.enlaceChatWeb ?? "https://web.whatsapp.com/"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ceinys-grafito-700)] hover:underline"
                  >
                    {p.enlaceChatWeb
                      ? "Abrir en WhatsApp Web"
                      : "Abrir WhatsApp Web"}
                  </a>
                  <button
                    type="button"
                    onClick={p.onEditar}
                    className="text-[var(--ceinys-grafito-700)] hover:underline"
                  >
                    Editar datos
                  </button>
                </div>
              </>
            ) : p.fase === "listo" ? (
              <>
                <button type="button" onClick={p.onCompartir} className={BOTON}>
                  Compartir por WhatsApp
                </button>
                {p.enlaceChat && <BotonChat href={p.enlaceChat} />}
                <div className="mt-3.5 flex items-center justify-center gap-5 text-[13px] font-bold">
                  <button
                    type="button"
                    onClick={p.onDescargar}
                    className="text-[var(--ceinys-grafito-700)] hover:underline"
                  >
                    Descargar
                  </button>
                  <button
                    type="button"
                    onClick={p.onPdf}
                    className="text-[var(--ceinys-grafito-700)] hover:underline"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={p.onEditar}
                    className="text-[var(--ceinys-grafito-700)] hover:underline"
                  >
                    Editar datos
                  </button>
                </div>
              </>
            ) : (
              <>
                <button type="button" onClick={p.onCerrar} className={BOTON}>
                  Cerrar
                </button>
                <button type="button" onClick={p.onPdf} className={BOTON_SEC}>
                  Descargar PDF
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
