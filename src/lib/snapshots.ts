// Dispatcher de formatos de corte de métricas.
//
// El contrato cambió dos veces y el vault tiene las tres formas vivas, a veces
// en el mismo archivo (`tweet-022-thread-recap-4-meses` tiene prosa y tokens en
// el mismo bloque `analytics:`). Ninguna se descarta: un corte medido que el
// parser no entiende es un número real que se pierde.
//
//   vigente  `snapshot 2026-09-23 (+42d): views=933 reach=503 likes=14`
//   tokens   `t=+70d imp=10768 eng=2496 detail=276 pv=154`
//   prosa    `2026-07-08 +1h30: 2.206 imp · 603 eng (27%) · 69 expands`
//
// Ver docs/footer-contract.md.

import type { Snapshot } from './types';
import { parseNum } from './normalize';

/** Alias de métrica -> campo de Snapshot. Cubre las tres gramáticas. */
const SNAP_KEYS: Record<string, keyof Snapshot> = {
  imp: 'impressions',
  impressions: 'impressions',
  eng: 'engagements',
  engagements: 'engagements',
  detail: 'detailExpands',
  expands: 'detailExpands',
  detail_expands: 'detailExpands',
  pv: 'profileVisits',
  'profile visits': 'profileVisits',
  profile_visits: 'profileVisits',
  likes: 'likes',
  rt: 'reposts',
  reposts: 'reposts',
  replies: 'replies',
  bmk: 'bookmarks',
  bookmarks: 'bookmarks',
  shares: 'shares',
  follows: 'follows',
  new_follows: 'follows',
  media: 'mediaViews',
  // IG: mismo concepto que en X -> mismo campo
  saves: 'bookmarks',
  comments: 'replies',
  reach: 'reach',
  nonfoll: 'nonFollowers',
  // Singulares: la prosa escrita a mano dice `1 save`, `2 shares`, `0 comments`
  // según el número. Sin el singular, todo corte con un `1 save` pierde ese dato.
  save: 'bookmarks',
  share: 'shares',
  comment: 'replies',
  reply: 'replies',
  like: 'likes',
  view: 'views',
  follow: 'follows',
  repost: 'reposts',
  'profile visit': 'profileVisits',
  // `views` es el alcance de Instagram. Faltaba, y por eso las 55 piezas de IG
  // de Tegu y las 23 del vault personal ordenaban en cero: el orden usa
  // impressions, que en IG no existe.
  views: 'views',
};

// El contrato vigente, con dos partes opcionales que el vault sí usa:
//   snapshot <fecha> (<horizonte>) @<cuenta>: k=v k=v
// La cuenta la escribe solo el vault de Tegu (17 cortes de @ig_tegu, 8 de
// @x_tegu al 2026-09-26). Exigir el `:` pegado al paréntesis —como hacía el
// parser antes de este change— dejaba esos 25 archivos sin un solo corte leído.
const CONTRACT_RE = /^snapshot\s+(\d{4}-\d{2}-\d{2})\s*(?:\(([^)]+)\))?\s*(?:@([^\s:]+))?\s*:\s*(.*)$/i;
const PROSE_RE = /^(\d{4}-\d{2}-\d{2})\s+(\S+?)\s*:\s*(.*)$/;

function assign(snap: Snapshot, rawKey: string, rawVal: string): void {
  const field = SNAP_KEYS[rawKey.trim().toLowerCase()];
  if (!field) return;
  const n = parseNum(rawVal);
  if (n === undefined) return;
  (snap[field] as number) = n;
}

/** `imp=121691 eng=28179` -> campos. Ignora tokens de clave desconocida. */
function readTokens(body: string, snap: Snapshot): void {
  for (const tok of body.trim().split(/\s+/)) {
    const eq = tok.indexOf('=');
    if (eq < 1) continue;
    assign(snap, tok.slice(0, eq), tok.slice(eq + 1));
  }
}

/**
 * Prosa separada por `·`, en sus DOS órdenes, porque el vault usa los dos:
 *
 *   `2.206 imp · 603 eng (27%) · 69 expands`          número primero (Tegu)
 *   `impressions 744 · engagements 146 (19,6%)`       nombre primero (personal)
 *
 * Los porcentajes entre paréntesis son derivadas y se descartan: se recalculan
 * en metrics.ts, y persistir una derivada la deja envejecer contra su base.
 */
