import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { captar, diasEnCola, leerCola, marcarPublicadas, pendientes } from './ideas-queue';

const temps: string[] = [];
function dir(): string {
  const d = mkdtempSync(join(tmpdir(), 'growth-loop-ideas-'));
  temps.push(d);
  return d;
}
afterAll(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('captar', () => {
  it('guarda al instante, sin consultar ningún destino', () => {
    const d = dir();
    const idea = captar('  probar el catálogo  ', 'tegu', d);
    expect(idea.texto).toBe('probar el catálogo');
    expect(idea.publicadaEl).toBeUndefined();
    expect(leerCola(d)).toHaveLength(1);
  });

  it('con el destino inaccesible la idea igual se guarda', () => {
    // No hay forma de "desconectar" el destino desde un test, pero sí de probar lo
    // que importa: captar no toca la red ni el destino. Si lo hiciera, esto
    // dependería de que Notion esté arriba — y no depende.
    const d = dir();
    const antes = Date.now();
    const idea = captar('una idea con el destino caído', 'mativallej', d);
    expect(Date.now() - antes).toBeLessThan(500);
    expect(pendientes(d).map((i) => i.id)).toEqual([idea.id]);
  });

  it('una idea vacía no se guarda', () => {
    const d = dir();
    expect(() => captar('   ', 'tegu', d)).toThrow(/vacía/);
    expect(leerCola(d)).toHaveLength(0);
  });

  it('dos ideas en el mismo segundo no se pisan', () => {
    const d = dir();
    const t = new Date('2026-09-24T12:00:00.000Z');
    const a = captar('una', 'tegu', d, t);
    const b = captar('otra', 'tegu', d, t);
    expect(a.id).not.toBe(b.id);
    expect(leerCola(d)).toHaveLength(2);
  });

  it('una cola ilegible no rompe la captura', () => {
    const d = dir();
    writeFileSync(join(d, 'ideas-queue.json'), '{ esto no es json', 'utf8');
    expect(() => captar('sigue andando', 'tegu', d)).not.toThrow();
  });
});

describe('publicar es idempotente', () => {
  it('publicar dos veces no duplica nada', () => {
    const d = dir();
    const a = captar('una', 'tegu', d);
    const b = captar('otra', 'mativallej', d);

    const primera = pendientes(d).map((i) => i.id);
    expect(primera).toEqual([a.id, b.id]);
    expect(marcarPublicadas(primera, d)).toBe(2);

    // Segunda corrida: no queda nada por publicar, así que no hay con qué duplicar.
    expect(pendientes(d)).toEqual([]);
    expect(marcarPublicadas(primera, d)).toBe(0);
    expect(leerCola(d)).toHaveLength(2);
    expect(leerCola(d).every((i) => i.publicadaEl)).toBe(true);
  });

  it('publicar una no arrastra a las otras', () => {
    const d = dir();
    const a = captar('una', 'tegu', d);
    captar('otra', 'tegu', d);
    marcarPublicadas([a.id], d);
    expect(pendientes(d)).toHaveLength(1);
    expect(pendientes(d)[0].texto).toBe('otra');
  });
});

describe('la cola se ve con su antigüedad', () => {
  it('cuenta los días desde que se captó', () => {
    const d = dir();
    const idea = captar('vieja', 'tegu', d, new Date('2026-09-01T10:00:00.000Z'));
    expect(diasEnCola(idea, new Date('2026-09-24T10:00:00.000Z'))).toBe(23);
  });
});

describe('la escritura es atómica', () => {
  it('no deja el temporal dando vueltas', () => {
    const d = dir();
    captar('una', 'tegu', d);
    expect(() => readFileSync(join(d, 'ideas-queue.json.tmp'), 'utf8')).toThrow();
    expect(JSON.parse(readFileSync(join(d, 'ideas-queue.json'), 'utf8'))).toHaveLength(1);
  });
});
