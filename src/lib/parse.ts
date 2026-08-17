import fg from 'fast-glob';
import { readFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import type { Piece, Snapshot } from './types';

// Path al contenido del vault. Default: sibling tegu-docs/Brand/Content.
// Override con VAULT_CONTENT_DIR (útil para el build en Vercel).
const VAULT = process.env.VAULT_CONTENT_DIR
  ?? resolve(process.cwd(), '../tegu-docs/Brand/Content');

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

// "t=+1h imp=686 eng=227 ..." -> Snapshot
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
function parseFooter(footer: string[]): Omit<Piece, 'title' | 'path' | 'relPath' | 'slug' | 'tldr' | 'body'> {
  const meta: Omit<Piece, 'title' | 'path' | 'relPath' | 'slug' | 'tldr' | 'body'> = { snapshots: [] };
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
    // Varias keys por línea, separadas por ` · `
    for (const seg of line.split('·')) {
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

function parseFile(path: string): Piece | null {
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
  const relPath = relative(VAULT, path);
  const slug = slugify(relPath.replace(/\.md$/i, ''));
  const body = lines
    .slice(0, sep)
    .filter((l) => !l.startsWith('TL;DR:'))
    .join('\n')
    .trim();

  return { title, path, relPath, slug, tldr, body, ...meta };
}

export function loadPieces(): Piece[] {
  const files = fg.sync('**/*.md', { cwd: VAULT, absolute: true });
  const pieces: Piece[] = [];
  for (const f of files) {
    try {
      const p = parseFile(f);
      if (p) pieces.push(p);
    } catch {
      // archivo raro / no-pieza: se ignora, no rompe el build
    }
  }
  return pieces;
}

export { VAULT };
