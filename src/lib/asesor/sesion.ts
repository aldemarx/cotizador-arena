import "server-only";
import { cookies } from "next/headers";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/**
 * Nombre de la persona con sesión activa, para mostrarlo en la barra superior. Si no hay cookie de
 * sesión ni se consulta a Supabase (las visitas anónimas no pagan esa llamada). Solo es presentación:
 * el acceso de verdad se decide en `requerirAsesor` y en las reglas de la base.
 */
export async function nombreDeSesion(): Promise<string | null> {
  const almacen = await cookies();
  if (!almacen.getAll().some((c) => c.name.startsWith("sb-"))) return null;
  try {
    const supabase = await crearClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("nombre, activo")
      .eq("id", user.id)
      .maybeSingle();
    return perfil?.activo ? perfil.nombre : null;
  } catch {
    return null;
  }
}
