import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { enlaceDePieza, leerCorrespondencia } from './notion-links';
import { destinos, destinosDe, destinoPorId, resetDestinosCache } from './destinos';

const temps: string[] = [];
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

const dir = () => {
  const d = mkdtempSync(join(tmpdir(), 'growth-loop-links-'));
  temps.push(d);
  return d;
};

const escribir = (d: string, brand: string, datos: unknown) =>
  writeFileSync(join(d, `notion-links-${brand}.json`), JSON.stringify(datos), 'utf8');

describe('la correspondencia con el tablero', () => {
  it('sin archivo, no hay correspondencia y la app sigue andando', () => {
    expect(leerCorrespondencia('tegu', new Date(), dir())).toEqual({
      correspondencia: null,
      dias: null,
    });
  });

  it('un archivo ilegible se lee como ausente, no rompe', () => {
    const d = dir();
    writeFileSync(join(d, 'notion-links-tegu.json'), '{roto', 'utf8');
    expect(leerCorrespondencia('tegu', new Date(), d).correspondencia).toBeNull();
  });

  it('calcula la antigüedad para poder mostrarla', () => {
    const d = dir();
    const hace3 = new Date(Date.now() - 3 * 86_400_000).toISOString();
    escribir(d, 'tegu', { actualizado: hace3, filas: { k7m2p9qx: 'abc123' } });
    expect(leerCorrespondencia('tegu', new Date(), d).dias).toBe(3);
  });
});

describe('el enlace de una pieza', () => {
  const corr = { actualizado: new Date().toISOString(), filas: { k7m2p9qx: 'abc-123-def' } };

  it('resuelve cuando hay fila conocida', () => {
    expect(enlaceDePieza({ id: 'k7m2p9qx', relPath: 'x.md' }, corr)).toBe(
      'https://www.notion.so/abc123def',
    );
  });

  it('devuelve null cuando la pieza no tiene fila conocida', () => {
    // null NO es "no está en el tablero": es "esta app no sabe cuál es su fila".
    expect(enlaceDePieza({ id: 'zzzzzzzz', relPath: 'x.md' }, corr)).toBeNull();
  });

  it('sin correspondencia devuelve null, no un enlace roto', () => {
    expect(enlaceDePieza({ id: 'k7m2p9qx', relPath: 'x.md' }, null)).toBeNull();
  });

  it('UN ENLACE NUNCA APUNTA A LA FILA DE OTRA MARCA', () => {
    const d = dir();
    escribir(d, 'tegu', { actualizado: new Date().toISOString(), filas: { comun: 'FILA_TEGU' } });
    escribir(d, 'mativallej', { actualizado: new Date().toISOString(), filas: { comun: 'FILA_PERSONAL' } });

    // La correspondencia es POR MARCA: el archivo se llavea por marca, así que
    // ni siquiera se carga la de la otra. Dos piezas con la misma clave en
    // marcas distintas no se pueden cruzar.
    const tegu = leerCorrespondencia('tegu', new Date(), d).correspondencia;
    const personal = leerCorrespondencia('mativallej', new Date(), d).correspondencia;
    const pieza = { id: 'comun', relPath: 'x.md' };

    expect(enlaceDePieza(pieza, tegu)).toContain('FILA_TEGU');
    expect(enlaceDePieza(pieza, tegu)).not.toContain('FILA_PERSONAL');
    expect(enlaceDePieza(pieza, personal)).not.toContain('FILA_TEGU');
  });

  it('cae a la ruta cuando la pieza todavía no tiene id', () => {
    const porRuta = { actualizado: new Date().toISOString(), filas: { 'Create/x.md': 'fila1' } };
    expect(enlaceDePieza({ relPath: 'Create/x.md' }, porRuta)).toBe('https://www.notion.so/fila1');
  });
});

describe('los destinos del workspace', () => {
  it('salen de la config, no del código', () => {
    resetDestinosCache();
    expect(destinos().length).toBeGreaterThan(0);
    expect(destinoPorId('contenido')?.nombre).toBe('Content Creator');
  });

  it('un destino de una marca no se ofrece en la otra', () => {
    // Ads Creator es solo de Tegu.
    expect(destinosDe('tegu').map((d) => d.id)).toContain('ads');
    expect(destinosDe('mativallej').map((d) => d.id)).not.toContain('ads');
  });

  it('un destino SIN dirección no se ofrece: sería un enlace muerto', () => {
    const conUrl = destinos().filter((d) => d.url);
    expect(destinosDe('tegu').every((d) => conUrl.includes(d))).toBe(true);
  });
});
