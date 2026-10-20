import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { Splash } from "@/components/Splash";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Simulador de precios y fraccionamiento",
  description: "Comparador de cuotas: clásico, ascendente y descendente.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col lg:flex-row" suppressHydrationWarning>
        <Splash />
        <SiteHeader />
        <div className="min-w-0 flex-1 pt-[var(--barra-h)] lg:pt-0">{children}</div>
      </body>
    </html>
  );
}
