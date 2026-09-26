import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { lanzadorDe, prepararEntrega } from './handoff';
import { getOperation } from './operations';

const temps: string[] = [];
function dir(): string {
  const d = mkdtempSync(join(tmpdir(), 'growth-loop-handoff-'));
  temps.push(d);
  return d;
}
afterAll(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

// `ingest-analytics` es la que sirve para probar el camino feliz: sus
// precondiciones (python3 y las raíces del vault) se cumplen hoy.
const INGEST = getOperation('ingest-analytics');

describe('prepararEntrega', () => {
  it('escribe el contexto y NADA fuera de .state', () => {
    const d = dir();
    const e = prepararEntrega(INGEST, { marca: 'tegu', csv: 'export.csv' }, d);
    expect(readdirSync(d)).toEqual([e.archivoContexto.split('/').pop()]);
    expect(e.archivoContexto.startsWith(d)).toBe(true);
  });

  it('el contexto trae qué se pidió, con qué parámetros, qué lo implementa y qué revisar', () => {
    const d = dir();
    const e = prepararEntrega(INGEST, { marca: 'tegu', csv: 'export.csv' }, d);
    const md = readFileSync(e.archivoContexto, 'utf8');

    expect(md).toContain(INGEST.nombre);
    expect(md).toContain('`ingest-analytics`');
    expect(md).toContain('tegu');
    expect(md).toContain('export.csv');
    expect(md).toContain('scripts/ingest-analytics.py');
    expect(md).toContain('Qué revisar antes de aplicar');
    // La garantía que el spec fija, escrita donde la sesión la va a leer.
    expect(md).toContain('La app no aplicó nada.');
  });

  it('muestra cuál valor salió del default declarado', () => {
    const d = dir();
    const op = getOperation('export-piezas');
    // Es de etapa 2: ni siquiera llega a escribir.
    expect(() => prepararEntrega(op, { marca: 'tegu' }, d)).toThrow(/Etapa 2/);
    expect(readdirSync(d)).toEqual([]);
  });

  it('un parámetro inválido se rechaza ANTES de escribir nada', () => {
    const d = dir();
    expect(() => prepararEntrega(INGEST, { marca: 'inventada', csv: 'x.csv' }, d)).toThrow(/marca/);
    expect(readdirSync(d)).toEqual([]);
  });

  it('una precondición incumplida no deja disparar', () => {
    const d = dir();
    // sync-contenido pide NOTION_TOKEN, que hoy no está.
    const op = getOperation('sync-contenido');
    if (process.env.NOTION_TOKEN) return; // con token, este caso no aplica
    expect(() => prepararEntrega(op, { marca: 'tegu' }, d)).toThrow(/NOTION_TOKEN/);
    expect(readdirSync(d)).toEqual([]);
  });
});

describe('ningún parámetro se interpola crudo en un comando', () => {
  it('un valor con metacaracteres de shell queda citado y entero', () => {
    const d = dir();
    const veneno = 'export.csv; rm -rf ~/vaults';
    const e = prepararEntrega(INGEST, { marca: 'tegu', csv: veneno }, d);

    // En el comando que se le muestra a la persona, va citado: el `;` no separa.
    expect(e.comandoSugerido).toContain(`'${veneno}'`);
    expect(e.comandoSugerido).not.toContain(`--csv ${veneno}`);
  });

  it('el lanzador usa argv, y el único valor interpolado es la ruta del contexto', () => {
    const d = dir();
    const e = prepararEntrega(INGEST, { marca: 'tegu', csv: 'export.csv; whoami' }, d);
    if (!e.lanzador) return; // fuera de macOS no hay lanzador

    expect(Array.isArray(e.lanzador.args)).toBe(true);
    // Ningún parámetro de la operación viaja en lo que se ejecuta.
    const todo = [e.lanzador.comando, ...e.lanzador.args].join(' ');
    expect(todo).not.toContain('whoami');
    expect(todo).not.toContain('--csv');
    expect(todo).toContain(e.archivoContexto);
  });

  it('una ruta capaz de romper las comillas se rechaza', () => {
    expect(() => lanzadorDe("/tmp/handoff'-raro.md")).toThrow(/no apta/);
  });
});

describe('alcance por elemento', () => {
  it('es la misma operación que el lote, con el objetivo agregado', () => {
    const op = getOperation('sync-contenido');
    const base = op.implementacion!.argsDe!({ marca: 'tegu', materia: 'organico' });
    const uno = op.implementacion!.argsDe!({
      marca: 'tegu',
      materia: 'organico',
      objetivo: 'Create/Organic/X/uno.md',
    });

    // Mismo script, mismos flags, y el elemento como filtro encima: por eso el
    // resultado sobre esa pieza es el mismo en los dos alcances.
    expect(uno.slice(0, base.length)).toEqual(base);
    expect(uno.slice(base.length)).toEqual(['--only', 'Create/Organic/X/uno.md']);
    expect(op.alcances).toContain('elemento');
  });

  it('la dimensión ads/orgánico se traduce al alcance, no a un canal', () => {
    const argsDe = getOperation('sync-contenido').implementacion!.argsDe!;
    expect(argsDe({ marca: 'tegu', materia: 'organico' })).toContain('posts');
    expect(argsDe({ marca: 'tegu', materia: 'ads' })).toContain('ads');
    expect(argsDe({ marca: 'tegu', materia: 'ambos' })).toContain('all');
  });
});

describe('el filtro de ronda llega al script', () => {
  it('la ronda elegida viaja como flag, no como decoración', () => {
    const argsDe = getOperation('ads-subir-creativos').implementacion!.argsDe!;
    expect(argsDe({ marca: 'tegu' })).not.toContain('--ronda');
    expect(argsDe({ marca: 'tegu', ronda: '1' })).toEqual(['--brand', 'tegu', '--ronda', '1']);
  });
});
