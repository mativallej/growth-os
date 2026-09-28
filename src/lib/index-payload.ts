import type { SourceLoad } from './parse';
import type { Creative } from './ads';
import type { Formula } from './formulas';
import type { Piece } from './types';

/**
 * De lo que el parser leyó del vault, al payload de `rebuild_index(jsonb)`.
 *
 * PURA. No lee disco, no habla con la red, no mira `process.env`. Recibe lo que
 * `loadPiecesBySource`, `loadAdsBySource` y `loadFormulas` devolvieron y arma un
 * JSON. Eso es lo que la hace testeable sin un vault y sin una base, y es la
 * única razón por la que el rebuild puede probarse en CI.
 *
 * POR QUÉ ESTO VIVE EN `growth-os` Y NO EN EL REPO DEL VAULT. El contrato del
 * footer ya está implementado en tres lugares —`footer.ts`, `sync-notion.py`,
 * `audit-vaults.mjs`— y mantenerlos de acuerdo es trabajo permanente. Un cuarto,
 * en el indexador, garantizaría que el índice y el dashboard discrepen sobre qué
 * es una pieza: exactamente el bug que nadie ve, porque las dos mitades se ven
 * sanas por separado. El script del vault importa ESTA función.
 *
 * LO QUE ACÁ NO PASA. No valida, no completa, no arregla. Un `id` ausente no se
 * inventa, un canal desconocido no se adivina, una fecha rara no se reinterpreta:
 * todo eso ya lo decidió el parser, con sus reglas y sus derivaciones marcadas.
 * Esto reordena. Si algo está mal, está mal en el vault y tiene que verse así.
 */

/**
 * La versión del esquema que este payload sabe llenar.
 *
 * Sube junto con `esquema_esperado` de `rebuild_index`, en el mismo commit, cada
 * vez que una migración agrega o saca una columna. Están a propósito en dos
 * archivos: si se desincronizan es porque uno de los dos deploys no llegó, y el
 * rebuild aborta en vez de escribir un índice al que le falta una columna.
 */
export const VERSION_ESQUEMA = 1;

export type PiezaFila = {
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
  unknown_keys: string[];
};

export type DistribucionFila = {
  piece_id: string;
  cuenta: string;
  url: string | null;
  date: string | null;
  ord: number;
};

export type SnapshotFila = {
  piece_id: string;
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
};

export type CreativoFila = {
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
  derivadas: string[];
};

export type FormulaFila = { code: string; nombre: string | null; channel: string | null };

export type Payload = {
  schema_version: number;
  pieces: PiezaFila[];
  distribuciones: DistribucionFila[];
  snapshots: SnapshotFila[];
  creatives: CreativoFila[];
  formulas: FormulaFila[];
  /** Cuántas quedaron afuera por no tener `id`. Se registra en `builds`. */
  pieces_without_id: number;
  /** Aborta el rebuild del lado de la base. Se manda para que diga cuáles. */
  duplicate_ids: { id: string; paths: string[] }[];
  unreadable: { path: string; reason: string }[];
  vault_sha: string | null;
};

/** `undefined` y `''` son lo mismo para una columna nullable: nada escrito. */
const n = (v: string | undefined): string | null => (v && v.trim() ? v : null);
const num = (v: number | undefined): number | null => (v === undefined ? null : v);

/**
 * Las piezas SIN `id` no entran al índice, y eso es una pérdida real.
 *
 * La PK de `pieces` es el `id` del footer (D-9) y no hay dónde poner una pieza
 * que no lo declara. La alternativa sería llavear por `rel_path`, que es la
 * llave rota que D-9 existe para reemplazar: mover el archivo cambiaría la
 * identidad y los favoritos se perderían sin aviso.
 *
 * Así que se cuentan y se declaran en `builds.pieces_without_id`, y el sello de
 * frescura las dice. Medido el 2026-09-28 contra el vault de Tegu: **0 de 126**.
 * El backfill de D-9 ya pasó. Si alguna vez vuelve a haber, el número se ve.
 */
