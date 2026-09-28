import { describe, expect, it } from 'vitest';
import { analyticsDebt, cadenceByMonth, formulaUsage, rankBy } from './rollups';
import { formulaCodeOf, type Formula } from './formulas';
import type { Piece, Snapshot } from './types';

const CATALOGO: Formula[] = [
  { code: 'X1', name: 'Storytelling', channel: 'x' },
  { code: 'X2', name: 'Antagonista', channel: 'x' },
  { code: 'A', name: 'Storytelling IG', channel: 'instagram' },
];

function pieza(over: Partial<Piece> = {}): Piece {
  return {
    title: 't', path: '/v/t.md', relPath: 't.md', slug: 't', source: 'tegu',
    tldr: '', body: '', channel: 'x', channelDerived: false, status: 'published',
    coverage: 'untracked', unknownKeys: [], snapshots: [], ...over,
  };
}

const snap = (s: Partial<Snapshot>): Snapshot => ({ t: '+1d', ...s });

describe('cadenceByMonth', () => {
  it('cuenta por mes solo las publicadas con fecha', () => {
    const c = cadenceByMonth([
      pieza({ publishedAt: '2026-07-08' }),
      pieza({ publishedAt: '2026-07-22' }),
      pieza({ publishedAt: '2026-08-01' }),
      pieza({ status: 'draft', publishedAt: '2026-07-10' }),
    ]);
    expect(c.months).toEqual([{ month: '2026-07', count: 2 }, { month: '2026-08', count: 1 }]);
    expect(c.total).toBe(3);
  });

  it('las publicadas SIN fecha se cuentan aparte, no se reparten', () => {
    const c = cadenceByMonth([
      pieza({ publishedAt: '2026-07-08' }),
      pieza(), pieza(), pieza(),
    ]);
    expect(c.undated).toBe(3);
    // Lo crítico: el mes con datos no absorbió las tres sin fecha.
    expect(c.months).toEqual([{ month: '2026-07', count: 1 }]);
  });

  it('con TODO sin fecha no inventa meses', () => {
    const c = cadenceByMonth([pieza(), pieza()]);
    expect(c.months).toEqual([]);
    expect(c.undated).toBe(2);
    expect(c.total).toBe(2);
  });

  it('sin piezas devuelve vacío, no un mes en cero', () => {
    expect(cadenceByMonth([])).toEqual({ months: [], undated: 0, total: 0 });
  });
});

describe('analyticsDebt', () => {
  const hoy = new Date('2026-09-26T00:00:00Z');

  it('lista las publicadas sin números, de la más vieja a la más nueva', () => {
    const d = analyticsDebt([
      pieza({ title: 'nueva', publishedAt: '2026-09-20' }),
      pieza({ title: 'vieja', publishedAt: '2026-07-08' }),
      pieza({ title: 'medida', publishedAt: '2026-07-01', coverage: 'tracked' }),
    ], hoy);
    expect(d.map((r) => r.piece.title)).toEqual(['vieja', 'nueva']);
    expect(d[0].days).toBe(80);
    expect(d[1].days).toBe(6);
  });

  it('una pieza sin fecha da días null y va al final — no "hace 0 días"', () => {
    const d = analyticsDebt([
      pieza({ title: 'sin fecha' }),
      pieza({ title: 'con fecha', publishedAt: '2026-09-25' }),
    ], hoy);
    expect(d.map((r) => r.piece.title)).toEqual(['con fecha', 'sin fecha']);
    expect(d[1].days).toBeNull();
  });

  it('marca las publicadas sin enlace: no se pueden medir', () => {
    const d = analyticsDebt([
      pieza({ publishedAt: '2026-09-01', url: 'https://x.com/1' }),
      pieza({ publishedAt: '2026-09-01' }),
    ], hoy);
    expect(d.map((r) => r.sinEnlace).sort()).toEqual([false, true]);
  });

  it('una pieza pendiente entra igual que una sin trackear', () => {
    const d = analyticsDebt([pieza({ publishedAt: '2026-09-01', coverage: 'pending' })], hoy);
    expect(d).toHaveLength(1);
  });
});

