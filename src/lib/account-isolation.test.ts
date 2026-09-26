// EL TEST QUE MÁS IMPORTA DE ESTE REPO.
//
// La regla dura 4 dice que las dos marcas no se mezclan, y que la separación es
// estructural, no un filtro. Esto lo verifica: para cada vista de una marca,
// ningún `body` de la otra puede estar en lo que se carga.
//
// No es prolijidad. El contenido personal incluye la historia del despido, y el
// build de Tegu se le comparte al socio. Un filtro en el cliente mandaría ese
// texto, en plano, dentro del payload RSC de una página de Tegu — visible en el
// inspector aunque no se dibuje en pantalla.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadPieces, loadPiecesBySource } from './parse';
import type { ContentSource } from './sources';
import { allSourceIds, findSource, listSources } from './sources';

const temps: string[] = [];
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

function fuenteTemporal(id: 'tegu' | 'personal', sentinela: string): ContentSource {
  const dir = mkdtempSync(join(tmpdir(), `growth-loop-iso-${id}-`));
  temps.push(dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'pieza.md'),
    ['Cuerpo con la sentinela: ' + sentinela, '', '---', '- platform: X', '- status: publicado'].join('\n'),
    'utf8',
  );
  return { id, label: id, brand: id, vault: dir, roots: [dir], ignore: [], envVar: 'VAULT_TEGU_DIR' };
}

describe('aislamiento entre marcas — fixtures', () => {
  const a = fuenteTemporal('tegu', 'SENTINELA_TEGU_xyz');
  const b = fuenteTemporal('personal', 'SENTINELA_PERSONAL_xyz');

  it('cargar una marca no trae NADA de la otra', () => {
    const soloA = loadPieces([a]);
    const serializado = JSON.stringify(soloA);
    expect(serializado).toContain('SENTINELA_TEGU_xyz');
    expect(serializado).not.toContain('SENTINELA_PERSONAL_xyz');

    const soloB = loadPieces([b]);
    expect(JSON.stringify(soloB)).not.toContain('SENTINELA_TEGU_xyz');
  });

  it('cargar las dos las mantiene separadas por fuente', () => {
    const loads = loadPiecesBySource([a, b]);
    for (const { source, pieces } of loads) {
      const otra = source.id === 'tegu' ? 'SENTINELA_PERSONAL_xyz' : 'SENTINELA_TEGU_xyz';
      expect(JSON.stringify(pieces)).not.toContain(otra);
    }
  });
});

describe('aislamiento entre marcas — vaults reales', () => {
  // Términos que existen en el vault personal y NO en el de Tegu, verificados
  // con grep el 2026-09-26: "me desvincularon" (2 archivos vs 0) y
  // "mi viejo" (3 vs 0).
  const SONDAS = ['me desvincularon', 'mi viejo'];

  const fuentes = listSources();
  const tegu = fuentes.find((s) => s.id === 'tegu');
  const personal = fuentes.find((s) => s.id === 'mativallej');

  it.runIf(tegu && personal)('ninguna sonda personal aparece en lo que carga Tegu', () => {
    const payload = JSON.stringify(loadPieces([tegu!])).toLowerCase();
    for (const sonda of SONDAS) {
      expect({ sonda, presente: payload.includes(sonda) }).toEqual({ sonda, presente: false });
    }
  });

  it.runIf(personal)('las sondas SÍ existen en el vault personal — si no, el test no prueba nada', () => {
    // Sin esto, el test de arriba pasaría igual si las sondas dejaran de existir,
    // y estaríamos verificando nada con toda confianza.
    const payload = JSON.stringify(loadPieces([personal!])).toLowerCase();
    expect(SONDAS.some((s) => payload.includes(s))).toBe(true);
  });

  it.runIf(tegu && personal)('las dos marcas no comparten ni una pieza', () => {
    const rutasTegu = new Set(loadPieces([tegu!]).map((p) => p.path));
    const rutasPersonal = loadPieces([personal!]).map((p) => p.path);
    expect(rutasPersonal.filter((p) => rutasTegu.has(p))).toEqual([]);
  });
});

describe('el recorte de fuentes es la frontera del build', () => {
  it('con una sola fuente declarada, la otra no existe', () => {
    const soloTegu = listSources('tegu');
    expect(soloTegu.map((s) => s.id)).toEqual(['tegu']);
    // `findSource` busca entre las que ENTRARON al build: una ruta /personal en
    // un build recortado tiene que no existir, no estar escondida.
    expect(findSource('mativallej', soloTegu)).toBeUndefined();
    expect(findSource('tegu', soloTegu)).toBeDefined();
  });

  it('sin recorte entran TODAS las declaradas', () => {
    // No se comparan contra una lista escrita acá: las marcas salen de la
    // config, y sumar una no puede romper un test de aislamiento.
    expect(listSources('').map((s) => s.id).sort()).toEqual([...allSourceIds()].sort());
  });

  it('una fuente inventada rompe en vez de devolver vacío', () => {
    expect(() => listSources('marte')).toThrow(/no existen/i);
  });
});

describe('ninguna ruta se fabrica bajo demanda', () => {
  // Regresión de un agujero real, encontrado el 2026-09-26 contra `next start`:
  // con GROWTH_SOURCES=tegu, `/personal/piezas` devolvía 200 y servía el vault
  // personal leído en el momento. El build no la emitía; el servidor la
  // fabricaba igual, porque Next por default renderiza bajo demanda un param
  // que `generateStaticParams` no devolvió.
  //
  // Es un test de forma del código y no de comportamiento porque el
  // comportamiento solo se ve con un build servido. Vale igual: lo que puede
  // desaparecer sin que nadie lo note es la línea.
  const SEGMENTOS = [
    'src/app/[account]/layout.tsx',
    'src/app/[account]/piezas/[slug]/page.tsx',
  ];

  it('cada segmento dinámico declara dynamicParams = false', () => {
    for (const rel of SEGMENTOS) {
      const txt = readFileSync(join(process.cwd(), rel), 'utf8');
      expect({ rel, declara: /export const dynamicParams = false/.test(txt) }).toEqual({
        rel,
        declara: true,
      });
    }
  });
});