function esIndexable(p: Piece): p is Piece & { id: string } {
  return Boolean(p.id);
}

export function construirPayload(
  cargas: SourceLoad[],
  creativos: Creative[],
  formulas: Formula[],
  vaultSha?: string,
): Payload {
  // UNA INSTALACIÓN, UNA MARCA (D-17). Igual se recibe la lista y se aplana, no
  // se toma `cargas[0]`: con una sola carga es lo mismo, y con dos un `[0]`
  // silencioso perdería la segunda entera sin que nada lo dijera.
  const piezas = cargas.flatMap((c) => c.pieces);
  const indexables = piezas.filter(esIndexable);

  const pieces: PiezaFila[] = indexables.map((p) => ({
    id: p.id,
    title: p.title,
    rel_path: p.relPath,
    slug: p.slug,
    tldr: n(p.tldr),
    body: n(p.body),
    canal: n(p.canal),
    cuenta: n(p.cuenta),
    formato: n(p.formato),
    formula: n(p.formula),
    estado: n(p.estado),
    // `date_raw` y no `date`: es lo que la persona escribió, sin normalizar, y
    // vive al lado de `published_at`, que es lo que el parser dedujo. Las dos,
    // porque una sola no permite ver que se dedujo.
    date_raw: n(p.date),
    url: n(p.url),
    drive_url: n(p.driveUrl),
    tags: n(p.tags),
    note: n(p.note),
    channel: p.channel,
    channel_derived: p.channelDerived,
    status: p.status,
    published_at: n(p.publishedAt),
    formula_code: n(p.formulaCode),
    coverage: p.coverage,
    verdict: n(p.verdict),
    why: n(p.why),
    lesson: n(p.lesson),
    drivers: p.drivers?.length ? p.drivers : null,
    unknown_keys: p.unknownKeys,
  }));

  // `ord` es la posición en el footer, y es la llave. Sale del índice del array
  // porque el parser conserva el orden del archivo: dos rebuilds del mismo vault
  // producen las mismas filas, que es la condición 2 de D-15.
  const distribuciones: DistribucionFila[] = indexables.flatMap((p) =>
    (p.distribucion ?? []).map((d, ord) => ({
      piece_id: p.id,
      cuenta: d.cuenta,
      url: n(d.url),
      date: n(d.date),
      ord,
    })),
  );

  const snapshots: SnapshotFila[] = indexables.flatMap((p) =>
    p.snapshots.map((s, ord) => ({
      piece_id: p.id,
      t: s.t,
      date: n(s.date),
      account: n(s.account),
      ord,
      impressions: num(s.impressions),
      engagements: num(s.engagements),
      detail_expands: num(s.detailExpands),
      profile_visits: num(s.profileVisits),
      likes: num(s.likes),
      reposts: num(s.reposts),
      replies: num(s.replies),
      bookmarks: num(s.bookmarks),
      shares: num(s.shares),
      follows: num(s.follows),
      media_views: num(s.mediaViews),
      views: num(s.views),
      reach: num(s.reach),
      non_followers: num(s.nonFollowers),
    })),
  );

  return {
    schema_version: VERSION_ESQUEMA,
    pieces,
    distribuciones,
    snapshots,
    creatives: creativos.map((c) => ({
      rel_path: c.relPath,
      title: c.title,
      slug: c.slug,
      persona: n(c.persona),
      publico: n(c.publico),
      dolor: n(c.dolor),
      formato: n(c.formato),
      angulo: n(c.angulo),
      angulo_raw: n(c.anguloRaw),
      ronda: n(c.ronda),
      cta: n(c.cta),
      estado: n(c.estado),
      derivadas: c.derivadas,
    })),
    formulas: formulas.map((f) => ({
      code: f.code,
      nombre: n(f.name),
      channel: n(f.channel),
    })),
    pieces_without_id: piezas.length - indexables.length,
    duplicate_ids: cargas.flatMap((c) => c.duplicateIds),
    unreadable: cargas.flatMap((c) => c.unreadable),
    vault_sha: vaultSha ?? null,
  };
}
