import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { exportar } from './export';

// EL TEST OBLIGATORIO DE ESTE BLOQUE (tarea 2.4): una exportación pedida desde
// una marca NO puede traer filas de la otra. No es una preferencia de producto:
// es la regla dura 4, y un CSV es el formato más fácil de reenviar por mail.

const temps: string[] = [];
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

function vault(nombre: string, sentinela: string): string {
  const dir = mkdtempSync(join(tmpdir(), `growth-loop-exp-${nombre}-`));
  temps.push(dir);
  const root = join(dir, 'Create', 'Organic');
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, `${nombre}.md`),
    [`Cuerpo con ${sentinela}.`, '', '---', '- platform: X', '- status: publicado',
     '- date: 2026-07-15', '- snapshot 2026-07-16 (+1d): imp=100'].join('\n'),
    'utf8',
  );
  return dir;
}

describe('aislamiento del export', () => {
  it('un export de una marca no trae NADA de la otra', () => {
    const tegu = vault('tegu', 'SENTINELA_TEGU');
    const personal = vault('personal', 'SENTINELA_PERSONAL');
    const previo = { ...process.env };
    process.env.VAULT_TEGU_DIR = tegu;
    process.env.VAULT_PERSONAL_DIR = personal;
    process.env.GROWTH_SOURCES = '';
    try {
      const r = exportar({ marca: 'tegu' });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.contenido).toContain('tegu');
      expect(r.contenido).not.toContain('personal');
      expect(r.filas).toBe(1);
    } finally {
      Object.assign(process.env, previo);
    }
  });

  it('una marca que no entró al build no se puede exportar', () => {
    const previo = { ...process.env };
    process.env.GROWTH_SOURCES = 'tegu';
    try {
      const r = exportar({ marca: 'personal' });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.motivo).toMatch(/no entró a este build/);
    } finally {
      Object.assign(process.env, previo);
    }
  });
});

describe('la cabecera y el caso vacío', () => {
  it('el archivo lleva de dónde salió y con qué filtros', () => {
    const tegu = vault('tegu', 'S');
    const previo = { ...process.env };
    process.env.VAULT_TEGU_DIR = tegu;
    process.env.GROWTH_SOURCES = 'tegu';
    try {
      const r = exportar({ marca: 'tegu', desde: '2026-01-01' });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.contenido).toMatch(/^# growth-loop · export-piezas/);
      expect(r.contenido).toContain('desde=2026-01-01');
      expect(r.contenido).toContain('La fuente de verdad son los .md');
    } finally {
      Object.assign(process.env, previo);
    }
  });

  it('sin resultados devuelve un MENSAJE, no un archivo vacío', () => {
    const tegu = vault('tegu', 'S');
    const previo = { ...process.env };
    process.env.VAULT_TEGU_DIR = tegu;
    process.env.GROWTH_SOURCES = 'tegu';
    try {
      // Un rango donde no hay nada publicado.
      const r = exportar({ marca: 'tegu', desde: '2030-01-01' });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.motivo).toMatch(/No se genera un archivo vacío/);
    } finally {
      Object.assign(process.env, previo);
    }
  });

  it('una pieza sin fecha queda fuera de un rango, no adentro', () => {
    const dir = mkdtempSync(join(tmpdir(), 'growth-loop-exp-sf-'));
    temps.push(dir);
    const root = join(dir, 'Create', 'Organic');
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'sin-fecha.md'), ['C.', '', '---', '- platform: X'].join('\n'), 'utf8');
    const previo = { ...process.env };
    process.env.VAULT_TEGU_DIR = dir;
    process.env.GROWTH_SOURCES = 'tegu';
    try {
      // Sin rango entra; con rango no, porque no se puede AFIRMAR que esté adentro.
      expect(exportar({ marca: 'tegu' }).ok).toBe(true);
      expect(exportar({ marca: 'tegu', desde: '2020-01-01' }).ok).toBe(false);
    } finally {
      Object.assign(process.env, previo);
    }
  });
});

describe('el conteo coincide con el mismo filtro aplicado a mano', () => {
  it('cuenta las filas que el filtro deja pasar', () => {
    const dir = mkdtempSync(join(tmpdir(), 'growth-loop-exp-n-'));
    temps.push(dir);
    const root = join(dir, 'Create', 'Organic');
    mkdirSync(root, { recursive: true });
    for (const [n, fecha] of [['a', '2026-01-10'], ['b', '2026-06-10'], ['c', '2026-09-10']]) {
      writeFileSync(
        join(root, `${n}.md`),
        ['C.', '', '---', '- platform: X', '- status: publicado', `- date: ${fecha}`].join('\n'),
        'utf8',
      );
    }
    const previo = { ...process.env };
    process.env.VAULT_TEGU_DIR = dir;
    process.env.GROWTH_SOURCES = 'tegu';
    try {
      const r = exportar({ marca: 'tegu', desde: '2026-05-01', hasta: '2026-12-31' });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.filas).toBe(2); // b y c, no a
      // Y las filas del CSV coinciden con el conteo declarado en la cabecera.
      const cuerpo = r.contenido.split('\n').filter((l) => l && !l.startsWith('#'));
      expect(cuerpo).toHaveLength(r.filas + 1); // + cabecera de columnas
    } finally {
      Object.assign(process.env, previo);
    }
  });
});
