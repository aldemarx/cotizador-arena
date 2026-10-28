"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_TEMPORAL } from "@/lib/supabase/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type ResultadoAcceso = { error?: string } | null;

/** Inicio de sesión del asesor (las mismas cuentas de Altos de Sacta); el mensaje de error es genérico a propósito. */
export async function iniciarSesionAsesor(
  _previo: ResultadoAcceso,
  formData: FormData,
): Promise<ResultadoAcceso> {
  const correo = String(formData.get("correo") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");
  if (!correo || !clave) return { error: "Escribe tu correo y tu contraseña." };

  // «Recordarme»: marcado = la sesión dura (cookies con caducidad); sin marcar = se cierra al cerrar el navegador
  const recordar = formData.get("recordarme") === "on";
  const supabase = await crearClienteServidor({ temporal: !recordar });
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: clave,
  });
  if (error) return { error: "Correo o contraseña incorrectos." };
  const almacen = await cookies();
  if (recordar) almacen.delete(COOKIE_TEMPORAL);
  else
    almacen.set(COOKIE_TEMPORAL, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  redirect("/"); // la página comprueba si la cuenta es de un asesor activo
}

export async function cerrarSesionAsesor() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
