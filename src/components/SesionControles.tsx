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

/**
 * Lo que se agrega al menú que abre el avatar, debajo de lo que trae Clerk.
 *
 * Acá va Configuración porque es donde se la busca: es una preferencia de quien
 * mira, no una vista de la marca, y en el nav competía con las siete vistas por
 * atención. Devuelve `null` cuando no hay nada que agregar — un
 * `<UserButton.MenuItems>` vacío dibuja un separador que no separa nada.
 */
function menu(configHref: string | null) {
  if (!configHref) return null;
  return (
    <UserButton.MenuItems>
      <UserButton.Link
        label="Configuración"
        href={configHref}
        labelIcon={
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-full">
            <circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8 1.4v1.8M8 12.8v1.8M14.6 8h-1.8M3.2 8H1.4M12.7 3.3l-1.3 1.3M4.6 11.4l-1.3 1.3M12.7 12.7l-1.3-1.3M4.6 4.6 3.3 3.3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    </UserButton.MenuItems>
  );
}

export default function SesionControles({
  conDatos = false,
  configHref = null,
}: {
  /** Muestra nombre y mail junto al avatar. En la raíz alcanza con el avatar. */
  conDatos?: boolean;
  /**
   * A dónde va "Configuración" en el menú del avatar, o `null` para no mostrarla.
   *
   * VIENE COMO PROP Y NO SE DECIDE ACÁ, por la misma razón por la que el acceso a
   * la consola se arma del lado del servidor: un `{hayConsola && <Link
   * href="/configuracion">}` deja esa ruta escrita en el bundle del navegador
   * aunque la condición sea falsa, y el gating de `pageExtensions` existe
   * justamente para que en un build compartido esa pantalla no exista. Si la
   * ruta llega como string desde el servidor, cuando está apagada no hay nada
   * que serializar.
   */
  configHref?: string | null;
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
            <UserButton>{menu(configHref)}</UserButton>
            <Identidad />
          </div>
        ) : (
          <UserButton>{menu(configHref)}</UserButton>
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
