import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Loop",
  description: "Operación y medición del growth de dos marcas. Lee los .md de los vaults, sin API.",
};

// El layout raíz no conoce ninguna marca: la navegación vive en
// `[account]/layout.tsx`, que sí sabe cuál está activa y qué otras entraron al
// build. Un nav acá tendría que decidir a qué marca apuntar sin saberlo.
//
// La consola tampoco se linkea desde ningún lado: un link condicional deja la
// ruta escrita en el chunk de cliente del build compartido, que es exactamente
// el "display:none" que el gating de `pageExtensions` evita. Se llega por URL
// directa a /operar, con GROWTH_CONSOLE=1.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
