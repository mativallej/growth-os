import { describe, expect, it } from 'vitest';
import { agruparVariantes, compararVariantes, partirVariante, variantesDe } from './variantes';
import type { Piece, Snapshot } from './types';

function pieza(title: string, relPath: string, snaps: Partial<Snapshot>[] = []): Piece {
  return {
    title, path: `/v/${relPath}`, relPath, slug: title, source: 'personal',
    tldr: '', body: '', channel: 'instagram', channelDerived: false,
    status: 'published', coverage: snaps.length ? 'tracked' : 'untracked',
    unknownKeys: [],
    snapshots: snaps.map((s) => ({ t: '+1d', ...s })),
  };
}

describe('partirVariante', () => {
  it('separa el sufijo de letra del número', () => {
    expect(partirVariante('carousel-002b-camino')).toEqual({ base: 'carousel-002', sufijo: 'b' });
    expect(partirVariante('carousel-002-camino')).toEqual({ base: 'carousel-002', sufijo: '' });
  });

  it('un guión después del número NO es una variante', () => {
    // `tweet-022-thread-recap` es el mismo post, no una variante de tweet-022.
    expect(partirVariante('tweet-022-thread-recap')).toEqual({ base: 'tweet-022', sufijo: '' });
  });

  it('un nombre con fecha no es una pieza numerada', () => {
    // `carousel-2026-01-01-…` es una fecha. Sin este corte, los 10 retroactivos
    // del vault personal entraban como variantes de una pieza inexistente.
    expect(partirVariante('carousel-2026-01-01-2026')).toBeNull();
    expect(partirVariante('reel-2026-08-12-me-obsesione')).toBeNull();
  });

  it('un título sin número no agrupa', () => {
    expect(partirVariante('Jugué con Colidio')).toBeNull();
  });
});

describe('agruparVariantes', () => {
  const carpeta = 'Instagram/E/carousel-001-origin';
  const piezas = [
    pieza('carousel-001-origin', `${carpeta}/carousel-001-origin.md`),
    pieza('carousel-002-soledad', `${carpeta}/carousel-002-soledad.md`),
    pieza('carousel-002b-fiel', `${carpeta}/carousel-002b-fiel.md`),
    pieza('carousel-002c-foto', `${carpeta}/carousel-002c-foto.md`),
    pieza('carousel-003-margen', `${carpeta}/carousel-003-margen.md`),
  ];

  it('encuentra el conjunto que compite, no la carpeta entera', () => {
    const [g] = agruparVariantes(piezas);
    expect(g.piezas).toHaveLength(5);
    // Solo `002` tiene variantes; 001 y 003 son piezas distintas de la serie.
    expect(g.comparables).toHaveLength(1);
    expect(g.comparables[0].clave).toBe('carousel-002');
    expect(g.comparables[0].variantes.map((v) => v.sufijo)).toEqual(['', 'b', 'c']);
  });

  it('una carpeta con una sola pieza no es un grupo', () => {
    expect(agruparVariantes([pieza('a-001', 'X/a-001.md')])).toEqual([]);
  });

  it('piezas de carpetas distintas no se mezclan aunque compartan número', () => {
    const g = agruparVariantes([
      pieza('reel-001-a', 'A/reel-001-a.md'),
      pieza('reel-001b-a', 'A/reel-001b-a.md'),
      pieza('reel-001-b', 'B/reel-001-b.md'),
      pieza('reel-002-b', 'B/reel-002-b.md'),
    ]);
    expect(g.find((x) => x.carpeta === 'A')?.comparables).toHaveLength(1);
    expect(g.find((x) => x.carpeta === 'B')?.comparables ?? []).toHaveLength(0);
  });
});

describe('variantesDe', () => {
  const carpeta = 'IG/serie';
  const piezas = [
    pieza('carousel-002-a', `${carpeta}/carousel-002-a.md`),
    pieza('carousel-002b-b', `${carpeta}/carousel-002b-b.md`),
    pieza('carousel-003-c', `${carpeta}/carousel-003-c.md`),
  ];

  it('devuelve las hermanas que compiten', () => {
    expect(variantesDe(piezas[0], piezas).map((v) => v.sufijo)).toEqual(['', 'b']);
  });

  it('una pieza sin competencia devuelve vacío, no a sí misma', () => {
    expect(variantesDe(piezas[2], piezas)).toEqual([]);
  });
});

describe('compararVariantes', () => {
  it('marca la de mayor alcance medido', () => {
    const vs = [
      { base: 'c-002', sufijo: '', piece: pieza('a', 'x/a.md', [{ views: 900 }]) },
      { base: 'c-002', sufijo: 'b', piece: pieza('b', 'x/b.md', [{ views: 2000 }]) },
    ];
    const r = compararVariantes(vs);
    expect(r.find((x) => x.variante.sufijo === 'b')?.gana).toBe(true);
    expect(r.find((x) => x.variante.sufijo === '')?.gana).toBe(false);
  });

  it('una variante SIN medir no pierde: no compitió', () => {
    const vs = [
      { base: 'c-002', sufijo: '', piece: pieza('a', 'x/a.md', [{ views: 900 }]) },
      { base: 'c-002', sufijo: 'b', piece: pieza('b', 'x/b.md') },
    ];
    const r = compararVariantes(vs);
    expect(r.find((x) => x.variante.sufijo === 'b')?.alcance).toBeNull();
    // Y con una sola medida no se corona a nadie: no hay comparación.
    expect(r.every((x) => !x.gana)).toBe(true);
  });

  it('si ninguna se midió, nadie gana', () => {
    const vs = [
      { base: 'c', sufijo: '', piece: pieza('a', 'x/a.md') },
      { base: 'c', sufijo: 'b', piece: pieza('b', 'x/b.md') },
    ];
    expect(compararVariantes(vs).every((x) => !x.gana)).toBe(true);
  });
});
