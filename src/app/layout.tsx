import type { Metadata } from "next";
import "./globals.css";
import DashboardNav from "@/components/DashboardNav";

export const metadata: Metadata = {
  title: "X Analytics · tegu-growth",
  description: "Dashboard de analytics del building-in-public de Tegu — lee Brand/Content, sin API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        {/* La consola NO se linkea desde acá a propósito: un link condicional deja
            la ruta escrita en el chunk del cliente del build compartido, que es
            exactamente el "display:none" que el gating evita. Va por URL directa
            (/operar) hasta que `account-scoped-routes` separe layout local de
            compartido y el link pueda ser estructural también. */}
        <DashboardNav />
        <main className="max-w-[1080px] px-6 py-9 md:ml-[220px] md:px-10">{children}</main>
      </body>
    </html>
  );
}
