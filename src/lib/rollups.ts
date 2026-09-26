import type { Piece } from './types';
import { latest, primaryReach } from './metrics';
import { formulaCodeOf, type Formula } from './formulas';

// Los cuatro análisis que Notion no puede dar, porque no tiene el catálogo ni
// las series. Puros: entran piezas, salen números. Sin I/O, sin fechas de hoy
// implícitas — el "hoy" se pasa, para que los tests no dependan del calendario.
//
// LA REGLA QUE ATRAVIESA TODO ESTE ARCHIVO: un dato ausente sale como ausente.
// Nunca como cero. Un cero es una medición; la ausencia es deuda. Confundirlos
// es lo que hace que un dashboard mienta con cara de informar (regla dura 5).

// ── 1. Cadencia ───────────────────────────────────────────────────────────────

export type MonthBucket = { month: string; count: number };
export type Cadence = {
  months: MonthBucket[];
  /** Piezas que no tienen fecha de publicación. NO se reparten ni se estiman. */
  undated: number;
  /** Total considerado, para que `undated` se pueda leer como proporción. */
  total: number;
};

/**
 * Piezas publicadas por mes.
 *
 * Solo cuentan las que TIENEN fecha. Las que no la tienen se cuentan aparte y
 * se muestran al lado: para Tegu son la mayoría, y repartirlas o esconderlas
 * daría una cadencia inventada. El agujero es el hallazgo.
 */
export function cadenceByMonth(pieces: Piece[]): Cadence {
  const counts = new Map<string, number>();
  let undated = 0;
  for (const p of pieces) {
    if (p.status !== 'published') continue;
    const mes = p.publishedAt?.slice(0, 7);
    if (!mes) {
      undated++;
      continue;
    }
    counts.set(mes, (counts.get(mes) ?? 0) + 1);
  }
  const months = [...counts.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
  return { months, undated, total: pieces.filter((p) => p.status === 'published').length };
}

// ── 2. Deuda de medición ──────────────────────────────────────────────────────

export type DebtRow = {
  piece: Piece;
  /** Días desde la publicación. `null` si la pieza no declara fecha. */
  days: number | null;
  /** Una pieza publicada sin url no se PUEDE medir: es deuda de otro tipo. */
  sinEnlace: boolean;
};

/**
 * Piezas publicadas sin números, de la más vieja a la más nueva.
 *
 * Las que no tienen fecha van al final y no se ordenan por un cero: no se sabe
 * hace cuánto están así, y fingir que es "hace 0 días" las pondría primeras en
 * una lista que se lee de arriba para abajo.
 */
export function analyticsDebt(pieces: Piece[], today: Date = new Date()): DebtRow[] {
  const hoy = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return pieces
    .filter((p) => p.status === 'published' && p.coverage !== 'tracked')
    .map((p) => {
      const t = p.publishedAt ? Date.parse(p.publishedAt + 'T00:00:00Z') : NaN;
      return {
        piece: p,
        days: Number.isNaN(t) ? null : Math.floor((hoy - t) / 86_400_000),
        sinEnlace: !p.url,
      };
    })
    .sort((a, b) => {
      if (a.days === null && b.days === null) return a.piece.title.localeCompare(b.piece.title);
      if (a.days === null) return 1;
      if (b.days === null) return -1;
      return b.days - a.days;
    });
}

// ── 3. Uso de fórmulas ────────────────────────────────────────────────────────

export type FormulaUsage = {
  code: string;
  name: string;
  channel: string;
  count: number;
};
export type FormulaReport = {
  used: FormulaUsage[];
  /** Fórmulas del catálogo con CERO piezas. El hallazgo de esta vista. */
  unused: FormulaUsage[];
  /** Piezas cuyo código no se pudo determinar. No se les fuerza uno. */
  unclassified: number;
};

/**
 * Uso por código, incluyendo los de uso cero.
 *
 * Esto es lo que Notion no puede hacer ni en principio: una fórmula que nunca se
 * estrenó no tiene fila en ninguna base. Solo aparece cruzando el catálogo
 * contra las piezas, y el catálogo vive en un `.md` del vault.
 */
export function formulaUsage(pieces: Piece[], catalogo: Formula[]): FormulaReport {
  const counts = new Map<string, number>();
  let unclassified = 0;
  for (const p of pieces) {
    const code = formulaCodeOf(p, catalogo);
    if (!code) {
      unclassified++;
      continue;
    }
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  const filas = catalogo.map((f) => ({
    code: f.code,
    name: f.name,
    channel: f.channel,
    count: counts.get(f.code) ?? 0,
  }));

  // Un código usado que el catálogo no declara igual se muestra: es una fórmula
  // nueva que todavía no se documentó, y esconderla perdería piezas del conteo.
  for (const [code, count] of counts) {
    if (!filas.some((f) => f.code === code)) {
      filas.push({ code, name: `${code} (fuera del catálogo)`, channel: 'unknown', count });
    }
  }

  return {
    used: filas.filter((f) => f.count > 0).sort((a, b) => b.count - a.count),
    unused: filas.filter((f) => f.count === 0).sort((a, b) => a.code.localeCompare(b.code)),
    unclassified,
  };
}

// ── 4. Ranking ────────────────────────────────────────────────────────────────

export type RankMetric = 'reach' | 'engagements' | 'bookmarks' | 'follows' | 'likes';

export type RankRow = {
  piece: Piece;
  /** Valor absoluto de la métrica. `null` si no se midió. */
  value: number | null;
  /** La métrica sobre el alcance primario. `null` si falta cualquiera de los dos. */
  rate: number | null;
};

/**
 * Ranking por una métrica, en absoluto y en tasa sobre el alcance primario.
 *
 * Las dos porque cada una sola miente: ordenar por absoluto premia a la pieza
 * que tuvo alcance y no movió a nadie; ordenar por tasa premia a la que movió a
 * los pocos que la vieron. Una pieza de utilidad gana en guardados con alcance
 * mediocre, y eso solo se ve mirando las dos columnas juntas.
 *
 * Las piezas sin medición NO entran con un cero: se excluyen, porque un cero en
 * un ranking es una posición y "no medido" no lo es.
 */
export function rankBy(pieces: Piece[], metric: RankMetric): RankRow[] {
  const valorDe = (p: Piece): number | null => {
    if (metric === 'reach') return primaryReach(p);
    const l = latest(p);
    const v = l?.[metric];
    return typeof v === 'number' ? v : null;
  };

  return pieces
    .map((p) => {
      const value = valorDe(p);
      const alcance = primaryReach(p);
      return {
        piece: p,
        value,
        rate: value != null && alcance != null && alcance > 0 ? value / alcance : null,
      };
    })
    .filter((r) => r.value != null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
}
