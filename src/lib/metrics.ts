import type { Piece, Snapshot } from './types';

// Minutos desde publicación a partir de "t" (+20m / +1h / +24h / +7d)
export function minutesFromT(t: string): number {
  if (/^(final|lifetime)$/i.test(t.trim())) return Number.MAX_SAFE_INTEGER;
  const m = t.match(/^\+?(\d+(?:\.\d+)?)([mhd])$/);
  if (!m) return 0;
  const n = Number(m[1]);
  return m[2] === 'm' ? n : m[2] === 'h' ? n * 60 : n * 1440;
}

export function sortedSnaps(p: Piece): Snapshot[] {
  return [...p.snapshots].sort((a, b) => minutesFromT(a.t) - minutesFromT(b.t));
}

export function latest(p: Piece): Snapshot | null {
  const s = sortedSnaps(p);
  return s.length ? s[s.length - 1] : null;
}

// Derivadas — se calculan acá, nunca se persisten en el .md
export function engRate(s: Snapshot): number | null {
  return s.impressions && s.engagements != null ? s.engagements / s.impressions : null;
}
export function pvRate(s: Snapshot): number | null {
  return s.impressions && s.profileVisits != null ? s.profileVisits / s.impressions : null;
}
export function saveLike(s: Snapshot): number | null {
  return s.likes && s.bookmarks != null ? s.bookmarks / s.likes : null;
}
export function detailRate(s: Snapshot): number | null {
  return s.impressions && s.detailExpands != null ? s.detailExpands / s.impressions : null;
}

// Velocidad (imp/min) entre los dos últimos snapshots
export function velocity(p: Piece): number | null {
  const s = sortedSnaps(p);
  if (s.length < 2) return null;
  const a = s[s.length - 2];
  const b = s[s.length - 1];
  if (a.impressions == null || b.impressions == null) return null;
  const dm = minutesFromT(b.t) - minutesFromT(a.t);
  if (dm <= 0) return null;
  return (b.impressions - a.impressions) / dm;
}

// Helpers de formato
export const num = (x?: number | null): string =>
  x == null ? '—' : x.toLocaleString('es-AR');
export const pct = (x?: number | null): string =>
  x == null ? '—' : `${(x * 100).toFixed(1)}%`;

// Suma de una métrica sobre el último snapshot de cada pieza
export function sumLatest(pieces: Piece[], key: keyof Snapshot): number {
  let s = 0;
  for (const p of pieces) {
    const l = latest(p);
    const v = l ? l[key] : undefined;
    if (typeof v === 'number') s += v;
  }
  return s;
}

// Top N de un conteo, con "otros" agrupado
export function topN(rec: Record<string, number>, n: number): { label: string; value: number }[] {
  const sorted = Object.entries(rec).sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, n).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(n).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) head.push({ label: 'otros', value: rest });
  return head;
}

// Rollups sobre la colección
export function countBy(pieces: Piece[], key: keyof Piece): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of pieces) {
    const raw = (p[key] as string | undefined) ?? '—';
    // Normaliza estados tipo "Publicado 2026-08-06" -> "Publicado"
    const v = key === 'estado' ? raw.split(/[\s—-]/)[0].trim() || '—' : raw;
    out[v] = (out[v] ?? 0) + 1;
  }
  return out;
}

/**
 * Alcance primario: la métrica de alcance que corresponda al canal de la pieza.
 *
 * X reporta `impressions`; Instagram reporta `views` y `reach`, y NO reporta
 * impressions. Ordenar una lista mixta por `impressions` mandaba todas las
 * piezas de IG al fondo con un cero que no era un cero: era "esta red no mide
 * eso". Devuelve `null` —no 0— cuando no hay ninguna medición de alcance, para
 * que la ausencia se pueda distinguir de un alcance real de cero (regla dura 5).
 */
export function primaryReach(p: Piece): number | null {
  const l = latest(p);
  if (!l) return null;
  const candidatos = p.channel === 'instagram'
    ? [l.views, l.reach, l.impressions]
    : [l.impressions, l.views, l.reach];
  for (const v of candidatos) if (typeof v === 'number') return v;
  return null;
}

/**
 * Mediana de una lista de números. Para distribuciones con cola larga —que es
 * lo que son las métricas de contenido— el promedio lo decide el outlier: un
 * tweet de 152K impresiones vuelve irreconocible la mediana de 800.
 * Devuelve `null` con lista vacía, nunca 0.
 */
export function median(xs: number[]): number | null {
  const s = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