function readProse(body: string, snap: Snapshot): void {
  for (const seg of body.split('·')) {
    const s = seg.trim().replace(/\s*\([^)]*\)\s*$/, '');
    let m = s.match(/^([\d][\d.,]*)\s+([A-Za-zá-úÁ-Ú_ ]+)$/);
    if (m) { assign(snap, m[2], m[1]); continue; }
    m = s.match(/^([A-Za-zá-úÁ-Ú_ ]+?)\s+([\d][\d.,]*)$/);
    if (m) assign(snap, m[1], m[2]);
  }
}

/**
 * Lee una línea de corte en cualquiera de las tres gramáticas.
 * Devuelve `null` si la línea no es un corte reconocible — nunca un corte vacío,
 * que se vería como una medición de cero.
 */
export function parseSnapshotLine(line: string): Snapshot | null {
  const s = line.trim().replace(/^[-*]\s+/, '');

  // 1. Formato vigente del contrato.
  const c = s.match(CONTRACT_RE);
  if (c) {
    const snap: Snapshot = { t: (c[2] ?? '').trim(), date: c[1] };
    if (c[3]) snap.account = c[3];
    readTokens(c[4], snap);
    // La cabecera es la del contrato pero el cuerpo puede venir en prosa
    // (`snapshot 2026-07-16 (+2d): 943 views · 296 reach`). Se intenta la
    // prosa solo si no hubo un solo token: así una línea bien formada nunca
    // pasa por el camino tolerante.
    if (!hasAnyMetric(snap)) readProse(c[4], snap);
    if (!snap.t) snap.t = 'lifetime';
    return snap;
  }

  // 1b. Un corte anotado a mano: `snapshot 1 hora completa (21:54): impressions
  // 744 · engagements 146`. La etiqueta del horizonte es prosa, no una fecha, y
  // el cuerpo va en prosa. Es una medición real escrita antes del contrato: la
  // alternativa a leerla es tirar números que alguien midió.
  // Greedy a propósito: la etiqueta puede traer su propio `:` —`1 hora completa
  // (21:54)`— y cortar en el primero deja la etiqueta partida y se come la
  // primera métrica del cuerpo.
  const libre = s.match(/^snapshot\s+(.+)\s*:\s*(.+)$/i);
  if (libre) {
    const snap: Snapshot = { t: libre[1].trim() };
    const d = libre[1].match(/\d{4}-\d{2}-\d{2}/);
    if (d) snap.date = d[0];
    readTokens(libre[2], snap);
    readProse(libre[2], snap);
    return hasAnyMetric(snap) ? snap : null;
  }

  // 2. Prosa con fecha adelante.
  const p = s.match(PROSE_RE);
  if (p) {
    const snap: Snapshot = { t: p[2].trim(), date: p[1] };
    readProse(p[3], snap);
    return hasAnyMetric(snap) ? snap : null;
  }

  // 3. Tokens sueltos con horizonte en `t=`.
  if (/(^|\s)t=/.test(s)) {
    const snap: Snapshot = { t: '' };
    for (const tok of s.trim().split(/\s+/)) {
      const eq = tok.indexOf('=');
      if (eq < 1) continue;
      const k = tok.slice(0, eq);
      const v = tok.slice(eq + 1);
      if (k === 't') snap.t = v;
      else assign(snap, k, v);
    }
    return snap.t ? snap : null;
  }

  return null;
}

export function hasAnyMetric(snap: Snapshot): boolean {
  return Object.keys(snap).some((k) => k !== 't' && k !== 'date' && snap[k as keyof Snapshot] != null);
}

/**
 * Colapsa las métricas que el vault personal escribe como bullets sueltos de
 * primer nivel (`- likes: 47`) en un corte implícito.
 *
 * Sin esto, una pieza con sus números cargados así se lee como una pieza sin
 * números. Al 2026-09-26 son 2 archivos —no los ~60 que estimaba el proposal,
 * medido con grep sobre el vault— pero es la forma que usa la captura a mano,
 * así que el número sube cada vez que alguien carga una pieza sin el ingest.
 *
 * El corte resultante NO lleva fecha propia: la del campo `date` de la pieza es
 * la de publicación, no la de medición, y usarla sería inventar una medición.
 */
export function snapshotFromFields(fields: Record<string, string>): Snapshot | null {
  const snap: Snapshot = { t: 'lifetime' };
  for (const [k, v] of Object.entries(fields)) {
    if (!v?.trim()) continue; // clave presente y vacía = pendiente, no cero
    assign(snap, k, v);
  }
  return hasAnyMetric(snap) ? snap : null;
}

export function parseSnapshots(lines: string[]): Snapshot[] {
  const out: Snapshot[] = [];
  for (const line of lines) {
    const s = parseSnapshotLine(line);
    if (s && hasAnyMetric(s)) out.push(s);
  }
  return out;
}
