import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { marcarCorrida } from './marcar-corrida';
import { antiguedad } from './last-run';
import { OPERACIONES } from './operations';

const temps: string[] = [];
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

const dir = () => {
  const d = mkdtempSync(join(tmpdir(), 'growth-loop-run-'));
  temps.push(d);
  return d;
};

const op = OPERACIONES.find((o) => o.id === 'digest')!;

describe('la marca de última corrida', () => {
  it('lo que se escribe es lo que después lee la consola', () => {
    const d = dir();
    expect(antiguedad(op, new Date(), d)).toEqual({ estado: 'nunca' });
    marcarCorrida(op.id, true, 'probando', d);
    const a = antiguedad(op, new Date(), d);
    expect(a.estado).not.toBe('nunca');
  });

  it('una corrida FALLIDA no deja marca de al día', () => {
    const d = dir();
    marcarCorrida(op.id, false, 'explotó', d);
    // Si se guardara igual, la antigüedad diría que está al día cuando falló
    // hace un minuto — peor que no tener el dato.
    expect(antiguedad(op, new Date(), d)).toEqual({ estado: 'nunca' });
  });

  it('distingue no haber corrido nunca de haber corrido hace mucho', () => {
    const d = dir();
    expect(antiguedad(op, new Date(), d).estado).toBe('nunca');

    const hace100 = new Date(Date.now() - 100 * 86_400_000).toISOString();
    writeFileSync(join(d, `last-run-${op.id}.json`), JSON.stringify({ at: hace100, ok: true }), 'utf8');
    const a = antiguedad(op, new Date(), d);
    expect(a.estado).toBe('vencida');
    if (a.estado === 'vencida') expect(a.dias).toBeGreaterThan(op.periodoDias!);
  });

  it('un registro ilegible se lee como nunca, no rompe', () => {
    const d = dir();
    writeFileSync(join(d, `last-run-${op.id}.json`), '{roto', 'utf8');
    expect(antiguedad(op, new Date(), d)).toEqual({ estado: 'nunca' });
  });

  it('el registro es JSON válido y trae el detalle', () => {
    const d = dir();
    marcarCorrida(op.id, true, 'entrega preparada', d);
    const raw = JSON.parse(readFileSync(join(d, `last-run-${op.id}.json`), 'utf8'));
    expect(raw.ok).toBe(true);
    expect(raw.detalle).toBe('entrega preparada');
    expect(Number.isNaN(Date.parse(raw.at))).toBe(false);
  });

  it('marcar dos veces no duplica: el registro es uno por operación', () => {
    const d = dir();
    marcarCorrida(op.id, true, 'primera', d);
    marcarCorrida(op.id, true, 'segunda', d);
    const raw = JSON.parse(readFileSync(join(d, `last-run-${op.id}.json`), 'utf8'));
    expect(raw.detalle).toBe('segunda');
  });
});

describe('nada quedó agendado', () => {
  it('no hay scripts con prefijo cron-', () => {
    // El prefijo mentía: no los dispara ningún cron desde el 2026-09-24.
    const scripts = readdirSync(join(process.cwd(), 'scripts'));
    expect(scripts.filter((f) => f.startsWith('cron-'))).toEqual([]);
  });

  it('ningún script se traga su propia salida', () => {
    const dirScripts = join(process.cwd(), 'scripts');
    for (const f of readdirSync(dirScripts).filter((x) => x.endsWith('.sh'))) {
      const txt = readFileSync(join(dirScripts, f), 'utf8');
      // `exec >> log 2>&1` es lo que hace que un fallo pase desapercibido: los
      // dos agendados que existían fallaron así, y nadie se enteró.
      expect(txt, f).not.toMatch(/exec\s*>>/);
    }
  });
});