describe('formulaUsage', () => {
  it('incluye las fórmulas de uso CERO — el hallazgo de la vista', () => {
    const r = formulaUsage([pieza({ formula: 'X1 · Storytelling' })], CATALOGO);
    expect(r.used).toEqual([{ code: 'X1', name: 'Storytelling', channel: 'x', count: 1 }]);
    expect(r.unused.map((f) => f.code)).toEqual(['A', 'X2']);
  });

  it('una pieza sin código no se fuerza a ninguna fórmula', () => {
    const r = formulaUsage([pieza({ formula: 'tesis building-in-public (sin código)' })], CATALOGO);
    expect(r.unclassified).toBe(1);
    expect(r.used).toEqual([]);
    // Y ninguna fórmula del catálogo figura usada por accidente.
    expect(r.unused).toHaveLength(3);
  });

  it('un código que el catálogo no declara se muestra, no se descarta', () => {
    // Tegu usa B1-B6 para Blog y el catálogo del vault personal no los conoce.
    const r = formulaUsage([pieza({ formula: 'B1 · Post-mortem' })], CATALOGO);
    expect(r.unclassified).toBe(0);
    expect(r.used.map((f) => f.code)).toEqual(['B1']);
    expect(r.used[0].name).toMatch(/fuera del catálogo/);
  });

  it('sin piezas, todas las del catálogo quedan sin estrenar', () => {
    const r = formulaUsage([], CATALOGO);
    expect(r.used).toEqual([]);
    expect(r.unused).toHaveLength(3);
  });
});

describe('formulaCodeOf', () => {
  it('prefiere el campo del footer sobre la carpeta', () => {
    expect(formulaCodeOf({ formula: 'X2 · Antagonista', relPath: 'X1 - Story/p.md' }, CATALOGO)).toBe('X2');
  });

  it('cae a la carpeta cuando no hay campo', () => {
    expect(formulaCodeOf({ relPath: 'X/X1 - Storytelling/p.md' }, CATALOGO)).toBe('X1');
  });

  it('una carpeta con un código que el catálogo no declara NO clasifica', () => {
    expect(formulaCodeOf({ relPath: 'Blog/Z9 - Lo que sea/p.md' }, CATALOGO)).toBeNull();
  });

  it('prosa sin código da null', () => {
    expect(formulaCodeOf({ formula: 'reflexión filosófica', relPath: 'Blog/p.md' }, CATALOGO)).toBeNull();
  });
});

describe('rankBy', () => {
  it('ordena por absoluto y calcula la tasa sobre el alcance', () => {
    const r = rankBy([
      pieza({ title: 'a', coverage: 'tracked', snapshots: [snap({ impressions: 1000, bookmarks: 10 })] }),
      pieza({ title: 'b', coverage: 'tracked', snapshots: [snap({ impressions: 100, bookmarks: 20 })] }),
    ], 'bookmarks');
    expect(r.map((x) => x.piece.title)).toEqual(['b', 'a']);
    expect(r[0].rate).toBeCloseTo(0.2);
    expect(r[1].rate).toBeCloseTo(0.01);
  });

  it('una pieza de IG rankea por views, no queda fuera por no tener impressions', () => {
    const r = rankBy([
      pieza({ title: 'ig', channel: 'instagram', coverage: 'tracked', snapshots: [snap({ views: 900, reach: 500 })] }),
      pieza({ title: 'x', coverage: 'tracked', snapshots: [snap({ impressions: 400 })] }),
    ], 'reach');
    expect(r.map((x) => x.piece.title)).toEqual(['ig', 'x']);
    expect(r[0].value).toBe(900);
  });

  it('una pieza sin medir NO entra con un cero', () => {
    const r = rankBy([
      pieza({ title: 'medida', coverage: 'tracked', snapshots: [snap({ impressions: 10 })] }),
      pieza({ title: 'sin medir' }),
    ], 'reach');
    expect(r.map((x) => x.piece.title)).toEqual(['medida']);
  });

  it('la tasa es null si falta el alcance, no cero', () => {
    const r = rankBy([pieza({ coverage: 'tracked', snapshots: [snap({ likes: 5 })] })], 'likes');
    expect(r[0].value).toBe(5);
    expect(r[0].rate).toBeNull();
  });
});

describe('ninguna métrica ausente se convierte en cero', () => {
  it('en los cuatro rollups', () => {
    const sinNada = [pieza({ publishedAt: undefined, coverage: 'untracked', snapshots: [] })];
    expect(cadenceByMonth(sinNada).months).toEqual([]);
    expect(analyticsDebt(sinNada, new Date('2026-09-26'))[0].days).toBeNull();
    expect(formulaUsage(sinNada, CATALOGO).used).toEqual([]);
    expect(rankBy(sinNada, 'reach')).toEqual([]);
  });
});
