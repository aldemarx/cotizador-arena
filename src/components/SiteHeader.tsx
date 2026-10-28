"use client";

import { usePathname } from "next/navigation";
import { cerrarSesionAsesor } from "@/app/login/acciones";
import { cerrarSesion } from "@/app/admin/acciones";

/** Barra superior fija (56 px): enmarca la pantalla como plataforma oficial de CEINYS. */
export function SiteHeader({ usuario }: { usuario?: string | null }) {
  const ruta = usePathname();
  // La persona con sesión y el botón de salir se ven en todas las pantallas, salvo en las de acceso.
  const mostrarUsuario = Boolean(usuario) && !["/login", "/admin/login", "/admin/verificar"].includes(ruta);
  const accionSalir = ruta.startsWith("/admin") ? cerrarSesion : cerrarSesionAsesor;
  return (
    <header
      id="barra-superior"
      className="fixed inset-x-0 top-0 z-30 h-[var(--barra-h)] border-b border-[var(--ceinys-grafito-200)] bg-white"
    >
      <div className="mx-auto grid h-full w-full max-w-[88rem] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3 justify-self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-ceinys-horizontal.png"
            alt="CEINYS Constructora e Inmobiliaria"
            className="block h-[calc(var(--barra-h)*0.5)] w-auto -translate-y-[3px]"
          />
        </div>

        <p className="m-0 hidden items-center gap-3 text-[length:clamp(0.625rem,0.55vw,0.75rem)] font-semibold tracking-[0.18em] whitespace-nowrap text-[var(--text-muted)] uppercase sm:flex">
          Plataforma Comercial
          <span
            aria-hidden
            className="h-4 w-px bg-[var(--ceinys-grafito-300)]"
          />
          <span className="text-[var(--text-primary)]">Arenas del Valle</span>
        </p>

        {mostrarUsuario ? (
          <form action={accionSalir} className="col-start-3 m-0 flex min-w-0 items-center gap-2.5 justify-self-end">
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5f9b3c]/15 text-xs font-bold text-[#4c8030] uppercase"
            >
              {usuario!.trim().charAt(0)}
            </span>
            <span
              title={usuario!}
              className="hidden max-w-[11rem] truncate text-[length:clamp(0.6875rem,0.6vw,0.8125rem)] font-semibold text-[var(--text-primary)] sm:block"
            >
              {usuario}
            </span>
            <span aria-hidden className="hidden h-4 w-px bg-[var(--ceinys-grafito-300)] sm:block" />
            <button
              type="submit"
              title="Cerrar sesión"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[length:clamp(0.6875rem,0.6vw,0.8125rem)] font-semibold whitespace-nowrap text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[#5f9b3c]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path d="M9 4.5H6.5A2 2 0 0 0 4.5 6.5v11a2 2 0 0 0 2 2H9" />
                <path d="M14 8l4 4-4 4M18 12H9.5" />
              </svg>
              <span className="hidden sm:inline">Cerrar sesión</span>
              <span className="sr-only sm:hidden">Cerrar sesión</span>
            </button>
          </form>
        ) : (
          <p className="m-0 flex items-center gap-2 justify-self-end text-[length:clamp(0.6875rem,0.6vw,0.8125rem)] font-medium tracking-wide whitespace-nowrap text-[var(--text-secondary)] col-start-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10b981]" />
          </span>
          Sistema en vivo
        </p>
        )}
      </div>
    </header>
  );
}
