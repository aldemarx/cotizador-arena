"use client";

import { useActionState, useState } from "react";
import { iniciarSesionAsesor, type ResultadoAcceso } from "./acciones";

const ETIQUETA =
  "mb-1.5 block text-[0.7rem] font-semibold tracking-[0.12em] text-[var(--text-muted)] uppercase";
const CAMPO =
  "peer w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-3 pr-4 pl-11 text-base text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--ceinys-grafito-300)] hover:border-[var(--ceinys-grafito-500)] focus:border-[#5f9b3c] focus:ring-4 focus:ring-[#5f9b3c]/15";

/* Íconos de trazo (misma familia visual que el resto del sitio: línea fina, esquinas redondeadas) */
function Icono({ children, className = "h-[1.15rem] w-[1.15rem]" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

const IconoCorreo = () => (
  <Icono>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.5 7.5 7.6 5.4a1.6 1.6 0 0 0 1.8 0l7.6-5.4" />
  </Icono>
);
const IconoClave = () => (
  <Icono>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Icono>
);
const IconoOjo = ({ cerrado }: { cerrado: boolean }) =>
  cerrado ? (
    <Icono>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.8A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.7M6.2 7.6A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.7-.3 3.8-.8" />
      <path d="M10 10a2.8 2.8 0 0 0 4 4" />
    </Icono>
  ) : (
    <Icono>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </Icono>
  );

function Campo({
  id,
  nombre,
  etiqueta,
  icono,
  tipo,
  autoComplete,
  placeholder,
}: {
  id: string;
  nombre: string;
  etiqueta: string;
  icono: React.ReactNode;
  tipo: "email" | "password";
  autoComplete: string;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  const esClave = tipo === "password";
  return (
    <div>
      <label htmlFor={id} className={ETIQUETA}>
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          name={nombre}
          type={esClave && visible ? "text" : tipo}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          className={`${CAMPO} ${esClave ? "pr-12" : ""}`}
        />
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--ceinys-grafito-500)] transition-colors peer-focus:text-[#4c8030]">
          {icono}
        </span>
        {esClave && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--ceinys-grafito-500)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            <IconoOjo cerrado={visible} />
          </button>
        )}
      </div>
    </div>
  );
}

export function FormularioAcceso() {
  const [estado, accion, pendiente] = useActionState<ResultadoAcceso, FormData>(iniciarSesionAsesor, null);
  return (
    <form action={accion} noValidate>
      <div className="space-y-4">
        <Campo
          id="correo"
          nombre="correo"
          etiqueta="Correo"
          icono={<IconoCorreo />}
          tipo="email"
          autoComplete="username"
          placeholder="nombre@correo.com"
        />
        <Campo
          id="clave"
          nombre="clave"
          etiqueta="Contraseña"
          icono={<IconoClave />}
          tipo="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
        />
        <label className="mx-auto flex w-fit cursor-pointer items-center gap-2.5 text-sm text-[var(--text-secondary)] select-none">
          <span className="relative flex h-[1.15rem] w-[1.15rem] shrink-0 items-center justify-center">
            <input
              type="checkbox"
              name="recordarme"
              className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-md border border-[var(--ceinys-grafito-300)] bg-white transition-colors checked:border-[#5f9b3c] checked:bg-[#5f9b3c] hover:border-[var(--ceinys-grafito-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5f9b3c]"
            />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="pointer-events-none relative h-3 w-3 scale-50 opacity-0 transition-all peer-checked:scale-100 peer-checked:opacity-100"
            >
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </span>
          Recordarme en este equipo
        </label>
      </div>

      {/* Un solo lugar para el mensaje o el aviso legal: la tarjeta no cambia de tamaño al fallar un ingreso. */}
      <div className="mt-6 grid">
        <div
          aria-hidden={Boolean(estado?.error)}
          className={`col-start-1 row-start-1 flex items-start gap-3 rounded-xl bg-[var(--surface-2)] px-4 py-3.5 ${estado?.error ? "invisible" : ""}`}
        >
          <span className="mt-0.5 shrink-0 text-[#4c8030]">
            <Icono className="h-5 w-5">
              <path d="M12 3.2 5 6v5.6c0 4.3 2.9 7.4 7 9.2 4.1-1.8 7-4.9 7-9.2V6l-7-2.8Z" />
              <path d="m9.2 12 2.1 2.1 3.6-3.9" />
            </Icono>
          </span>
          <p className="m-0 text-xs leading-relaxed text-[var(--text-muted)]">
            Acceso exclusivo para asesores autorizados. La información de precios y disponibilidad es confidencial y de uso
            estrictamente del personal.
          </p>
        </div>
        {estado?.error && (
          <p
            role="alert"
            className="col-start-1 row-start-1 m-0 self-center rounded-xl border border-[#e11d48]/20 bg-[#e11d48]/[0.08] px-4 py-3 text-sm font-medium text-[#be123c]"
          >
            {estado.error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pendiente}
        className="group mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#4c8030] bg-[#5f9b3c] px-4 py-3.5 text-base font-bold tracking-wide text-white transition-colors hover:bg-[#528a33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5f9b3c] active:translate-y-px disabled:opacity-60"
      >
        {pendiente ? (
          <>
            <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Entrando…
          </>
        ) : (
          <>
            Entrar
            <Icono className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </Icono>
          </>
        )}
      </button>
    </form>
  );
}
