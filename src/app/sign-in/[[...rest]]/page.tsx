"use client";

import { ClerkProvider, SignIn } from "@clerk/nextjs";

/**
 * La pantalla de entrar, DENTRO de la app.
 *
 * Sin esto Clerk manda a su Account Portal —`<algo>.accounts.dev`— y la sesión se
 * abre en un dominio que no es el de la app. Funciona, pero pedirle a alguien que
 * ponga su mail en un dominio que no reconoce es exactamente la forma de un
 * phishing, así que el login vive acá.
 *
 * Es una ruta catch-all (`[[...rest]]`) porque Clerk usa subrutas para los pasos
 * del flujo: verificación por mail, factor doble, SSO. Sin el catch-all el primer
 * paso anda y el segundo da 404.
 *
 * ES PÚBLICA, y está declarada así en `src/proxy.ts`. Si exigiera sesión, pediría
 * la sesión que sirve para conseguir.
 *
 * El `ClerkProvider` va acá y no en el layout raíz por el mismo motivo que en
 * `SesionControles`: en el layout servidor vuelve dinámicas las diez rutas del
 * build, y el prerender es lo que sostiene el aislamiento entre marcas.
 */
export default function SignInPage() {
  return (
    <ClerkProvider>
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <SignIn />
      </main>
    </ClerkProvider>
  );
}
