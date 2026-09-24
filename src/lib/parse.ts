import fg from 'fast-glob';
import { readFileSync } from 'node:fs';
import { basename, relative, sep as PATH_SEP } from 'node:path';
import type { Piece, Snapshot } from './types';
import type { ContentSource } from './sources';
import { assertRoots, listSources } from './sources';

// Este archivo ya no sabe DÓNDE está el contenido: lo recibe. El registro de
// fuentes vive en ./sources.ts, y ahí se rompe si una raíz falta.

const SNAP_KEYS: Record<string, keyof Snapshot> = {
  imp: 'impressions',
  eng: 'engagements',
  detail: 'detailExpands',
  pv: 'profileVisits',
  likes: 'likes',
  rt: 'reposts',
  replies: 'replies',
  bmk: 'bookmarks',
  shares: 'shares',
  follows: 'follows',
  media: 'mediaViews',
  // IG: mismo concepto que en X → mismo campo
  saves: 'bookmarks',
  comments: 'replies',
  reach: 'reach',
  nonfoll: 'nonFollowers',
};

// Formato del contrato: "snapshot 2026-03-12 (+2d): imp=121691 eng=28179 ..."
// Ver growth-loop-obsidian/docs/footer-contract.md
const SNAPSHOT_RE = /^snapshot\s+(\d{4}-\d{2}-\d{2})\s*\(([+-][^)]+)\)\s*:\s*(.*)$/;

function parseSnapshotLine(line: string): Snapshot | null {
  const m = line.trim().match(SNAPSHOT_RE);
  if (!m) return null;
  const snap = parseSnapshot(`t=${m[2]} ${m[3]}`);
  if (snap) snap.date = m[1];
  return snap;
}

// Formato viejo: "t=+1h imp=686 eng=227 ..." -> Snapshot
function parseSnapshot(line: string): Snapshot | null {
  const snap: Snapshot = { t: '' };
  for (const tok of line.trim().split(/\s+/)) {
    const eq = tok.indexOf('=');
    if (eq < 1) continue;
    const k = tok.slice(0, eq);
    const v = tok.slice(eq + 1);
    if (k === 't') {
      snap.t = v;
    } else if (SNAP_KEYS[k]) {
      const n = Number(v);
      if (!Number.isNaN(n)) (snap[SNAP_KEYS[k]] as number) = n;
    }
  }
  return snap.t ? snap : null;
}

