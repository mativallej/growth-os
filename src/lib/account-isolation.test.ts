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
import { allSourceIds, findSource, getSource, listSources } from './sources';

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

describe('una instalación es una marca', () => {
  // ESTE BLOQUE CAMBIÓ DE SENTIDO EL 2026-09-28 (D-17), y vale decir por qué.
  //
  // Antes probaba el RECORTE: `GROWTH_SOURCES=tegu` hacía que la marca personal
  // no entrara al build, y eso era la frontera de privacidad. Con un vault por
  // marca no hay recorte que hacer — `growth-os` se instala una vez por marca,
  // apuntando a su vault y a su base, y las instalaciones no se conocen.
  //
  // El aislamiento no se debilitó: cambió de lugar. Antes era "la otra marca no
  // entra al build"; ahora es "la otra marca no está en esta instalación, ni su
  // vault ni sus credenciales". Lo que SÍ hay que seguir probando es que una URL
  // de otra marca no devuelva contenido.

  it('la config declara UNA marca', () => {
    // Si algún día declara dos, esto se cae y hay que reabrir D-17: el
    // aislamiento volvería a depender de un chequeo en runtime.
    expect(allSourceIds()).toHaveLength(1);
  });

  it('una marca que no es la instalada no existe', () => {
    const instalada = listSources();
    expect(findSource('marca-de-otro', instalada)).toBeUndefined();
    expect(findSource(instalada[0].id, instalada)).toBeDefined();
  });

  it('pedir una fuente inventada rompe en vez de devolver vacío', () => {
    // Fallar ruidoso: un `undefined` que después se lee como "sin piezas" es el
    // cero que parece información.
    expect(() => getSource('marte')).toThrow(/marte/i);
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
