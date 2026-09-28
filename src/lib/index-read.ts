import 'server-only';
import { auth } from '@clerk/nextjs/server';
import type { Piece, Snapshot } from './types';
import type { Creative } from './ads';
import type { Formula } from './formulas';
import type { Channel, Coverage, Status } from './normalize';
import type { Distribucion } from './footer';
import { configSupabase, headers, respuesta } from './supabase';
import { listSources } from './sources';

/**
 * El índice, leído por la API, con LA FORMA EXACTA que el parser devolvía.
 *
 * Esa es toda la idea: `metrics.ts`, `rollups.ts`, `cadencia.ts`, `viralidad.ts`,
 * `variantes.ts` y las ocho vistas son puros sobre `Piece[]` y no saben de dónde
 * salió. Si lo que vuelve de acá tiene la misma forma, nada de eso se toca — y
 * son ~2.000 líneas con sus tests, que siguen probando lo mismo.
 *
 * SOLO SERVIDOR. `server-only` lo hace un error de build y no de runtime: lo que
 * está acá adentro es `auth()` de Clerk y una lectura completa del vault, y
 * ninguna de las dos tiene por qué viajar al navegador.
 */

/** Lo que PostgREST devuelve por fila, con los embeds pedidos. */
type FilaPieza = {
  id: string;
  title: string;
  rel_path: string;
  slug: string;
  tldr: string | null;
  body: string | null;
  canal: string | null;
  cuenta: string | null;
  formato: string | null;
  formula: string | null;
  estado: string | null;
  date_raw: string | null;
  url: string | null;
  drive_url: string | null;
  tags: string | null;
  note: string | null;
  channel: string;
  channel_derived: boolean;
  status: string;
  published_at: string | null;
  formula_code: string | null;
  coverage: string;
  verdict: string | null;
  why: string | null;
  lesson: string | null;
  drivers: string[] | null;
  unknown_keys: string[] | null;
  distribuciones: {
    cuenta: string;
    url: string | null;
    date: string | null;
    ord: number;
  }[];
  snapshots: {
    t: string;
    date: string | null;
    account: string | null;
    ord: number;
    impressions: number | null;
    engagements: number | null;
    detail_expands: number | null;
    profile_visits: number | null;
    likes: number | null;
    reposts: number | null;
    replies: number | null;
    bookmarks: number | null;
    shares: number | null;
    follows: number | null;
    media_views: number | null;
    views: number | null;
    reach: number | null;
    non_followers: number | null;
  }[];
};

/** El sello de frescura: sin esto un índice viejo se ve igual que uno de hoy. */
export type Sello = {
  finishedAt: string;
  piecesCount: number;
  piecesWithoutId: number;
  duplicateIds: { id: string; paths: string[] }[];
  unreadable: { path: string; reason: string }[];
  vaultSha: string | null;
};

const u = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
/** `''` no es un valor: el payload ya mandó null, pero PostgREST puede traer ''. */
const s = (v: string | null): string | undefined => (v && v.trim() ? v : undefined);

/**
 * Pide una tabla ENTERA, y revienta si el servidor recortó.
 *
 * PostgREST tiene un tope de filas por respuesta (`db-max-rows`, y los proyectos
 * de Supabase traen uno). Cuando lo aplica NO es un error: devuelve 200 con las
 * primeras N filas y un `Content-Range: 0-999/1234`. Un cliente que ignora ese
 * header muestra 1.000 piezas de 1.234 y todo parece normal — el dashboard diría
 * que se publicaron menos piezas de las que se publicaron, que es exactamente la
 * clase de número que este proyecto existe para no inventar.
 *
 * Con `count=exact` el total viene siempre, así que se puede comparar. Hoy son
 * 126 piezas y no hay tope que tocar; el día que lo haya, se entera acá.
 */
async function todas<T>(recurso: string, select: string, orden: string): Promise<T[]> {
  const cfg = configSupabase();
  if (!cfg) {
    throw new Error(
      'Falta la config de Supabase: NEXT_PUBLIC_SUPABASE_URL y ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Sin índice no hay dashboard (D-17).',
    );
  }

  // El JWT de la persona, no la clave pública: las policies del índice le dan
  // SELECT a `authenticated` y nada a `anon`.
  const { getToken } = await auth();
  const token = await getToken();

  const url = `${cfg.url}/rest/v1/${recurso}?select=${encodeURIComponent(select)}&order=${encodeURIComponent(orden)}`;
  const r = await fetch(url, {
    headers: headers({ ...cfg, token }, { Prefer: 'count=exact' }),
    // El índice se reconstruye con un merge al vault, no con cada request, pero
    // cachearlo acá haría que un rebuild no se viera hasta el próximo deploy.
    cache: 'no-store',
  });
  const filas = await respuesta<T[]>(r, recurso);

  const rango = r.headers.get('content-range'); // `0-125/126`
  const total = rango?.split('/')[1];
  if (total && total !== '*' && Number(total) !== filas.length) {
    throw new Error(
      `El índice devolvió ${filas.length} de ${total} filas de \`${recurso}\`: el ` +
        'servidor recortó la respuesta (db-max-rows). Mostrar las que llegaron ' +
        'sería inventar un número más chico que el real.',
    );
  }
  return filas;
}

