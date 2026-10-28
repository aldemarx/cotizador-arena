import type { Metadata } from "next";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cerrarSesionAsesor } from "./acciones";
import { FormularioAcceso } from "./FormularioAcceso";

export const metadata: Metadata = {
  title: "Acceso de asesores | Arenas del Valle",
  robots: { index: false, follow: false },
};

const MOTIVOS: Record<string, string> = {
  pendiente: "Tu cuenta está desactivada. Si crees que es un error, avisa a tu administrador.",
  "sin-perfil": "Tu cuenta no está habilitada como asesor. Pide acceso al administrador.",
};

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { motivo } = await searchParams;
  const mensaje = motivo ? MOTIVOS[motivo] : undefined;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(165deg,#ffffff_0%,#f6f9f3_50%,#e8f0e0_100%)]"
      />
      <main className="mx-auto flex min-h-[calc(100dvh-var(--barra-h))] w-full max-w-[30rem] flex-col justify-center px-4 py-8 lg:min-h-dvh lg:pt-[calc(var(--barra-h)+2rem)]">
        <div className="card overflow-hidden rounded-2xl shadow-[0_24px_60px_-28px_rgba(27,29,34,0.45)]">
          <div className="h-1.5 bg-[linear-gradient(90deg,#5f9b3c,#8db853_55%,#5f9b3c)]" />
          <div className="p-6 sm:p-9">
            <div className="mb-6 flex flex-col items-center text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos-arenas/logo-arenas.png" alt="Arenas del Valle" className="mb-4 block h-14 w-auto sm:h-16" />
              <p className="m-0 mb-3 flex items-center gap-3 text-[0.68rem] font-semibold tracking-[0.2em] whitespace-nowrap text-[#4c8030] uppercase">
                <span className="hidden h-px w-8 bg-[#5f9b3c]/50 min-[380px]:block" />
                Portal de asesores
                <span className="hidden h-px w-8 bg-[#5f9b3c]/50 min-[380px]:block" />
              </p>
              <h1 className="m-0 text-[clamp(1.05rem,4.7vw,1.5rem)] leading-tight tracking-tight whitespace-nowrap text-[var(--text-primary)]">
                <span className="font-normal">Bienvenido a</span> <span className="font-extrabold">Arenas del Valle</span>
              </h1>
              <p className="m-0 mt-2 text-sm text-[var(--text-muted)]">Ingresa para cotizar lotes y consultar el plano.</p>
            </div>

            {mensaje && user ? (
              <div role="alert" className="space-y-4">
                <p className="m-0 rounded-xl bg-[#F5A623]/15 px-4 py-3 text-sm font-medium text-[#b45309]">{mensaje}</p>
                <form action={cerrarSesionAsesor}>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[var(--ceinys-grafito-700)] px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ceinys-grafito-900)]"
                  >
                    Cerrar sesión
                  </button>
                </form>
              </div>
            ) : (
              <FormularioAcceso />
            )}
          </div>
        </div>
        <p className="m-0 mt-6 text-center text-xs leading-relaxed text-[var(--text-muted)]">
          ¿Problemas para ingresar? Escribe a{" "}
          <a href="mailto:adminti@ceinys.pe" className="font-semibold text-[var(--text-secondary)]">
            adminti@ceinys.pe
          </a>
          .
          <br />
          <span className="text-[var(--ceinys-grafito-500)]">© Ceinys · Arenas del Valle</span>
        </p>
      </main>
    </>
  );
}
