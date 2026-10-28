import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_TEMPORAL, opcionesSegunSesion } from "@/lib/supabase/sesion";

/**
 * Renueva la sesión de Supabase y manda a iniciar sesión a quien no la tiene. Es solo una comprobación rápida: la autorización de
 * verdad (cuenta de asesor activa) se vuelve a verificar en cada página con `requerirAsesor` (src/lib/asesor/acceso.ts).
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });
  const temporal = request.cookies.get(COOKIE_TEMPORAL)?.value === "1";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, opcionesSegunSesion(options, temporal)),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // El cotizador (/ y /mapa) exige sesión de asesor; el panel, la del login de administración.
    const ruta = request.nextUrl.pathname;
    if (ruta.startsWith("/admin")) {
      if (ruta === "/admin/login") return respuesta;
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return respuesta;
}

// /login queda fuera a propósito: es la pantalla de acceso de asesores (la de administradores es /admin/login).
export const config = {
  matcher: ["/", "/mapa", "/admin/:path*"],
};
