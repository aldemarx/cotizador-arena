"use client";

import { useActionState } from "react";
import { iniciarSesion, type ResultadoForm } from "@/app/admin/acciones";

const CAMPO =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-base text-[var(--text-primary)] outline-none focus:border-[var(--ceinys-grafito-500)]";
const ETIQUETA =
  "mb-1.5 block text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase";

export function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState<ResultadoForm, FormData>(
    iniciarSesion,
    null,
  );

  return (
    <form action={accion} className="space-y-4" noValidate>
      <div>
        <label htmlFor="correo" className={ETIQUETA}>
          Correo
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          autoComplete="username"
          required
          className={CAMPO}
        />
      </div>
      <div>
        <label htmlFor="clave" className={ETIQUETA}>
          Contraseña
        </label>
        <input
          id="clave"
          name="clave"
          type="password"
          autoComplete="current-password"
          required
          className={CAMPO}
        />
      </div>

      {estado?.error && (
        <p
          role="alert"
          className="m-0 rounded-xl bg-[#e11d48]/10 px-4 py-3 text-sm font-medium text-[#be123c]"
        >
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-xl bg-[var(--ceinys-grafito-700)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--ceinys-grafito-900)] disabled:opacity-60"
      >
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
