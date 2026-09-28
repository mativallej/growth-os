import { describe, expect, it } from 'vitest';
import { construirPayload } from './index-payload';
import type { SourceLoad } from './parse';
import type { Piece } from './types';
import type { ContentSource } from './sources';

const FUENTE = { id: 'tegu' } as unknown as ContentSource;

function pieza(over: Partial<Piece> = {}): Piece {
  return {
    title: 't', path: '/v/t.md', relPath: 't.md', slug: 't', source: 'tegu',
    tldr: '', body: '', channel: 'x', channelDerived: false, status: 'published',
    coverage: 'untracked', unknownKeys: [], snapshots: [], ...over,
  };
}

function carga(pieces: Piece[], over: Partial<SourceLoad> = {}): SourceLoad {
  return {
    source: FUENTE,
    pieces,
    unreadable: [],
    withoutId: pieces.filter((p) => !p.id),
    duplicateIds: [],
    ...over,
  };
}

const payload = (pieces: Piece[], over?: Partial<SourceLoad>) =>
  construirPayload([carga(pieces, over)], [], []);

describe('construirPayload', () => {
  it('deja afuera las piezas sin id y las cuenta', () => {
    const p = payload([
      pieza({ id: 'a', relPath: 'a.md' }),
      pieza({ relPath: 'b.md' }),
      pieza({ relPath: 'c.md' }),
    ]);
    expect(p.pieces.map((x) => x.id)).toEqual(['a']);
    // No se inventa un id ni se llavea por ruta: se declara la pérdida.
    expect(p.pieces_without_id).toBe(2);
  });

  it('no arrastra las hijas de una pieza que quedó afuera', () => {
    // Sin esto el insert de `distribuciones` reventaría contra el FK, y el
    // rebuild abortaría entero por una pieza que solo faltaba backfillear.
    const p = payload([
      pieza({ relPath: 'sin-id.md', distribucion: [{ cuenta: 'tegu_x', url: 'u' }], snapshots: [{ t: '+1d', likes: 3 }] }),
    ]);
    expect(p.distribuciones).toEqual([]);
    expect(p.snapshots).toEqual([]);
  });

  /**
   * LA REGRESIÓN QUE EL ESQUEMA TENÍA. La llave era `(piece_id, cuenta)` y dos
   * piezas reales del vault publican la misma cuenta dos veces —el blog en dos
   * idiomas—. El insert reventaba y el índice no se podía construir.
   */
  it('conserva dos entradas de la MISMA cuenta, con orden distinto', () => {
    const p = payload([
      pieza({
        id: 'a',
        distribucion: [
          { cuenta: 'blog_mati', url: 'https://m.com/x' },
          { cuenta: 'blog_mati', url: 'https://m.com/es/x' },
        ],
      }),
    ]);
    expect(p.distribuciones).toHaveLength(2);
    expect(p.distribuciones.map((d) => d.ord)).toEqual([0, 1]);
    expect(p.distribuciones.map((d) => d.url)).toEqual(['https://m.com/x', 'https://m.com/es/x']);
  });

  it('numera los cortes por su posición en el archivo', () => {
    const p = payload([
      pieza({ id: 'a', snapshots: [{ t: '+1h' }, { t: '+24h' }, { t: '+7d' }] }),
    ]);
    expect(p.snapshots.map((s) => [s.t, s.ord])).toEqual([['+1h', 0], ['+24h', 1], ['+7d', 2]]);
  });

  it('distingue una métrica en cero de una métrica ausente', () => {
    // `0 impresiones` es un dato; `sin medir` es otra cosa. Un `|| null` las
    // colapsaría, y la vista de deuda se apoya justo en esa diferencia.
    const p = payload([pieza({ id: 'a', snapshots: [{ t: '+1d', impressions: 0 }] })]);
    expect(p.snapshots[0].impressions).toBe(0);
    expect(p.snapshots[0].likes).toBeNull();
  });

  it('manda los ids duplicados para que la base aborte diciendo cuáles', () => {
    const dup = [{ id: 'a', paths: ['x.md', 'y.md'] }];
    const p = payload([pieza({ id: 'a' })], { duplicateIds: dup });
    expect(p.duplicate_ids).toEqual(dup);
  });

  it('aplana varias cargas en vez de quedarse con la primera', () => {
    const p = construirPayload(
      [carga([pieza({ id: 'a', relPath: 'a.md' })]), carga([pieza({ id: 'b', relPath: 'b.md' })])],
      [],
      [],
    );
    expect(p.pieces.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('el string vacío llega como NULL, no como ""', () => {
    const p = payload([pieza({ id: 'a', tldr: '', canal: '', verdict: '  ' })]);
    expect(p.pieces[0].tldr).toBeNull();
    expect(p.pieces[0].canal).toBeNull();
    expect(p.pieces[0].verdict).toBeNull();
  });

  it('conserva el crudo del vault al lado del derivado', () => {
    const p = payload([
      pieza({ id: 'a', date: 'Publicado 2026-07-08', publishedAt: '2026-07-08', channelDerived: true }),
    ]);
    expect(p.pieces[0].date_raw).toBe('Publicado 2026-07-08');
    expect(p.pieces[0].published_at).toBe('2026-07-08');
    expect(p.pieces[0].channel_derived).toBe(true);
  });
});
