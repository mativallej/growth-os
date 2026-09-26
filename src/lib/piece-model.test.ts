// Tests del modelo de pieza contra los VAULTS REALES y contra fixtures.
//
// Los que leen el vault real verifican invariantes (nada se descarta, toda
// pieza tiene marca, los identificadores no cambian), no conteos exactos: el
// vault es de un humano y se mueve todos los días. Un test que afirme "141
// piezas" falla el martes por un motivo que no es un bug.

import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadPieces, loadPiecesBySource } from './parse';
import { primaryReach, median } from './metrics';
import type { ContentSource } from './sources';
import { ALL_SOURCE_IDS, listSources } from './sources';
import { inspect } from '../../scripts/audit-vaults.mjs';

const temps: string[] = [];
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

function vaultTemporal(): string {
  const dir = mkdtempSync(join(tmpdir(), 'growth-loop-piece-'));
  temps.push(dir);
  return dir;
}

function fuente(root: string): ContentSource {
  return {
    id: 'tegu', label: 'Fixture', brand: 'tegu',
    vault: root, roots: [root], ignore: [], envVar: 'VAULT_TEGU_DIR',
  };
}

function escribir(dir: string, name: string, lineas: string[]): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), lineas.join('\n'), 'utf8');
}

describe('ninguna pieza se descarta por falta de metadatos', () => {
  it('un archivo sin ningún metadato igual es una pieza, marcada sin trackear', () => {
    const root = vaultTemporal();
    escribir(root, 'sin-footer.md', ['Solo cuerpo.', 'Ni un separador.']);
    const [{ pieces }] = loadPiecesBySource([fuente(root)]);
    expect(pieces).toHaveLength(1);
    expect(pieces[0].coverage).toBe('untracked');
    expect(pieces[0].title).toBe('sin-footer');
  });

  it('distingue una medición declarada pendiente de la ausencia de footer', () => {
    const root = vaultTemporal();
    escribir(root, 'pendiente.md', ['Cuerpo.', '', '---', 'canal: Blog · estado: Draft', 'analytics: pendiente']);
    escribir(root, 'medida.md', ['Cuerpo.', '', '---', '- platform: X', '- snapshot 2026-09-23 (+1d): imp=100']);
    const [{ pieces }] = loadPiecesBySource([fuente(root)]);
    const por = Object.fromEntries(pieces.map((p) => [p.title, p.coverage]));
    expect(por).toEqual({ pendiente: 'pending', medida: 'tracked' });
  });

  it('cuenta y reporta un archivo ilegible, y sigue con el resto', () => {
    const root = vaultTemporal();
    escribir(root, 'buena.md', ['Cuerpo.', '', '---', '- platform: X']);
    const mala = join(root, 'ilegible.md');
    writeFileSync(mala, 'x', 'utf8');
    chmodSync(mala, 0o000);
    try {
      const [{ pieces, unreadable }] = loadPiecesBySource([fuente(root)]);
      // En root el chmod no impide leer; el test solo aplica si de verdad falló.
      if (unreadable.length) {
        expect(unreadable[0].path).toBe(mala);
        expect(pieces.map((p) => p.title)).toContain('buena');
      }
      expect(pieces.length + unreadable.length).toBe(2);
    } finally {
      chmodSync(mala, 0o644);
    }
  });
});

describe('cada pieza conoce su marca', () => {
  it('ninguna pieza del vault real queda sin marca', () => {
    const pieces = loadPieces();
    expect(pieces.length).toBeGreaterThan(0);
    expect(pieces.every((p) => ALL_SOURCE_IDS.includes(p.source))).toBe(true);
  });

  it('el conjunto se particiona por marca sin ambigüedad', () => {
    const loads = loadPiecesBySource();
    const total = loads.reduce((n, l) => n + l.pieces.length, 0);
    const suma = loads.map((l) => l.pieces.filter((p) => p.source === l.source.id).length).reduce((a, b) => a + b, 0);
    expect(suma).toBe(total);
  });
});

