// Coerción pura: string del vault -> valor tipado. Sin I/O, sin dependencias.
//
// REGLA DURA 2 — SIN SEÑAL EXPLÍCITA NO SE INFIERE. Todo lo de acá tiene un
// valor conservador por defecto (`unknown` / `undefined`), nunca el optimista.
// El riesgo concreto que se está evitando: si `normalizeStatus` marca
// "publicado" ante la duda, la vista de deuda —cuya única función es mostrar
// piezas publicadas sin medir— se llena de falsos positivos y deja de servir.

/** Canal normalizado. Conjunto cerrado; `unknown` cuando el crudo no es claro. */
export type Channel = 'x' | 'instagram' | 'linkedin' | 'blog' | 'reddit' | 'unknown';

/** Estado normalizado. Conjunto cerrado; `unknown` cuando el crudo no es claro. */
export type Status = 'published' | 'in-progress' | 'draft' | 'idea' | 'backlog' | 'unknown';

/**
 * Número del vault -> number.
 *
 * El vault trae `13.301` (miles) junto a `374094` (pelado) y `2.4` (decimal).
 * La regla de limpieza es ESTRECHA a propósito: se quitan los puntos solo si el
 * string entero matchea `^\d{1,3}(\.\d{3})+$`. Así `2.4` sigue siendo 2,4 y no
 * 24 — que es el bug que esta función existe para no cometer.
 */
export function parseNum(raw: string | undefined | null): number | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim().replace(/%$/, '');
  if (!s) return undefined;
  const miles = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s;
  const n = Number(miles);
  return Number.isFinite(n) ? n : undefined;
}

/** Primera fecha ISO que aparezca en el string. `estado: Publicado 2026-07-08` -> `2026-07-08`. */
export function parseDate(raw: string | undefined | null): string | undefined {
  if (raw == null) return undefined;
  const m = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return undefined;
  const [, y, mo, d] = m;
  const mi = Number(mo);
  const di = Number(d);
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return undefined;
  return `${y}-${mo}-${d}`;
}

// Alias -> canal. Twitter y X son el mismo canal: el vault personal escribe `X`
// y el de Tegu escribe `Twitter`, y una pieza de cada uno tiene que caer en el
// mismo balde o el conteo por canal miente.
const CHANNEL_ALIASES: Record<string, Channel> = {
  x: 'x',
  twitter: 'x',
  tw: 'x',
  instagram: 'instagram',
  ig: 'instagram',
  reel: 'instagram',
  reels: 'instagram',
  linkedin: 'linkedin',
  li: 'linkedin',
  blog: 'blog',
  landing: 'blog',
  reddit: 'reddit',
};

export function normalizeChannel(raw: string | undefined | null): Channel {
  if (!raw) return 'unknown';
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  if (CHANNEL_ALIASES[key]) return CHANNEL_ALIASES[key];
  // Prefijo: "Twitter (thread)" o "Instagram - reel" siguen siendo el canal.
  const head = key.split(/[\s(/·-]/)[0];
  return CHANNEL_ALIASES[head] ?? 'unknown';
}

/**
 * Canal derivado de la ubicación en el vault, para las piezas que no lo declaran.
 * Quien lo use SHALL registrar que se derivó (ver `channelDerived` en Piece):
 * un canal deducido y uno declarado no valen lo mismo.
 */
export function channelFromPath(relPath: string): Channel {
  const segs = relPath.split(/[\\/]/);
  for (const seg of segs) {
    const c = normalizeChannel(seg);
    if (c !== 'unknown') return c;
  }
  return 'unknown';
}

/**
 * Estado del vault -> estado normalizado.
 *
 * El orden de los tests NO es arbitrario:
 *  1. `publicad[oa]` primero, porque `Publicado (fecha pendiente)` contiene
 *     "pendiente" y caería en in-progress.
 *  2. La raíz es `publicad`, no `public`, para que `draft — NO publicar aún`
 *     (que contiene "publicar") no se lea como publicado.
 *  3. Todo lo que no matchea con claridad cae en `unknown`, nunca en published.
 */
export function normalizeStatus(raw: string | undefined | null): Status {
  if (!raw) return 'unknown';
  const s = String(raw).trim().toLowerCase();
  if (!s) return 'unknown';
  if (/\bno publicar\b/.test(s) && /\bdraft|borrador\b/.test(s)) return 'draft';
  if (/publicad[oa]/.test(s)) return 'published';
  if (/\bdraft\b|\bborrador\b/.test(s)) return 'draft';
  if (/\bidea\b/.test(s)) return 'idea';
  if (/\bbacklog\b/.test(s)) return 'backlog';
  // Mismo criterio que `estado_post` en el sync (scripts/sync-notion.py de
  // tegu-labs/tegu-growth): evidencia de que
  // alguien la está trabajando, sin ser evidencia de publicación.
  if (/\blisto\b|\bpendiente\b|\bgrabar\b|\bgrabado\b|\bfalta\b/.test(s)) return 'in-progress';
  return 'unknown';
}

/** Cobertura de medición de una pieza. Ver `docs/footer-contract.md`. */
export type Coverage = 'tracked' | 'pending' | 'untracked';
