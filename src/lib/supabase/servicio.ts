import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la CLAVE SECRETA (se salta todas las reglas de acceso). Solo para código
 * de servidor que ya comprobó que quien lo invoca es superadministrador (crear cuentas, cambiar
 * contraseñas, restablecer el segundo factor). Nunca debe importarse desde un componente de cliente:
 * `server-only` hace que la compilación falle si alguien lo intenta.
 */
export function crearClienteServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) {
    throw new Error(
      "Falta SUPABASE_SECRET_KEY en las variables de entorno del servidor.",
    );
  }
  return createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
