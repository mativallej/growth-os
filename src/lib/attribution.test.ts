import { describe, expect, it } from 'vitest';
import {
  circuitoAbierto,
  clavesRepetidas,
  enlaceRastreable,
  senales,
} from './attribution';
import { loadPieces } from './parse';
import type { Piece } from './types';

function pieza(over: Partial<Piece> = {}): Piece {
  return {
    title: 't', path: '/v/t.md', relPath: 't.md', slug: 'una-pieza', source: 'tegu',
    tldr: '', body: '', channel: 'x', channelDerived: false, status: 'published',
    coverage: 'untracked', snapshots: [], ...over,
  };
}

const DESTINO = 'https://tegu.ar/building-in-public';

describe('el enlace rastreable', () => {
  it('lleva la pieza en utm_content, que es lo único que hace que el dato sirva', () => {
    const r = enlaceRastreable(pieza({ id: 'k7m2p9qx' }), DESTINO);
    expect(r.atribuible).toBe(true);
    if (!r.atribuible) return;
    const u = new URL(r.url);
    expect(u.searchParams.get('utm_content')).toBe('k7m2p9qx');
    expect(u.searchParams.get('utm_source')).toBe('x');
    expect(u.searchParams.get('utm_campaign')).toBe('tegu');
  });

  it('es determinista: dos llamadas, el mismo enlace', () => {
    const p = pieza({ id: 'k7m2p9qx' });
    expect(enlaceRastreable(p, DESTINO)).toEqual(enlaceRastreable(p, DESTINO));
  });

  it('prefiere el id sobre el slug, y lo dice', () => {
    const conId = enlaceRastreable(pieza({ id: 'k7m2p9qx' }), DESTINO);
    const sinId = enlaceRastreable(pieza(), DESTINO);
    expect(conId.atribuible && conId.deId).toBe(true);
    // Sin id se usa el slug, pero queda marcado: esa llave sale de la ruta, y un
    // enlace ya publicado no se puede corregir cuando la ruta cambia.
    expect(sinId.atribuible && sinId.deId).toBe(false);
    expect(sinId.atribuible && sinId.clave).toBe('una-pieza');
  });

  it('NO devuelve un enlace a medias cuando falta el canal', () => {
    // Un enlace sin canal identifica la campaña y no de dónde vino el clic.
    const r = enlaceRastreable(pieza({ channel: 'unknown' }), DESTINO);
    expect(r.atribuible).toBe(false);
    if (r.atribuible) return;
    expect(r.motivo).toMatch(/no declara canal/);
  });

  it('un destino inválido devuelve el motivo, no una url rota', () => {
    const r = enlaceRastreable(pieza({ id: 'k7m2p9qx' }), 'no-es-una-url');
    expect(r.atribuible).toBe(false);
  });

  it('sin destino no hay enlace', () => {
    expect(enlaceRastreable(pieza({ id: 'x' }), '   ').atribuible).toBe(false);
  });

  it('conserva la query que el destino ya traía', () => {
    const r = enlaceRastreable(pieza({ id: 'k7m2p9qx' }), 'https://tegu.ar/a?ref=nota');
    expect(r.atribuible && new URL(r.url).searchParams.get('ref')).toBe('nota');
  });
});

describe('las claves son únicas', () => {
  it('sobre el corpus real de las dos marcas no hay repetidas', () => {
    // Si dos piezas comparten llave, un registro no se puede asignar a ninguna.
    expect(clavesRepetidas(loadPieces())).toEqual([]);
  });

  it('detecta y reporta las dos rutas cuando se repiten', () => {
    const r = clavesRepetidas([
      pieza({ id: 'dup', relPath: 'a.md' }),
      pieza({ id: 'dup', relPath: 'b.md' }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].paths).toEqual(['a.md', 'b.md']);
  });
});

describe('las tres señales', () => {
  it('ninguna se presenta como un cero cuando no está midiendo', () => {
    const s = senales();
    for (const k of ['clic', 'autoReportada', 'serieTemporal'] as const) {
      const e = s[k];
      expect(e.disponible, k).toBe(false);
      // Lo importante: NO hay un `valor: 0`. Un cero sería una afirmación.
      expect('valor' in e, k).toBe(false);
    }
  });

  it('cada señal no disponible dice qué falta, no solo que falta', () => {
    const s = senales();
    for (const k of ['clic', 'autoReportada', 'serieTemporal'] as const) {
      const e = s[k];
      if (e.disponible) continue;
      expect(e.motivo.length, k).toBeGreaterThan(20);
      expect(e.falta.length, k).toBeGreaterThan(20);
    }
  });

  it('hoy el circuito está abierto de punta a punta', () => {
    expect(circuitoAbierto()).toBe(true);
  });

  it('la vista no rinde una señal sola', () => {
    // Estructural: `senales()` devuelve SIEMPRE las tres. No hay forma de pedir
    // una sin las otras, y una sola parecería la verdad.
    expect(Object.keys(senales()).sort()).toEqual(['autoReportada', 'clic', 'serieTemporal']);
  });
});