const SELECT_PIEZAS =
  '*,distribuciones(cuenta,url,date,ord),snapshots(t,date,account,ord,impressions,' +
  'engagements,detail_expands,profile_visits,likes,reposts,replies,bookmarks,shares,' +
  'follows,media_views,views,reach,non_followers)';

export async function leerPiezas(): Promise<Piece[]> {
  const filas = await todas<FilaPieza>('pieces', SELECT_PIEZAS, 'rel_path.asc');
  // UNA INSTALACIÓN, UNA MARCA (D-17). `source` es lo único de `Piece` que no
  // vive en el índice, porque no hace falta guardarlo: la base ES de esta marca.
  const marca = listSources()[0]?.id ?? 'desconocida';

  return filas.map((f) => ({
    title: f.title,
    relPath: f.rel_path,
    slug: f.slug,
    source: marca,
    tldr: f.tldr ?? '',
    body: f.body ?? '',
    id: f.id,
    canal: s(f.canal),
    cuenta: s(f.cuenta),
    formato: s(f.formato),
    formula: s(f.formula),
    estado: s(f.estado),
    date: s(f.date_raw),
    url: s(f.url),
    driveUrl: s(f.drive_url),
    distribucion: f.distribuciones.length
      ? [...f.distribuciones]
          .sort((a, b) => a.ord - b.ord)
          .map<Distribucion>((d) => ({ cuenta: d.cuenta, url: u(d.url), date: u(d.date) }))
      : undefined,
    tags: s(f.tags),
    note: s(f.note),
    channel: f.channel as Channel,
    channelDerived: f.channel_derived,
    status: f.status as Status,
    publishedAt: u(f.published_at),
    formulaCode: s(f.formula_code),
    coverage: f.coverage as Coverage,
    verdict: s(f.verdict),
    drivers: f.drivers?.length ? f.drivers : undefined,
    why: s(f.why),
    lesson: s(f.lesson),
    unknownKeys: f.unknown_keys ?? [],
    // El orden del archivo, que es lo que hace comparable un `+24h` con el
    // siguiente. PostgREST no ordena los embeds solo.
    snapshots: [...f.snapshots]
      .sort((a, b) => a.ord - b.ord)
      .map<Snapshot>((x) => ({
        t: x.t,
        date: u(x.date),
        account: u(x.account),
        impressions: u(x.impressions),
        engagements: u(x.engagements),
        detailExpands: u(x.detail_expands),
        profileVisits: u(x.profile_visits),
        likes: u(x.likes),
        reposts: u(x.reposts),
        replies: u(x.replies),
        bookmarks: u(x.bookmarks),
        shares: u(x.shares),
        follows: u(x.follows),
        mediaViews: u(x.media_views),
        views: u(x.views),
        reach: u(x.reach),
        nonFollowers: u(x.non_followers),
      })),
  }));
}

type FilaCreativo = {
  rel_path: string;
  title: string;
  slug: string;
  persona: string | null;
  publico: string | null;
  dolor: string | null;
  formato: string | null;
  angulo: string | null;
  angulo_raw: string | null;
  ronda: string | null;
  cta: string | null;
  estado: string | null;
  derivadas: string[] | null;
};

export async function leerCreativos(): Promise<Creative[]> {
  const filas = await todas<FilaCreativo>('creatives', '*', 'rel_path.asc');
  const marca = listSources()[0]?.id ?? 'desconocida';
  return filas.map((f) => ({
    title: f.title,
    relPath: f.rel_path,
    slug: f.slug,
    source: marca,
    persona: s(f.persona),
    publico: s(f.publico),
    dolor: s(f.dolor),
    formato: s(f.formato),
    angulo: s(f.angulo),
    anguloRaw: s(f.angulo_raw),
    ronda: s(f.ronda),
    cta: s(f.cta),
    estado: s(f.estado),
    derivadas: f.derivadas ?? [],
  }));
}

export async function leerFormulas(): Promise<Formula[]> {
  const filas = await todas<{ code: string; nombre: string | null; channel: string | null }>(
    'formulas',
    '*',
    'code.asc',
  );
  return filas.map((f) => ({
    code: f.code,
    name: f.nombre ?? f.code,
    channel: (f.channel ?? 'unknown') as Channel,
  }));
}

/**
 * El último rebuild. `null` si no hay ninguno: una base recién creada.
 *
 * Que esto pueda ser `null` es información, no un caso borde — significa que el
 * índice nunca se construyó, y la vista tiene que decirlo en vez de mostrar cero
 * piezas como si fueran cero piezas publicadas.
 */
export async function leerSello(): Promise<Sello | null> {
  const filas = await todas<{
    finished_at: string;
    pieces_count: number;
    pieces_without_id: number;
    duplicate_ids: { id: string; paths: string[] }[];
    unreadable: { path: string; reason: string }[];
    vault_sha: string | null;
  }>('builds', '*', 'finished_at.desc');

  const ultimo = filas[0];
  if (!ultimo) return null;
  return {
    finishedAt: ultimo.finished_at,
    piecesCount: ultimo.pieces_count,
    piecesWithoutId: ultimo.pieces_without_id,
    duplicateIds: ultimo.duplicate_ids ?? [],
    unreadable: ultimo.unreadable ?? [],
    vaultSha: ultimo.vault_sha,
  };
}
