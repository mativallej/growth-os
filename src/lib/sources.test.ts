import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadPieces, loadPiecesBySource } from './parse';
import type { ContentSource } from './sources';
import { allSourceIds, assertRoots, brandsConfig, envVarDe, getSource, listSources } from './sources';

// La primera marca declarada, y SU env var por convención. Los tests de
// mecanismo se escriben contra esto y no contra un id literal: cuando la marca
// personal salió de la config, cuatro tests se cayeron sin que el mecanismo que
// probaban hubiera cambiado. Un test de `listSources` no debería depender de
// cuántas marcas hay.
const MARCA = allSourceIds()[0];
const ENV_VAR = envVarDe(MARCA);

const temps: string[] = [];

function tempVault(): string {
  const dir = mkdtempSync(join(tmpdir(), 'growth-loop-src-'));
  temps.push(dir);
  return dir;
}

function pieza(dir: string, name: string, formula = 'X1 · storytelling'): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, name),
    ['Cuerpo de la pieza.', '', '---', '', '- platform: X', `- formula: ${formula}`, '- status: publicado', ''].join('\n'),
    'utf8',
  );
}

afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

describe('listSources', () => {
  it('sin GROWTH_SOURCES devuelve todas las fuentes declaradas', () => {
    const ids = listSources(undefined).map((s) => s.id);
    // Las fuentes salen de config/sources.json: el test compara contra la
    // config, no contra una lista escrita acá. Agregar una marca no puede
    // obligar a tocar un test.
    expect(ids).toEqual([...allSourceIds()].sort());
    expect(ids).toContain('tegu');
    expect(ids).toEqual(brandsConfig().map((b) => b.id).sort());
  });

  it('recorta el build a las fuentes nombradas', () => {
    expect(listSources('tegu').map((s) => s.id)).toEqual(['tegu']);
    // Repetida y con espacios alrededor: se normaliza y se deduplica.
    expect(listSources(` ${MARCA} , ${MARCA} `).map((s) => s.id)).toEqual([MARCA]);
  });

  it('una fuente inexistente rompe listando las válidas', () => {
    expect(() => listSources('tegu,marketing')).toThrow(/marketing/);
    expect(() => listSources('marketing')).toThrow(new RegExp(allSourceIds().join(', ')));
  });

  it('las raíces son absolutas y no dependen del cwd', () => {
    for (const source of listSources(undefined)) {
      expect(isAbsolute(source.vault)).toBe(true);
      for (const root of source.roots) {
        expect(isAbsolute(root)).toBe(true);
        expect(root.startsWith(source.vault)).toBe(true);
      }
    }
  });

  it('por defecto los vaults cuelgan de ~/vaults', () => {
    // TODAS, no una lista escrita a mano: la regla es que ninguna marca declare
    // una ruta real, porque una ruta real se rompe en silencio al renombrar la
    // carpeta y ya pasó una vez.
    const raiz = join(homedir(), 'vaults');
    for (const s of listSources(undefined, {})) {
      expect(s.vault.startsWith(raiz)).toBe(true);
    }
    expect(listSources(undefined, {}).map((s) => s.vault)).toContain(
      join(homedir(), 'vaults/tegu-growth'),
    );
  });

  it('una raíz relativa por env rompe en vez de resolverla contra el cwd', () => {
    expect(() => listSources(MARCA, { [ENV_VAR]: '../otro-vault' })).toThrow(/relativa/);
  });

  it('VAULT_CONTENT_DIR sigue siendo el alias del content root de Tegu', () => {
    const [tegu] = listSources('tegu', { VAULT_CONTENT_DIR: '/tmp/contenido-viejo' });
    expect(tegu.roots).toEqual(['/tmp/contenido-viejo']);
  });
});

describe('assertRoots', () => {
  it('las raíces declaradas hoy existen en disco', () => {
    expect(() => assertRoots(listSources(undefined))).not.toThrow();
  });

  it('una raíz ausente rompe nombrándola, y nombra la env var que la reapunta', () => {
    const roto = listSources(MARCA, { [ENV_VAR]: '/no/existe' });
    expect(() => assertRoots(roto)).toThrow(/\/no\/existe/);
    // El mensaje tiene que decir CÓMO arreglarlo, no solo que está roto.
    expect(() => assertRoots(roto)).toThrow(new RegExp(ENV_VAR));
  });

  it('getSource tipa una fuente sola y también se valida', () => {
    expect(getSource('tegu').id).toBe('tegu');
  });
});

describe('loadPieces sobre fuentes armadas a mano', () => {
  function fuente(id: string, vault: string, roots: string[], ignore: string[] = []): ContentSource {
    return { id, label: id, brand: id, vault, roots, ignore, envVar: 'VAULT_TEST_DIR' };
  }

  it('una fuente con dos raíces junta las piezas de las dos, y la ruta relativa dice de cuál vino', () => {
    const vault = tempVault();
    pieza(join(vault, 'Create/Organic/X'), 'uno.md');
    pieza(join(vault, 'Create/Ideas'), 'dos.md');

    const [load] = loadPiecesBySource([
      fuente('tegu', vault, [join(vault, 'Create/Organic'), join(vault, 'Create/Ideas')]),
    ]);

    expect(load.pieces).toHaveLength(2);
    expect(load.pieces.map((p) => p.relPath).sort()).toEqual([
      'Create/Ideas/dos.md',
      'Create/Organic/X/uno.md',
    ]);
    expect(load.pieces.every((p) => p.source === 'tegu')).toBe(true);
  });

  it('los prefijos ignorados no entran', () => {
    const vault = tempVault();
    pieza(join(vault, 'Create/Organic'), 'post.md');
    pieza(join(vault, 'Create/Ads'), 'creativo.md');

    const pieces = loadPieces([
      fuente('tegu', vault, [join(vault, 'Create')], [join(vault, 'Create/Ads')]),
    ]);

    expect(pieces.map((p) => p.relPath)).toEqual(['Create/Organic/post.md']);
  });

  it('una raíz que existe pero está vacía completa y reporta cero', () => {
    const vault = tempVault();
    mkdirSync(join(vault, 'Create/Organic'), { recursive: true });

    const [load] = loadPiecesBySource([fuente('tegu', vault, [join(vault, 'Create/Organic')])]);

    expect(load.pieces).toEqual([]);
    expect(load.source.id).toBe('tegu');
  });

  it('una raíz ausente rompe en vez de devolver vacío', () => {
    const vault = tempVault();
    expect(() => loadPieces([fuente('tegu', vault, [join(vault, 'Create/Organic')])])).toThrow(
      /Create\/Organic/,
    );
  });
});