describe('alcance primario comparable entre canales', () => {
  it('una pieza de IG no queda en cero al ordenar por alcance', () => {
    const root = vaultTemporal();
    escribir(root, 'ig.md', ['C', '', '---', '- platform: Instagram', '- snapshot 2026-09-23 (+1d): views=933 reach=503']);
    escribir(root, 'x.md', ['C', '', '---', '- platform: X', '- t=+1d imp=500']);
    const [{ pieces }] = loadPiecesBySource([fuente(root)]);
    const ig = pieces.find((p) => p.title === 'ig')!;
    const x = pieces.find((p) => p.title === 'x')!;
    expect(primaryReach(ig)).toBe(933);
    expect(primaryReach(x)).toBe(500);
    // Ordenadas juntas, la de IG queda primera: antes caía última con un 0.
    expect([ig, x].sort((a, b) => (primaryReach(b) ?? 0) - (primaryReach(a) ?? 0))[0].title).toBe('ig');
  });

  it('una pieza sin ninguna métrica de alcance da ausente, no cero', () => {
    const root = vaultTemporal();
    escribir(root, 'sin.md', ['C', '', '---', '- platform: X', '- status: publicado']);
    const [{ pieces }] = loadPiecesBySource([fuente(root)]);
    expect(primaryReach(pieces[0])).toBeNull();
  });

  it('median devuelve null con lista vacía, nunca 0', () => {
    expect(median([])).toBeNull();
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe('normalización con el crudo al lado', () => {
  it('el canal derivado de la ubicación queda registrado como derivado', () => {
    const root = vaultTemporal();
    escribir(join(root, 'Instagram'), 'reel.md', ['C', '', '---', '- status: publicado']);
    const [{ pieces }] = loadPiecesBySource([fuente(root)]);
    expect(pieces[0].channel).toBe('instagram');
    expect(pieces[0].channelDerived).toBe(true);
  });

  it('un canal declarado no se marca como derivado', () => {
    const root = vaultTemporal();
    escribir(join(root, 'Instagram'), 'reel.md', ['C', '', '---', '- platform: Instagram']);
    const [{ pieces }] = loadPiecesBySource([fuente(root)]);
    expect(pieces[0].channelDerived).toBe(false);
  });

  it('el estado crudo sigue disponible junto al normalizado', () => {
    const root = vaultTemporal();
    escribir(root, 'p.md', ['C', '', '---', 'canal: Twitter · estado: Publicado 2026-07-08']);
    const [{ pieces }] = loadPiecesBySource([fuente(root)]);
    expect(pieces[0].status).toBe('published');
    expect(pieces[0].estado).toBe('Publicado 2026-07-08');
    expect(pieces[0].publishedAt).toBe('2026-07-08');
  });

  it('separa el código de fórmula de su nombre largo', () => {
    const root = vaultTemporal();
    escribir(root, 'p.md', ['C', '', '---', 'canal: Twitter · fórmula: X2 · Antagonista (citas→hechos)']);
    const [{ pieces }] = loadPiecesBySource([fuente(root)]);
    expect(pieces[0].formulaCode).toBe('X2');
    expect(pieces[0].formula).toBe('X2 · Antagonista (citas→hechos)');
  });
});

describe('los identificadores públicos no cambian', () => {
  it('el slug sale de la ruta al content root y no se toca slugify', () => {
    const root = vaultTemporal();
    escribir(join(root, 'X', 'X4 - Builder número'), 'tweet-001-aeo.md', ['C', '', '---', '- platform: X']);
    const [{ pieces }] = loadPiecesBySource([fuente(root)]);
    // El acento cae a guión: feo y ESTABLE. Normalizarlo rompería 16 URLs vivas.
    expect(pieces[0].slug).toBe('x-x4-builder-n-mero-tweet-001-aeo');
  });
});

describe('la definición de pieza es única en todo el proyecto', () => {
  it('el audit de Node y el parser reconocen el mismo conjunto de piezas', () => {
    for (const { source, pieces } of loadPiecesBySource(listSources())) {
      const discrepan = pieces.filter(
        (p) => (inspect(p.path) as { cobertura: string }).cobertura !== p.coverage,
      );
      expect({ fuente: source.id, discrepan: discrepan.map((p) => p.relPath) }).toEqual({
        fuente: source.id,
        discrepan: [],
      });
    }
  });
});
