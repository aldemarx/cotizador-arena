import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { Splash } from "@/components/Splash";
import { nombreDeSesion } from "@/lib/asesor/sesion";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Arenas del Valle | Cotizador",
  description: "Comparador de cuotas: clásico, ascendente y descendente.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const usuario = await nombreDeSesion();
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col lg:flex-row" suppressHydrationWarning>
        <Splash />
        <SiteHeader usuario={usuario} />
        <div className="min-w-0 flex-1 pt-[var(--barra-h)] lg:pt-0">{children}</div>
      </body>
    </html>
  );
}
