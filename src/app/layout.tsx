import type { Metadata } from "next";
import { ClerkProvider, Show, SignInButton, UserButton } from "@clerk/nextjs";
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
// LOS CONTROLES DE SESIÓN SÍ VAN ACÁ, y no en el nav de marca: `/` también está
// protegida, así que tiene que haber de dónde cerrar sesión desde cualquier
// pantalla. `ClerkProvider` va DENTRO de `<body>`, no envolviendo `<html>`.
//
// `Show when="signed-out"` es defensa en profundidad y no la puerta: quien no tiene sesión no
// llega hasta acá, porque `src/proxy.ts` lo redirige antes de renderizar. Si
// alguna vez se ve ese botón, significa que el matcher del proxy dejó de cubrir
// esta ruta — y por eso está, para que eso se note en vez de servir la página.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <ClerkProvider>
          <div className="pointer-events-none fixed right-3 top-3 z-50 flex items-center gap-2">
            <div className="pointer-events-auto">
              <Show when="signed-in">
                <UserButton />
              </Show>
              <Show when="signed-out">
                <SignInButton>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-background px-2.5 py-1 text-[12px] font-medium hover:bg-muted"
                  >
                    Entrar
                  </button>
                </SignInButton>
              </Show>
            </div>
          </div>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
