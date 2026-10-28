import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Rol = "asesor" | "admin" | "superadmin";

export type Acceso = {
  usuarioId: string;
  correo: string;
  nombre: string;
  rol: Rol;
};

const esAdmin = (rol: string | undefined) =>
  rol === "admin" || rol === "superadmin";

/** Lee la sesión: usuario, perfil, nivel de verificación y si ya enlazó la app de códigos. */
async function leerSesion() {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol, activo, debe_cambiar_clave")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil?.activo || !esAdmin(perfil.rol)) {
    redirect("/admin/login?motivo=sin-permiso");
  }

  const { data: nivel } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: factores } = await supabase.auth.mfa.listFactors();

  return {
    supabase,
    user,
    perfil,
    segundoFactor: nivel?.currentLevel === "aal2",
    tieneApp: (factores?.totp?.length ?? 0) > 0,
  };
}

/**
 * Capa de acceso del panel: comprueba que haya sesión, que la cuenta sea de administrador activo y
 * que el segundo factor (app de códigos) esté verificado. Se llama al inicio de cada página y de
 * cada acción del panel; si falta algo, redirige.
 *
 * Una cuenta nueva (o con contraseña restablecida) debe cambiar su contraseña antes de entrar.
 * Aun así, quien manda es la base de datos: sus reglas (RLS) rechazan el cambio si la cuenta no es
 * de administrador o la sesión no tiene el segundo factor.
 */
export async function requerirAdmin(): Promise<Acceso> {
  const s = await leerSesion();

  if (s.perfil.debe_cambiar_clave) {
    // Con la app ya enlazada, primero se verifica el código y luego se cambia la contraseña.
    redirect(
      s.tieneApp && !s.segundoFactor
        ? "/admin/verificar"
        : "/admin/nueva-clave",
    );
  }
  if (!s.segundoFactor) redirect("/admin/verificar");

  return {
    usuarioId: s.user.id,
    correo: s.user.email ?? "",
    nombre: s.perfil.nombre,
    rol: s.perfil.rol as Rol,
  };
}

/** Como `requerirAdmin`, pero solo deja pasar al superadministrador. */
export async function requerirSuperadmin(): Promise<Acceso> {
  const acceso = await requerirAdmin();
  if (acceso.rol !== "superadmin") redirect("/admin");
  return acceso;
}

/**
 * Para la pantalla de cambio de contraseña obligatorio: cuenta de administrador activa y, si ya tiene
 * la app de códigos enlazada, con el código verificado.
 */
export async function requerirParaCambioDeClave() {
  const s = await leerSesion();
  if (s.tieneApp && !s.segundoFactor) redirect("/admin/verificar");
  return { supabase: s.supabase, usuarioId: s.user.id };
}
