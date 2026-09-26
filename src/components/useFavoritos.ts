"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Favoritos, guardados en el navegador de quien los marca.
 *
 * SON PERSONALES Y LOCALES, y eso es una decisión, no una limitación de la que
 * disculparse. Un favorito es "esto lo quiero tener a mano", no un dato de la
 * marca: no vive en el vault porque no es contenido, y no vive en un servidor
 * porque entonces los favoritos de un externo estarían en la misma tabla que los
 * míos. `localStorage` los deja donde pertenecen.
 *
 * Lo que eso implica, dicho de frente: no se sincronizan entre dispositivos, no
 * los ve nadie más, y se van si se limpian los datos del sitio.
 *
 * LA CLAVE VA POR CUENTA. Sin eso, los favoritos de una marca aparecerían
 * marcados en otra al cambiar de deploy sobre el mismo dominio, y un favorito que
 * apunta a una pieza que en esta marca no existe es un fantasma imposible de
 * desmarcar.
 *
 * Y LO QUE SE GUARDA ES LA LLAVE DEL FOOTER, no el slug: mover un .md de carpeta
 * le cambia el slug, y un favorito guardado por slug se perdería sin avisar.
 *
 * VA CON `useSyncExternalStore` Y NO CON `useState` + `useEffect`. La versión con
 * efecto —leer localStorage y llamar a setState— es la que uno escribe primero, y
 * el React Compiler la rechaza: un setState sincrónico dentro de un efecto
 * dispara un segundo render en cascada en cada montaje. Esta es la API que React
 * tiene justo para leer estado que vive afuera de React, y encima resuelve el
 * render del servidor (donde no hay localStorage) con un snapshot propio.
 */

const PREFIJO = "growth-loop:favoritos:";

// Los oyentes de esta pestaña. El evento `storage` del navegador solo avisa a las
// OTRAS pestañas, así que un cambio propio hay que anunciarlo a mano.
const oyentes = new Set<() => void>();

function avisar(): void {
  for (const cb of oyentes) cb();
}

function suscribir(cb: () => void): () => void {
  oyentes.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    oyentes.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * El valor CRUDO, y a propósito.
 *
 * `useSyncExternalStore` compara el snapshot con `===` para decidir si hay que
 * re-renderizar. Un string se compara por valor, así que sirve; un `Set` nuevo en
 * cada lectura sería siempre distinto y haría un bucle de renders infinito.
 */
function crudo(clave: string): string | null {
  // Envuelto porque en ventana privada, con los datos del sitio bloqueados o
  // durante una captura de miniatura, el acceso puede TIRAR en vez de dar vacío.
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function parsear(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    // Si lo guardado no es una lista de strings se descarta en vez de romper la
    // vista: es caché personal, no un dato que valga la pena rescatar.
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useFavoritos(account: string) {
  const clave = `${PREFIJO}${account}`;

  const raw = useSyncExternalStore(
    suscribir,
    () => crudo(clave),
    // En el servidor no hay localStorage. Devolver `null` hace que el HTML se
    // genere sin favoritos y que el cliente los aplique al hidratar.
    () => null,
  );

  const favoritos = useMemo(() => new Set(parsear(raw)), [raw]);

  const alternar = useCallback(
    (llave: string) => {
      // Se relee del storage en vez de partir del Set en memoria: si otra pestaña
      // marcó algo, partir del estado viejo lo borraría al escribir.
      const ahora = new Set(parsear(crudo(clave)));
      if (!ahora.delete(llave)) ahora.add(llave);
      try {
        window.localStorage.setItem(clave, JSON.stringify([...ahora]));
      } catch {
        // Si no se puede escribir, el click no persiste. Prefiero eso —y que se
        // note al recargar— a tragarme el estado en memoria y fingir que guardó.
      }
      avisar();
    },
    [clave],
  );

  return { favoritos, alternar };
}
