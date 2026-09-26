"use client";

import { ClerkProvider, SignUp } from "@clerk/nextjs";

/**
 * La pantalla de registrarse. Ver el comentario de `sign-in` — mismas razones.
 *
 * OJO CON QUÉ HACE ESTA PÁGINA EXISTIR: que la ruta esté acá no significa que
 * cualquiera pueda registrarse. Eso lo decide el modo de sign-up de Clerk
 * (Restricted + allowlist), y está apagado a propósito. Con esa configuración,
 * esta pantalla le dice a quien no está en la lista que no puede entrar, en vez
 * de dejarlo crear una cuenta y descubrirlo después.
 */
export default function SignUpPage() {
  return (
    <ClerkProvider>
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <SignUp />
      </main>
    </ClerkProvider>
  );
}
