import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { construirPayload } from './index-payload';
import type { SourceLoad } from './parse';
import type { Piece } from './types';
import type { ContentSource } from './sources';

/**
 * EL VAULT ENTRA AL ÍNDICE Y SALE IGUAL.
 *
 * Es el test que sostiene toda esta migración. Ocho vistas, `metrics.ts`,
 * `rollups.ts`, `cadencia.ts`, `viralidad.ts` y `variantes.ts` son puros sobre
 * `Piece[]`: siguen funcionando exactamente mientras lo que sale de la API tenga
 * la misma forma que lo que salía del parser. Eso no es una promesa que se pueda
 * mantener leyendo el código de las dos puntas —son 27 campos, varios opcionales,
 * dos listas anidadas— así que se prueba.
 *
 * QUÉ SIMULA Y QUÉ NO. El armado de la respuesta imita a PostgREST: las filas de
 * `pieces` con sus `distribuciones` y `snapshots` embebidos. Lo que NO simula es
 * Postgres, y no hace falta: que la base guarde y devuelva estas filas sin
 * perder nada se verificó aparte, corriendo el rebuild con el payload del vault
 * real contra Postgres 14 (ver el commit del payload). Acá se prueba la otra
 * mitad: que el mapeo de ida y el de vuelta sean inversos.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ getToken: () => Promise.resolve('jwt-de-prueba') }),
}));

vi.mock('./sources', () => ({
  listSources: () => [{ id: 'tegu' }],
}));

const FUENTE = { id: 'tegu' } as unknown as ContentSource;

function carga(pieces: Piece[]): SourceLoad {
  return { source: FUENTE, pieces, unreadable: [], withoutId: [], duplicateIds: [] };
}

/** Lo que PostgREST devolvería para `pieces?select=*,distribuciones(*),snapshots(*)`. */
function respuestaPostgrest(payload: ReturnType<typeof construirPayload>) {
  return payload.pieces.map((p) => ({
    ...p,
    distribuciones: payload.distribuciones
      .filter((d) => d.piece_id === p.id)
      // A propósito al revés: PostgREST NO garantiza el orden de un embed, y si
      // `leerPiezas` no ordenara por `ord`, este test tiene que notarlo.
      .map((d) => ({ ...d, piece_id: undefined }))
      .reverse(),
    snapshots: payload.snapshots
      .filter((s) => s.piece_id === p.id)
      .map((s) => ({ ...s, piece_id: undefined }))
      .reverse(),
  }));
}

let leerPiezas: typeof import('./index-read').leerPiezas;

