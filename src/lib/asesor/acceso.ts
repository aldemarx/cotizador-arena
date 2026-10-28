import "server-only";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Asesor = { usuarioId: string; nombre: string };

/**
 * Compuerta del cotizador: exige sesión y una cuenta ACTIVA (cualquier rol). Sin sesión manda a
 * /login; con sesión pero cuenta pendiente o desactivada, a /login con el motivo. Se llama al inicio
 * de cada página que muestra precios; src/proxy.ts es solo una primera barrera.
 */
export async function requerirAsesor(): Promise<Asesor> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, activo")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil) redirect("/login?motivo=sin-perfil");
  if (!perfil.activo) redirect("/login?motivo=pendiente");

  return { usuarioId: user.id, nombre: perfil.nombre };
}
