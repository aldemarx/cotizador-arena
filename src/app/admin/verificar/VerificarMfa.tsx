"use client";

import { useState, useTransition } from "react";
import {
  cerrarSesion,
  iniciarActivacionMfa,
  verificarCodigo,
} from "@/app/admin/acciones";

const BOTON =
  "w-full rounded-xl bg-[var(--ceinys-grafito-700)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--ceinys-grafito-900)] disabled:opacity-60";

type Enlace = { factorId: string; qr: string; secreto: string };

/**
 * Si la cuenta ya tiene la app enlazada (`factorId`), pide el código. Si no, primero muestra el QR
 * para enlazarla con Google o Microsoft Authenticator y luego pide el primer código.
 */
export function VerificarMfa({ factorId }: { factorId: string | null }) {
  const [enlace, setEnlace] = useState<Enlace | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const idFactor = factorId ?? enlace?.factorId ?? null;

  function activar() {
    setError(null);
    iniciar(async () => {
      const r = await iniciarActivacionMfa();
      if ("error" in r) setError(r.error);
      else setEnlace(r);
    });
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!idFactor) return;
    setError(null);
    iniciar(async () => {
      const r = await verificarCodigo(idFactor, codigo);
      if (r?.error) setError(r.error); // si sale bien, la acción redirige al panel
    });
  }

  return (
    <div className="space-y-4">
      {!idFactor && (
        <>
          <p className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">
            Para entrar al panel hace falta una app de códigos (Google
            Authenticator, Microsoft Authenticator…). Se configura una sola vez.
          </p>
          <button
            type="button"
            onClick={activar}
            disabled={pendiente}
            className={BOTON}
          >
            {pendiente ? "Preparando…" : "Configurar app de códigos"}
          </button>
        </>
      )}

      {enlace && !factorId && (
        <div className="space-y-3">
          <p className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">
            1. Abre tu app y escanea este código QR.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enlace.qr}
            alt="Código QR para enlazar la app de códigos"
            className="mx-auto block h-44 w-44 rounded-xl border border-[var(--border)] bg-white p-2"
          />
          <p className="m-0 text-xs leading-relaxed text-[var(--text-muted)]">
            ¿No puedes escanearlo? Escribe esta clave en la app:
            <br />
            <span
              data-testid="clave-manual"
              className="font-mono text-[13px] font-semibold tracking-wider break-all text-[var(--text-primary)]"
            >
              {enlace.secreto}
            </span>
          </p>
          <p className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">
            2. Escribe el código de 6 dígitos que muestra la app.
          </p>
        </div>
      )}

      {idFactor && (
        <form onSubmit={enviar} className="space-y-3" noValidate>
          <label
            htmlFor="codigo"
            className="block text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase"
          >
            Código de 6 dígitos
          </label>
          <input
            id="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/[^\d\s]/g, ""))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-center text-2xl font-semibold tracking-[0.4em] text-[var(--text-primary)] outline-none focus:border-[var(--ceinys-grafito-500)]"
          />
          <button type="submit" disabled={pendiente} className={BOTON}>
            {pendiente ? "Verificando…" : "Verificar"}
          </button>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="m-0 rounded-xl bg-[#e11d48]/10 px-4 py-3 text-sm font-medium text-[#be123c]"
        >
          {error}
        </p>
      )}

      <form action={cerrarSesion}>
        <button
          type="submit"
          className="w-full text-center text-xs font-semibold text-[var(--text-muted)] underline-offset-2 hover:underline"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