// El footer del formato /post: bloque final después del último `---`,
// con líneas `key: value` (varias por línea separadas por ` · `),
// un bloque `analytics:` de líneas `- ...`, y un `note:`.
function parseFooter(footer: string[]): Omit<Piece, 'title' | 'path' | 'relPath' | 'slug' | 'source' | 'tldr' | 'body'> {
  const meta: Omit<Piece, 'title' | 'path' | 'relPath' | 'slug' | 'source' | 'tldr' | 'body'> = { snapshots: [] };
  let i = 0;
  while (i < footer.length) {
    const line = footer[i].trim();
    if (line.startsWith('analytics:')) {
      i++;
      while (i < footer.length) {
        const l = footer[i].trim();
        if (l.startsWith('-')) {
          const s = parseSnapshot(l.replace(/^-\s*/, ''));
          if (s) meta.snapshots.push(s);
          i++;
        } else if (l === '') {
          i++;
        } else {
          break;
        }
      }
      continue;
    }
    if (line.startsWith('note:')) {
      meta.note = line.slice('note:'.length).trim();
      i++;
      continue;
    }
    // Bloque `analysis:` — el porqué (líneas de prosa, no separar por ·)
    if (line === 'analysis:' || line.startsWith('analysis:')) {
      i++;
      continue;
    }
    if (line.startsWith('verdict:')) {
      meta.verdict = line.slice('verdict:'.length).trim();
      i++;
      continue;
    }
    if (line.startsWith('drivers:')) {
      meta.drivers = line
        .slice('drivers:'.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      i++;
      continue;
    }
    if (line.startsWith('why:')) {
      meta.why = line.slice('why:'.length).trim();
      i++;
      continue;
    }
    if (line.startsWith('lesson:')) {
      meta.lesson = line.slice('lesson:'.length).trim();
      i++;
      continue;
    }
    // Línea de corte del contrato, suelta en el footer (sin bloque `analytics:`)
    const bare = line.replace(/^-\s+/, '');
    if (bare.startsWith('snapshot ')) {
      const s = parseSnapshotLine(bare);
      if (s) meta.snapshots.push(s);
      i++;
      continue;
    }

    // Varias keys por línea, separadas por ` · ` (formato viejo),
    // o un dato por línea con `- ` adelante (contrato).
    for (const seg of bare.split('·')) {
      const m = seg.trim().match(/^([A-Za-zÁÉÍÓÚáéíóúñ. -]+?):\s*(.+)$/);
      if (!m) continue;
      const key = m[1].trim().toLowerCase();
      const val = m[2].trim();
      if (key === 'canal') meta.canal = val;
      else if (key === 'cuenta') meta.cuenta = val;
      else if (key === 'formato') meta.formato = val;
      else if (key === 'fórmula' || key === 'formula') meta.formula = val;
      else if (key === 'estado') meta.estado = val;
      else if (key === 'tags') meta.tags = val;
      // Claves del contrato (conviven con las viejas durante la migración)
      else if (key === 'platform') meta.canal = meta.canal ?? val;
      else if (key === 'account') meta.cuenta = meta.cuenta ?? val;
      else if (key === 'status') meta.estado = meta.estado ?? val;
      else if (key === 'date') meta.date = val;
      else if (key === 'url') meta.url = val;
    }
    i++;
  }
  return meta;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseFile(path: string, source: ContentSource, root: string): Piece | null {
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/);

  // Último separador `---` = inicio del footer
  let sep = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '---') { sep = i; break; }
  }
  if (sep === -1) return null;

  const meta = parseFooter(lines.slice(sep + 1));
  // Solo tratamos como "pieza" si tiene footer de contenido
  if (!meta.canal && !meta.formula && !meta.formato) return null;

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
    .slice(0, sep)
    .filter((l) => !l.startsWith('TL;DR:'))
    .join('\n')
    .trim();

  return { title, path, relPath, slug, source: source.id, tldr, body, ...meta };
}

export type SourceLoad = { source: ContentSource; pieces: Piece[] };

/**
 * Lee cada fuente por separado y devuelve su conteo aparte. Que una fuente
 * devuelva cero tiene que ser visible: sin esto, dos fuentes vacías y una llena
 * se ven igual que tres llenas.
 */
export function loadPiecesBySource(sources: ContentSource[] = listSources()): SourceLoad[] {
  assertRoots(sources);

  return sources.map((source) => {
    const pieces: Piece[] = [];
    const seen = new Set<string>();

    for (const root of source.roots) {
      for (const file of fg.sync('**/*.md', { cwd: root, absolute: true })) {
        if (source.ignore.some((dir) => file === dir || file.startsWith(dir + PATH_SEP))) continue;
        if (seen.has(file)) continue; // dos raíces anidadas no duplican la pieza
        seen.add(file);
        let piece: Piece | null;
        try {
          piece = parseFile(file, source, root);
        } catch (err) {
          // Un archivo ilegible es un problema real, no ruido: antes se tragaba
          // en silencio y la pieza desaparecía del dashboard sin dejar rastro.
          throw new Error(
            `No se pudo leer ${file} (fuente ${source.id}): ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        if (piece) pieces.push(piece);
      }
    }

    if (pieces.length === 0) {
      console.warn(
        `[sources] ${source.id}: 0 piezas legibles en ${source.roots.join(', ')}. ` +
          'Las raíces existen; o están vacías o ningún archivo tiene footer.',
      );
    }
    return { source, pieces };
  });
}

export function loadPieces(sources: ContentSource[] = listSources()): Piece[] {
  return loadPiecesBySource(sources).flatMap((s) => s.pieces);
}
