import fg from 'fast-glob';
import { cache } from 'react';
import { readFileSync } from 'node:fs';
import { basename, relative, sep as PATH_SEP } from 'node:path';
import type { Piece, Snapshot } from './types';
import type { ContentSource } from './sources';
import { assertRoots, listSources } from './sources';
import { tokenizeFooter, METRIC_KEYS } from './footer';
import { parseSnapshots, snapshotFromFields, hasAnyMetric } from './snapshots';
import {
  channelFromPath,
  normalizeChannel,
  normalizeStatus,
  parseDate,
  type Coverage,
} from './normalize';

// Este archivo ya no sabe DÓNDE está el contenido: lo recibe. El registro de
// fuentes vive en ./sources.ts, y ahí se rompe si una raíz falta.
//
// Tampoco sabe CÓMO se escribe un footer: eso es ./footer.ts, y cómo se escribe
// un corte de métricas es ./snapshots.ts. Acá queda solo la orquestación.

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Separa `X2 · Antagonista (el footer decía: ...)` en código y resto.
 * El código es lo que agrupa; el nombre largo cambia y no se puede agrupar por él.
 */
function formulaCodeOf(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw.trim().match(/^([A-Z]{1,2}\d{1,2})\b/);
  return m ? m[1] : undefined;
}

/** Marca de "esto se mide y todavía no se midió", en cualquiera de sus formas. */
function declaresPending(analyticsNote: string | undefined, fields: Record<string, string>): boolean {
  if (analyticsNote && /pendiente|pending/i.test(analyticsNote)) return true;
  // Claves de métrica presentes pero vacías: `- likes:` sin valor.
  return Object.keys(fields).some((k) => METRIC_KEYS.has(k) && !fields[k]?.trim());
}

function parseFile(path: string, source: ContentSource, root: string): Piece {
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/);

  // Último separador `---` = inicio del footer. Un archivo sin `---` no tiene
  // footer, pero SIGUE SIENDO UNA PIEZA: se representa sin metadatos.
  let sep = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '---') { sep = i; break; }
  }

  const footerLines = sep === -1 ? [] : lines.slice(sep + 1);
  const { fields, snapshotLines, analyticsNote } = tokenizeFooter(footerLines);

  const snapshots: Snapshot[] = parseSnapshots(snapshotLines);
  // Las métricas escritas como bullets sueltos se colapsan en un corte implícito,
  // solo si no hay cortes explícitos que ya las contengan.
  if (snapshots.length === 0) {
    const implicit = snapshotFromFields(fields);
    if (implicit) snapshots.push(implicit);
  }

  const tldrLine = lines.find((l) => l.startsWith('TL;DR:'));
  const tldr = tldrLine ? tldrLine.slice('TL;DR:'.length).trim() : '';
  const title = basename(path).replace(/\.md$/i, '').replace(/\.$/, '');

  // La ruta relativa cuelga del VAULT, no del content root: es lo que permite
  // distinguir de cuál de las raíces de la fuente vino la pieza. El SLUG, en
  // cambio, sigue saliendo de la ruta relativa al content root — moverlo
  // cambiaría las URLs de todas las piezas, y este change no toca URLs. La
  // contracara es que dos fuentes pueden producir el mismo slug: eso lo reporta
  // `npm run audit` como colisión.
  const fromVault = relative(source.vault, path);
  const relPath = fromVault.startsWith('..') ? relative(root, path) : fromVault;
  const slug = slugify(relative(root, path).replace(/\.md$/i, ''));
  const body = lines
    .slice(0, sep === -1 ? lines.length : sep)
    .filter((l) => !l.startsWith('TL;DR:'))
    .join('\n')
    .trim();

  const canal = fields.platform || undefined;
  const estado = fields.status || undefined;
  const declared = normalizeChannel(canal);
  const channel = declared !== 'unknown' ? declared : channelFromPath(relPath);

  // REGLA DURA 2: la fecha sale del campo `date`; si no está, se extrae de
  // `estado` —el vault de Tegu escribe `estado: Publicado 2026-07-08`, que es
  // por qué Tegu tenía 0 piezas con fecha—. Nunca se infiere de otra cosa.
  const publishedAt = parseDate(fields.date) ?? parseDate(estado);

  const coverage: Coverage = snapshots.some(hasAnyMetric)
    ? 'tracked'
    : declaresPending(analyticsNote, fields)
      ? 'pending'
      : 'untracked';

  return {
    title,
    path,
    relPath,
    slug,
    source: source.id,
    tldr,
    body,
    canal,
    cuenta: fields.account || undefined,
    formato: fields.formato || undefined,
    formula: fields.formula || undefined,
    estado,
    date: fields.date || undefined,
    url: fields.url || undefined,
    tags: fields.tags || undefined,
    note: fields.note || fields.notas || undefined,
    channel,
    channelDerived: declared === 'unknown' && channel !== 'unknown',
    status: normalizeStatus(estado),
    publishedAt,
    formulaCode: formulaCodeOf(fields.formula),
    coverage,
    verdict: fields.verdict || undefined,
    drivers: fields.drivers ? fields.drivers.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    why: fields.why || undefined,
    lesson: fields.lesson || undefined,
    snapshots,
  };
}

export type SourceLoad = {
  source: ContentSource;
  pieces: Piece[];
  /** Archivos que no se pudieron leer, con el motivo. Nunca se tragan en silencio. */
  unreadable: { path: string; reason: string }[];
};

/**
 * Lee cada fuente por separado y devuelve su conteo aparte. Que una fuente
 * devuelva cero tiene que ser visible: sin esto, dos fuentes vacías y una llena
 * se ven igual que tres llenas.
 */
function loadUncached(sources: ContentSource[]): SourceLoad[] {
  assertRoots(sources);

  return sources.map((source) => {
    const pieces: Piece[] = [];
    const unreadable: { path: string; reason: string }[] = [];
    const seen = new Set<string>();

    for (const root of source.roots) {
      for (const file of fg.sync('**/*.md', { cwd: root, absolute: true })) {
        if (source.ignore.some((dir) => file === dir || file.startsWith(dir + PATH_SEP))) continue;
        if (seen.has(file)) continue; // dos raíces anidadas no duplican la pieza
        seen.add(file);
        try {
          pieces.push(parseFile(file, source, root));
        } catch (err) {
          // Un archivo ilegible es un problema real, no ruido: antes se tragaba
          // en silencio y la pieza desaparecía del dashboard sin dejar rastro.
          // Ahora se cuenta y se reporta, y el resto sigue.
          unreadable.push({ path: file, reason: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    if (unreadable.length > 0) {
      console.warn(
        `[sources] ${source.id}: ${unreadable.length} archivo(s) ilegible(s):\n` +
          unreadable.map((u) => `  ${u.path}: ${u.reason}`).join('\n'),
      );
    }
    if (pieces.length === 0) {
      console.warn(
        `[sources] ${source.id}: 0 piezas legibles en ${source.roots.join(', ')}. ` +
          'Las raíces existen; o están vacías o ningún archivo se pudo leer.',
      );
    }
    return { source, pieces, unreadable };
  });
}

// `cache()` memoiza por request de React. Antes esto corría una vez por página:
// cuatro rutas = cuatro barridas completas de los dos vaults en cada build.
export const loadPiecesBySource = cache(
  (sources: ContentSource[] = listSources()): SourceLoad[] => loadUncached(sources),
);

export function loadPieces(sources: ContentSource[] = listSources()): Piece[] {
  return loadPiecesBySource(sources).flatMap((s) => s.pieces);
}
