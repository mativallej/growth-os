"use client";

import { Show, SignInButton, UserButton, useUser } from "@clerk/nextjs";

/**
 * Los controles de sesión: avatar, menú, y el botón de entrar.
 *
 * TUVO SU PROPIO `<ClerkProvider>`, Y YA NO. La isla existía para que el provider
 * no viviera en el layout raíz, porque ahí volvía dinámicas las 10 rutas y eso
 * costaba el prerender: el vault horneado en el build, y `dynamicParams = false`
 * sosteniendo el aislamiento entre marcas. D-17 sacó del medio a las dos —el
 * contenido viene de la API, y una instalación es una marca— así que el provider
 * volvió al raíz y acá quedaría anidado sin motivo.
 *
 * ESTO ES DECORACIÓN, EL GATE ES EL PROXY. `proxy.ts` corre antes de que salga la
 * respuesta; nadie sin sesión llega a ver este componente.
 *
 * `Show when="signed-out"` queda como defensa en profundidad: si alguna vez se ve
 * ese botón, significa que el matcher del proxy dejó de cubrir esa ruta, y es
 * mejor que eso se note.
 *
 * NO POSICIONA NADA. Lo ubica quien lo usa: el pie del nav en las vistas de
 * marca, y el encabezado en la raíz.
 */

/**
 * Nombre y mail al lado del avatar.
 *
 * Se leen de Clerk en el cliente. Mientras carga NO dibuja placeholders grises
 * del alto exacto: el bloque crece cuando llegan los datos, y un esqueleto que
 * ocupa el mismo lugar pero dice otra cosa es más molesto que un instante vacío.
 *
 * El mail puede faltar —se puede entrar por SSO sin mail verificado— y entonces
 * no se dibuja la línea, en vez de dejar un renglón en blanco.
 */
function Identidad() {
  const { user, isLoaded } = useUser();
  if (!isLoaded || !user) return null;

  const nombre = user.fullName?.trim() || user.firstName?.trim();
  const mail = user.primaryEmailAddress?.emailAddress;
  // Si no hay ninguno de los dos no hay nada que decir, y un bloque vacío al lado
  // del avatar se lee como algo roto.
  if (!nombre && !mail) return null;

  return (
    <div className="min-w-0 text-left leading-tight">
      {nombre && <div className="truncate text-[12px] font-medium">{nombre}</div>}
      {mail && (
        <div className="truncate text-[10px] text-muted-foreground/70" title={mail}>
          {mail}
        </div>
      )}
    </div>
  );
}

export default function SesionControles({
  conDatos = false,
}: {
  /** Muestra nombre y mail junto al avatar. En la raíz alcanza con el avatar. */
  conDatos?: boolean;
}) {
  return (
    <>
      <Show when="signed-in">
        {conDatos ? (
          // Un bloque, no dos elementos sueltos: el avatar y la identidad son la
          // misma respuesta a "quién está mirando esto". El menú lo sigue abriendo
          // el avatar —es el control de Clerk y trae su propia accesibilidad— así
          // que el contenedor NO es un <button>: anidar botones es HTML inválido
          // y rompe la navegación por teclado.
          <div className="flex w-full items-center gap-2 rounded-md border border-border px-2 py-1.5">
            <UserButton />
            <Identidad />
          </div>
        ) : (
          <UserButton />
        )}
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
    </>
  );
}
