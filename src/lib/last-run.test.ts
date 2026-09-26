import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { antiguedad, describir } from './last-run';
import { getOperation } from './operations';

const temps: string[] = [];
function dir(): string {
  const d = mkdtempSync(join(tmpdir(), 'growth-loop-lastrun-'));
  temps.push(d);
  return d;
}
afterAll(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

const OP = getOperation('sync-contenido'); // periodoDias: 7
const AHORA = new Date('2026-09-24T12:00:00.000Z');

function registro(d: string, id: string, contenido: unknown) {
  writeFileSync(join(d, `last-run-${id}.json`), JSON.stringify(contenido), 'utf8');
}

describe('antigüedad', () => {
  it('sin registro dice que nunca se ejecutó, que no es lo mismo que hace mucho', () => {
    const a = antiguedad(OP, AHORA, dir());
    expect(a.estado).toBe('nunca');
    expect(describir(a)).toBe('nunca se ejecutó');
  });

  it('dentro del período va al día', () => {
    const d = dir();
    registro(d, OP.id, { at: '2026-09-22T12:00:00.000Z', ok: true });
    const a = antiguedad(OP, AHORA, d);
    expect(a.estado).toBe('al-dia');
    expect(describir(a)).toBe('hace 2 días');
  });

  it('pasado el período queda vencida y dice cuál era el período', () => {
    const d = dir();
    registro(d, OP.id, { at: '2026-09-01T12:00:00.000Z', ok: true });
    const a = antiguedad(OP, AHORA, d);
    expect(a.estado).toBe('vencida');
    expect(describir(a)).toBe('hace 23 días — se espera cada 7');
  });

  it('una corrida que falló no cuenta como corrida', () => {
    const d = dir();
    registro(d, OP.id, { at: '2026-09-23T12:00:00.000Z', ok: false });
    expect(antiguedad(OP, AHORA, d).estado).toBe('nunca');
  });

  it('un registro ilegible no rompe: se lee como nunca ejecutada', () => {
    const d = dir();
    writeFileSync(join(d, `last-run-${OP.id}.json`), 'no es json', 'utf8');
    expect(antiguedad(OP, AHORA, d).estado).toBe('nunca');
  });

  it('una operación sin período declarado no puede estar vencida', () => {
    const d = dir();
    const op = getOperation('ideas-capturar'); // periodoDias: null
    registro(d, op.id, { at: '2020-01-01T00:00:00.000Z', ok: true });
    expect(antiguedad(op, AHORA, d).estado).toBe('sin-periodo');
  });
});
