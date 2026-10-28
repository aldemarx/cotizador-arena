import { requerirParaCambioDeClave } from "@/lib/admin/acceso";
import { FormularioNuevaClave } from "./FormularioNuevaClave";

/** Primer ingreso (o contraseña restablecida): hay que elegir una contraseña propia. */
export default async function PaginaNuevaClave() {
  await requerirParaCambioDeClave();

  return (
    <div className="mx-auto mt-10 w-full max-w-sm">
      <div className="card p-6">
        <p className="m-0 text-xs font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase">
          Primer ingreso
        </p>
        <h1 className="mt-2 mb-2 text-2xl font-extrabold text-[var(--text-primary)]">
          Elige tu contraseña
        </h1>
        <p className="mt-0 mb-5 text-sm leading-relaxed text-[var(--text-secondary)]">
          La contraseña temporal solo sirve para entrar esta vez. Crea una
          propia de al menos 12 caracteres, con letras y números.
        </p>
        <FormularioNuevaClave />
      </div>
    </div>
  );
}