beforeEach(async () => {
  vi.stubEnv('SUPABASE_URL', 'https://proyecto.supabase.co');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  ({ leerPiezas } = await import('./index-read'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function servir(filas: unknown[], total = filas.length) {
  vi.stubGlobal('fetch', () =>
    Promise.resolve(
      new Response(JSON.stringify(filas), {
        status: 200,
        headers: { 'content-range': `0-${Math.max(filas.length - 1, 0)}/${total}` },
      }),
    ),
  );
}

/** Una pieza con TODOS los campos puestos: un roundtrip sobre defaults no prueba nada. */
function piezaCompleta(): Piece {
  return {
    title: 'tweet-035',
    path: '/vault/Create/Organic/X/tweet-035.md',
    relPath: 'Create/Organic/X/tweet-035.md',
    slug: 'x-tweet-035',
    source: 'tegu',
    tldr: 'un tldr',
    body: 'el cuerpo\ncon salto',
    id: 'tfuus8wy',
    canal: 'Twitter',
    cuenta: 'tegu_x',
    formato: 'guion video',
    formula: 'X2 · Antagonista',
    estado: 'Publicado 2026-07-08',
    date: 'Publicado 2026-07-08',
    url: 'https://x.com/tegu_app/status/1',
    driveUrl: 'https://drive.google.com/file/d/abc',
    distribucion: [
      { cuenta: 'blog_mati', url: 'https://m.com/x' },
      { cuenta: 'blog_mati', url: 'https://m.com/es/x' },
      { cuenta: 'tegu_ig', date: '2026-07-09' },
    ],
    tags: '#post #post-x',
    note: 'una nota',
    channel: 'x',
    channelDerived: true,
    status: 'published',
    publishedAt: '2026-07-08',
    formulaCode: 'X2',
    coverage: 'tracked',
    verdict: 'funcionó',
    drivers: ['gancho', 'timing'],
    why: 'porque sí',
    lesson: 'la lección',
    unknownKeys: ['author', 'referencias'],
    snapshots: [
      { t: '+1h', date: '2026-07-08', account: 'tegu_x', impressions: 100, likes: 3, engagements: 0 },
      { t: '+24h', impressions: 900, reposts: 2, nonFollowers: 61.5 },
      { t: '+7d', views: 1200, reach: 800, mediaViews: 400 },
    ],
  };
}

describe('el vault entra al índice y sale igual', () => {
  it('una pieza con todos los campos vuelve idéntica', async () => {
    const original = piezaCompleta();
    const payload = construirPayload([carga([original])], [], []);
    servir(respuestaPostgrest(payload));

    const [vuelta] = await leerPiezas();

    // `path` es lo único que no vuelve, y es a propósito: es la ruta absoluta al
    // `.md` y la plataforma no tiene el vault montado. Inventarla daría una ruta
    // que no abre nada.
    const esperado = { ...original, path: undefined };
    expect(vuelta).toEqual(esperado);
  });

  it('ordena los embeds por `ord` aunque lleguen al revés', async () => {
    const original = piezaCompleta();
    servir(respuestaPostgrest(construirPayload([carga([original])], [], [])));
    const [vuelta] = await leerPiezas();

    expect(vuelta.distribucion?.map((d) => d.url)).toEqual([
      'https://m.com/x',
      'https://m.com/es/x',
      undefined,
    ]);
    expect(vuelta.snapshots.map((s) => s.t)).toEqual(['+1h', '+24h', '+7d']);
  });

  it('una pieza pelada no gana campos que nadie escribió', async () => {
    const pelada: Piece = {
      title: 't', path: '/v/t.md', relPath: 't.md', slug: 't', source: 'tegu',
      tldr: '', body: '', channel: 'unknown', channelDerived: false,
      status: 'draft', coverage: 'untracked', unknownKeys: [], snapshots: [],
      id: 'aaaa1111',
    };
    servir(respuestaPostgrest(construirPayload([carga([pelada])], [], [])));
    const [vuelta] = await leerPiezas();

    const esperado = { ...pelada, path: undefined };
    expect(vuelta).toEqual(esperado);
    expect(vuelta.distribucion).toBeUndefined();
    expect(vuelta.drivers).toBeUndefined();
  });

  it('un cero medido sigue siendo cero y no se vuelve "sin medir"', async () => {
    const p = { ...piezaCompleta(), snapshots: [{ t: '+1h', impressions: 0, likes: 0 }] };
    servir(respuestaPostgrest(construirPayload([carga([p])], [], [])));
    const [vuelta] = await leerPiezas();
    expect(vuelta.snapshots[0].impressions).toBe(0);
    expect(vuelta.snapshots[0].likes).toBe(0);
    expect(vuelta.snapshots[0].reach).toBeUndefined();
  });

  /**
   * El modo de falla que nadie ve: PostgREST recorta a `db-max-rows` y responde
   * 200. Sin este chequeo el dashboard diría que se publicaron menos piezas de
   * las que se publicaron, y eso se lee como un dato.
   */
  it('revienta si el servidor recortó la respuesta', async () => {
    const payload = construirPayload([carga([piezaCompleta()])], [], []);
    servir(respuestaPostgrest(payload), 1234);
    await expect(leerPiezas()).rejects.toThrow(/1 de 1234/);
  });

  it('sin config de Supabase lo dice, en vez de devolver una lista vacía', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const { leerPiezas: sinConfig } = await import('./index-read');
    await expect(sinConfig()).rejects.toThrow(/SUPABASE_URL/);
  });
});
