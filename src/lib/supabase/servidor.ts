import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { COOKIE_TEMPORAL, opcionesSegunSesion } from "./sesion";

/**
 * Cliente de Supabase para componentes de servidor y acciones: trabaja con la sesión de la persona
 * (cookies), así las reglas de acceso de la base (RLS) se aplican a su cuenta y no a una clave de
 * servicio. Usa solo la clave publishable.
 */
export async function crearClienteServidor(opciones?: { temporal?: boolean }) {
  const almacen = await cookies();
  // «Recordarme» sin marcar: la sesión se escribe sin caducidad (se pierde al cerrar el navegador)
  const temporal =
    opciones?.temporal ?? almacen.get(COOKIE_TEMPORAL)?.value === "1";
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) =>
              almacen.set(name, value, opcionesSegunSesion(options, temporal)),
            );
          } catch {
            // En un componente de servidor no se pueden escribir cookies; el proxy ya renueva la sesión.
          }
        },
      },
    },
  );
}
