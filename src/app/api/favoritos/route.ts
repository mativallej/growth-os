import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { configSupabase, headers, respuesta } from '@/lib/supabase';

/**
 * LOS FAVORITOS, Y EL NAVEGADOR NO TOCA SUPABASE.
 *
 * Antes el hook hablaba con PostgREST directo. Funcionaba y era seguro —la RLS
 * es la que decide, no la app— pero obligaba a que la URL y la clave publishable
 * del proyecto vivieran en el bundle de cliente. Eso es superficie: cualquiera
 * que abra la página sabe contra qué proyecto de Supabase corre y puede pegarle
 * a mano desde la consola. La RLS lo aguanta; que lo aguante no es motivo para
 * ofrecerlo.
 *
 * Ahora el navegador solo habla con este origen, y de las credenciales no se
 * entera. Las lecturas del índice ya estaban así: son componentes de servidor y
 * el dato llega renderizado, sin endpoint de por medio.
 *
 * ── LO QUE ACÁ NO SE HACE, Y ES LO MÁS IMPORTANTE ───────────────────────────
 *
 * ESTE ENDPOINT NO USA LA SECRET KEY. Usa la publishable más el JWT de la
 * persona, igual que haría el navegador. Es tentador hacerlo al revés —con la
 * secret, Supabase no discute nada— y sería un downgrade de seguridad disfrazado
 * de simplificación: la RLS dejaría de aplicar y la única barrera entre un
 * usuario y los favoritos de otro pasaría a ser el `if` de más abajo. Un bug en
 * ese `if` sería una fuga; con RLS, el mismo bug es un 403 de Postgres.
 *
 * Así quedan DOS gates independientes, y ninguno depende del otro:
 *
 *   1. El proxy exige sesión antes de que esta función se ejecute.
 *   2. La RLS exige que `user_id` sea el `sub` del JWT, ya adentro de la base.
 *
 * Y UNO QUE ANTES NO EXISTÍA: el `user_id` sale de la sesión del servidor, no
 * del cuerpo del request. Antes el cliente lo mandaba —la RLS lo rechazaba si
 * mentía, así que no era un agujero, pero era un dato del cliente igual—. Ahora
 * no hay forma de nombrar a otra persona: no se lee del body.
 */

// Nunca cacheado. Un favorito que alguien marcó hace diez segundos tiene que
// verse; y una respuesta cacheada de un endpoint por-usuario es la clase de
// cosa que termina mostrándole a alguien los datos de otro.
export const dynamic = 'force-dynamic';

const RECURSO = 'favoritos';

type Fila = { piece_id: string; user_id: string; user_label: string | null };

/** La config y la sesión, o la respuesta de error que corresponda. */
async function contexto() {
  const cfg = configSupabase();
  if (!cfg) {
    return {
      error: NextResponse.json(
        { error: 'Esta instalación no tiene Supabase configurado.' },
        { status: 503 },
      ),
    };
  }

  const { userId, getToken } = await auth();
  // El proxy ya exigió sesión, así que esto no debería pasar. Se chequea igual:
  // si algún día el matcher deja de cubrir `/api`, el síntoma tiene que ser un
  // 401 y no una escritura sin dueño.
  if (!userId) {
    return { error: NextResponse.json({ error: 'Sin sesión.' }, { status: 401 }) };
  }

  const token = await getToken();
  return { cfg, userId, token };
}

/**
 * Todos los favoritos de todo el mundo: la lista es compartida a propósito.
 *
 * Devuelve TAMBIÉN quién está preguntando, y no es un extra: el cliente necesita
 * separar los propios de los ajenos —la estrella llena contra el puntito de "lo
 * marcó alguien más"— y el único que sabe eso sin ambigüedad es el servidor.
 * Preguntárselo a Clerk otra vez desde el navegador sería una segunda fuente
 * para el mismo dato, con la posibilidad de que discrepen.
 */
export async function GET() {
  const c = await contexto();
  if (c.error) return c.error;

  const r = await fetch(
    `${c.cfg.url}/rest/v1/${RECURSO}?select=piece_id,user_id,user_label`,
    { headers: headers({ ...c.cfg, token: c.token }), cache: 'no-store' },
  );
  return NextResponse.json({
    yo: c.userId,
    filas: await respuesta<Fila[]>(r, 'favoritos'),
  });
}

/**
 * Marca una pieza. El `user_label` se resuelve ACÁ y no se recibe: si viniera del
 * cliente, cualquiera podría firmar un favorito con el nombre de otro, y la
 * estrella compartida dejaría de significar algo.
 */
export async function POST(req: Request) {
  const c = await contexto();
  if (c.error) return c.error;

  const body: unknown = await req.json().catch(() => null);
  const pieceId =
    body && typeof body === 'object' && typeof (body as { pieceId?: unknown }).pieceId === 'string'
      ? (body as { pieceId: string }).pieceId
      : null;
  if (!pieceId) {
    return NextResponse.json({ error: 'Falta `pieceId`.' }, { status: 400 });
  }

  const persona = await currentUser();
  const etiqueta =
    persona?.firstName?.trim() ||
    persona?.fullName?.trim() ||
    persona?.primaryEmailAddress?.emailAddress ||
    null;

  const r = await fetch(`${c.cfg.url}/rest/v1/${RECURSO}`, {
    method: 'POST',
    headers: headers(
      { ...c.cfg, token: c.token },
      {
        'Content-Type': 'application/json',
        // Marcar dos veces lo que ya está marcado no es un error: es un doble
        // click. Sin esto, PostgREST devuelve 409 por la PK y la estrella
        // parpadearía apagándose.
        Prefer: 'resolution=merge-duplicates',
      },
    ),
    body: JSON.stringify({ piece_id: pieceId, user_id: c.userId, user_label: etiqueta }),
  });
  // Por `respuesta()` y no por un mensaje armado acá: es el que sabe traducir un
  // PGRST205 a "falta aplicar las migraciones" y un 401 a "falta Third-Party
  // Auth". Escribir el error dos veces garantiza que uno de los dos quede peor.
  await respuesta(r, 'favoritos');
  return NextResponse.json({ ok: true });
}

/** Desmarca. El filtro por `user_id` es del servidor; la RLS lo exige igual. */
export async function DELETE(req: Request) {
  const c = await contexto();
  if (c.error) return c.error;

  const pieceId = new URL(req.url).searchParams.get('pieceId');
  if (!pieceId) {
    return NextResponse.json({ error: 'Falta `pieceId`.' }, { status: 400 });
  }

  const r = await fetch(
    `${c.cfg.url}/rest/v1/${RECURSO}` +
      `?piece_id=eq.${encodeURIComponent(pieceId)}` +
      `&user_id=eq.${encodeURIComponent(c.userId)}`,
    { method: 'DELETE', headers: headers({ ...c.cfg, token: c.token }) },
  );
  await respuesta(r, 'favoritos');
  return NextResponse.json({ ok: true });
}
