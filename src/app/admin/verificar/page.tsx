import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { VerificarMfa } from "./VerificarMfa";

/** Segundo paso: introducir el código de la app (o enlazar la app la primera vez). */
export default async function PaginaVerificar() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("activo, rol")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil?.activo || !["admin", "superadmin"].includes(perfil.rol))
    redirect("/admin/login?motivo=sin-permiso");

  const { data: nivel } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (nivel?.currentLevel === "aal2") redirect("/admin");

  const { data: factores } = await supabase.auth.mfa.listFactors();
  const verificado = factores?.totp?.[0] ?? null; // solo trae los ya verificados

  return (
    <div className="mx-auto mt-10 w-full max-w-sm">
      <div className="card p-6">
        <p className="m-0 text-xs font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase">
          Verificación en dos pasos
        </p>
        <h1 className="mt-2 mb-5 text-2xl font-extrabold text-[var(--text-primary)]">
          {verificado ? "Escribe tu código" : "Activa tu app de códigos"}
        </h1>
        <VerificarMfa factorId={verificado?.id ?? null} />
      </div>
    </div>
  );
}
