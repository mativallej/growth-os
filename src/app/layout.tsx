import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Loop",
  description: "Operación y medición del growth de una marca. Lee los .md del vault, sin API.",
};

// El layout raíz no conoce ninguna marca: la navegación vive en
// `[account]/layout.tsx`, que sí sabe cuál está activa y qué otras entraron al
// build. Un nav acá tendría que decidir a qué marca apuntar sin saberlo.
//
// La consola tampoco se linkea desde ningún lado: un link condicional deja la
// ruta escrita en el chunk de cliente del build compartido, que es exactamente
// el "display:none" que el gating de `pageExtensions` evita. Se llega por URL
// directa a /operar, con GROWTH_CONSOLE=1.
//
// LOS CONTROLES DE SESIÓN NO VAN ACÁ. Estuvieron, como un overlay fijo arriba a
// la derecha, y era el lugar equivocado por dos motivos: se superponía al
// contenido, y un `<ClerkProvider>` en este layout —que es de servidor— vuelve
// dinámicas las 10 rutas del build, que es justo lo que sostiene el aislamiento
// entre marcas. Viven en el pie del nav (`DashboardNav`) y en el encabezado de la
// raíz (`page.tsx`), en los dos casos como isla de cliente.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
