// EL CLIENTE DE SUPABASE, Y ES `fetch` PELADO.
//
// Sin `@supabase/supabase-js`, por el mismo argumento con el que D-15 eligió
// `urllib.request` sobre un SDK para hablar con Notion: PostgREST es REST plano
// y lo que necesitamos son tres verbos. Un SDK acá agrega superficie, peso al
// bundle del cliente y una capa más donde un error puede quedar tragado.
//
// UNA INSTALACIÓN, UNA BASE (D-17). No hay resolución por marca: el deploy de
// una marca lleva la URL y la clave de SU proyecto, y las de otra no existen en
// ese bundle. Eso es lo que reemplazó al aislamiento del build.

/** La URL y la clave pública, o `null` si esta instalación no tiene base. */
export function configSupabase(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Las dos o ninguna. Una sola es una config a medias, y adivinar la otra
  // llevaría a un 401 sin explicación en runtime.
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

export type Credenciales = {
  url: string;
  key: string;
  /** El JWT de Clerk. `null` = sin sesión, y entonces RLS no devuelve nada. */
  token: string | null;
};

/**
 * Los headers de PostgREST.
 *
 * `apikey` identifica al proyecto; `Authorization` identifica a la PERSONA. Con
 * la clave publishable en los dos lugares, Supabase te trata como `anon` — y
 * ninguna de nuestras policies le da nada a `anon`, a propósito: esa clave viaja
 * al navegador de cualquiera que abra la página.
 *
 * El JWT lo emite Clerk y Supabase lo acepta por la integración de Third-Party
 * Auth. Si esa integración no está configurada, el token llega pero Supabase no
 * lo reconoce y el usuario queda como `anon`: el síntoma es "estoy logueado y no
 * veo nada", y por eso `respuesta()` lo nombra en el error en vez de devolver
 * una lista vacía.
 */
export function headers(c: Credenciales, extra: Record<string, string> = {}): HeadersInit {
  return {
    apikey: c.key,
    Authorization: `Bearer ${c.token ?? c.key}`,
    ...extra,
  };
}

/**
 * Lee la respuesta, y FALLA RUIDOSO.
 *
 * Un `catch` que devuelve `[]` convierte un problema de credenciales en "no hay
 * datos", que es exactamente el cero que parece información — la regla dura 1 de
 * este repo, con otro destino.
 */
export async function respuesta<T>(r: Response, que: string): Promise<T> {
  if (r.ok) return (await r.json()) as T;

  const cuerpo = await r.text().catch(() => '');
  if (r.status === 401 || r.status === 403) {
    throw new Error(
      `Supabase rechazó la sesión al leer ${que} (HTTP ${r.status}). ` +
        'Suele ser que Third-Party Auth con Clerk no está configurado en el ' +
        'proyecto: el JWT llega pero Supabase no lo reconoce, y las policies ' +
        `no le dan nada a \`anon\`. ${cuerpo.slice(0, 200)}`,
    );
  }
  throw new Error(`Supabase devolvió HTTP ${r.status} al leer ${que}. ${cuerpo.slice(0, 200)}`);
}
