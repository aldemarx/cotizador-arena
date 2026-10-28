"use client";

import { useActionState } from "react";
import {
  cambiarClave,
  type ResultadoClave,
} from "@/app/admin/nueva-clave/acciones";

const CAMPO =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-base text-[var(--text-primary)] outline-none focus:border-[var(--ceinys-grafito-500)]";
const ETIQUETA =
  "mb-1.5 block text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase";

export function FormularioNuevaClave() {
  const [estado, accion, pendiente] = useActionState<ResultadoClave, FormData>(
    cambiarClave,
    null,
  );

  return (
    <form action={accion} className="space-y-4" noValidate>
      <div>
        <label htmlFor="nueva" className={ETIQUETA}>
          Nueva contraseña
        </label>
        <input
          id="nueva"
          name="nueva"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={CAMPO}
        />
      </div>
      <div>
        <label htmlFor="repetir" className={ETIQUETA}>
          Repite la contraseña
        </label>
        <input
          id="repetir"
          name="repetir"
          type="password"
          autoComplete="new-password"
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
        {pendiente ? "Guardando…" : "Guardar y continuar"}
      </button>
    </form>
  );
}
