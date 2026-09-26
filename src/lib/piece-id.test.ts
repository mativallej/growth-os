// La identidad de una pieza (D-9): un id propio en el footer que sobrevive a
// mover el archivo, renombrarlo y reorganizar la carpeta.

import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { findDuplicateIds, loadPiecesBySource } from './parse';
import { tokenizeFooter } from './footer';
import type { ContentSource } from './sources';

const temps: string[] = [];
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

function vaultTemporal(): string {
  const dir = mkdtempSync(join(tmpdir(), 'growth-loop-id-'));
  temps.push(dir);
  return dir;
}

function fuente(root: string): ContentSource {
  return {
    id: 'tegu', label: 'Fixture', brand: 'tegu',
    vault: root, roots: [root], ignore: [], envVar: 'VAULT_TEGU_DIR',
  };
}

function escribir(dir: string, name: string, lineas: string[]): string {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, name);
  writeFileSync(p, lineas.join('\n'), 'utf8');
  return p;
}

describe('el tokenizer lee la clave del identificador', () => {
  it('la lee en gramática de bullet', () => {
    expect(tokenizeFooter(['- id: k7m2p9qx', '- platform: X']).fields.id).toBe('k7m2p9qx');
  });

  it('la lee en gramática inline', () => {
    expect(tokenizeFooter(['id: k7m2p9qx', 'canal: Twitter · cuenta: x_mati']).fields.id).toBe('k7m2p9qx');
  });

  it('una pieza sin la clave no trae id', () => {
    expect(tokenizeFooter(['- platform: X', '- status: publicado']).fields.id).toBeUndefined();
  });
});

describe('el identificador sobrevive a que la pieza se mueva', () => {
  it('es el mismo antes y después de cambiar de carpeta y de nombre', () => {
    const root = vaultTemporal();
    const antes = escribir(join(root, 'X', 'X1 - Storytelling'), 'tweet-040.md', [
      'Cuerpo.', '', '---', '- id: k7m2p9qx', '- platform: X', '- status: publicado',
    ]);
    const [{ pieces: p1 }] = loadPiecesBySource([fuente(root)]);
    expect(p1[0].id).toBe('k7m2p9qx');
    const slugAntes = p1[0].slug;

    // Reorganización: otra carpeta y otro nombre de archivo.
    mkdirSync(join(root, 'Archive', 'X9 - Aforismo'), { recursive: true });
    renameSync(antes, join(root, 'Archive', 'X9 - Aforismo', 'renombrado.md'));

    const [{ pieces: p2 }] = loadPiecesBySource([fuente(root)]);
    expect(p2[0].id).toBe('k7m2p9qx');
    // El slug —que es la llave vieja— sí cambió: eso es exactamente lo que el
    // id existe para sobrevivir.
    expect(p2[0].slug).not.toBe(slugAntes);
  });
});

describe('el identificador no se genera al leer', () => {
  it('una pieza sin id se carga igual, marcada como sin identificar', () => {
    const root = vaultTemporal();
    escribir(root, 'sin-id.md', ['Cuerpo.', '', '---', '- platform: X']);
    const [{ pieces, withoutId }] = loadPiecesBySource([fuente(root)]);
    expect(pieces).toHaveLength(1);
    expect(pieces[0].id).toBeUndefined();
    expect(withoutId).toHaveLength(1);
  });

  it('dos lecturas de la misma pieza sin id no inventan valores distintos', () => {
    const root = vaultTemporal();
    escribir(root, 'sin-id.md', ['Cuerpo.', '', '---', '- platform: X']);
    const a = loadPiecesBySource([fuente(root)])[0].pieces[0].id;
    const b = loadPiecesBySource([fuente(root)])[0].pieces[0].id;
    expect(a).toBeUndefined();
    expect(b).toBeUndefined();
    expect(a).toBe(b);
  });
});

describe('los identificadores repetidos se detectan y se reportan', () => {
  it('nombra las dos rutas y no elige una', () => {
    const root = vaultTemporal();
    escribir(root, 'original.md', ['C.', '', '---', '- id: k7m2p9qx', '- platform: X']);
    escribir(root, 'copia.md', ['C.', '', '---', '- id: k7m2p9qx', '- platform: X']);
    const [{ duplicateIds }] = loadPiecesBySource([fuente(root)]);
    expect(duplicateIds).toHaveLength(1);
    expect(duplicateIds[0].id).toBe('k7m2p9qx');
    expect(duplicateIds[0].paths).toEqual(['copia.md', 'original.md']);
  });

  it('no reporta colisión cuando los ids son distintos', () => {
    const root = vaultTemporal();
    escribir(root, 'a.md', ['C.', '', '---', '- id: k7m2p9qx', '- platform: X']);
    escribir(root, 'b.md', ['C.', '', '---', '- id: zf97py33', '- platform: X']);
    expect(loadPiecesBySource([fuente(root)])[0].duplicateIds).toEqual([]);
  });

  it('las piezas sin id no cuentan como colisión entre sí', () => {
    const root = vaultTemporal();
    escribir(root, 'a.md', ['C.', '', '---', '- platform: X']);
    escribir(root, 'b.md', ['C.', '', '---', '- platform: X']);
    expect(findDuplicateIds(loadPiecesBySource([fuente(root)])[0].pieces)).toEqual([]);
  });
});

describe('el identificador es opaco', () => {
  it('no cambia cuando cambian los atributos de la pieza', () => {
    const root = vaultTemporal();
    const p = escribir(root, 'p.md', ['C.', '', '---', '- id: k7m2p9qx', '- platform: X', '- formula: X1', '- status: draft']);
    const antes = loadPiecesBySource([fuente(root)])[0].pieces[0];
    writeFileSync(p, ['C.', '', '---', '- id: k7m2p9qx', '- platform: Instagram', '- formula: E', '- status: publicado'].join('\n'), 'utf8');
    const despues = loadPiecesBySource([fuente(root)])[0].pieces[0];
    expect(despues.id).toBe(antes.id);
    expect(despues.channel).not.toBe(antes.channel);
    expect(despues.status).not.toBe(antes.status);
  });
});
