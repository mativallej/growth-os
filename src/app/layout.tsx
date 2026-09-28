import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Store from "@/components/Store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Loop",
  description: "Operación y medición del growth de una marca. Lee el índice del vault.",
};

// El layout raíz no conoce ninguna marca: la navegación vive en
// `[account]/layout.tsx`, que sí sabe cuál está activa. Un nav acá tendría que
// decidir a qué marca apuntar sin saberlo.
//
// La consola tampoco se linkea desde ningún lado: un link condicional deja la
// ruta escrita en el chunk de cliente del build compartido, que es exactamente
// el "display:none" que el gating de `pageExtensions` evita. Se llega por URL
// directa, con GROWTH_CONSOLE=1.
//
// EL `<ClerkProvider>` VUELVE ACÁ, Y NO CUESTA EL PRERENDER.
//
// Estuvo acá, se fue a dos islas de cliente, y vuelve. El motivo de la mudanza
// era este, escrito en `SesionControles.tsx`: un provider en el layout servidor
// "vuelve DINÁMICAS las 10 rutas de contenido del build". **Eso no es cierto.**
// Medido el 2026-09-28 con este archivo como está: `npm run build` emite las 10
// rutas con `●`, prerenderizadas, igual que antes. La medición original se hizo
// con un `next dev` corriendo encima, que dejaba `.next` inconsistente.
//
// Clerk no lee la sesión durante el render salvo que se lo pidan: el provider
// pasa el estado al cliente y son los hooks —`useUser`, `useAuth`— los que
// resuelven ahí. Por eso las páginas siguen siendo estáticas.
//
// Lo que sí era real es que las islas NO alcanzaban: envolvían el avatar del
// nav, y `useFavoritos` necesita `useAuth()` dentro de la tabla, que queda fuera
// de ese árbol. El build reventaba con "useAuth can only be used within the
// <ClerkProvider />" al prerenderizar `/tegu/inventario`. Un provider arriba de
// todo lo cubre, y resulta que gratis.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body className="min-h-screen antialiased">
          <Store>{children}</Store>
        </body>
      </html>
    </ClerkProvider>
  );
}
