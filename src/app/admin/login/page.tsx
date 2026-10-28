import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cerrarSesion } from "@/app/admin/acciones";
import { FormularioLogin } from "./FormularioLogin";

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Con sesión y permiso se entra directo; con sesión pero sin permiso se explica y se ofrece salir.
  if (user && motivo !== "sin-permiso") redirect("/admin");

  return (
    <div className="mx-auto mt-10 w-full max-w-sm">
      <div className="card p-6">
        <p className="m-0 text-xs font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase">
          Panel de administración
        </p>
        <h1 className="mt-2 mb-5 text-2xl font-extrabold text-[var(--text-primary)]">
          Iniciar sesión
        </h1>

        {user ? (
          <div role="alert" className="space-y-4">
            <p className="m-0 rounded-xl bg-[#F5A623]/15 px-4 py-3 text-sm font-medium text-[#b45309]">
              Tu cuenta no tiene permisos de administrador. Entra con otra
              cuenta o pide acceso al superadministrador.
            </p>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="w-full rounded-xl bg-[var(--ceinys-grafito-700)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--ceinys-grafito-900)]"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        ) : (
          <FormularioLogin />
        )}
      </div>
    </div>
  );
}
