import { describe, expect, it } from 'vitest';
import { bucketDe, mesesDe } from './periodos';

describe('bucketDe', () => {
  it('agrupa por mes, trimestre y año', () => {
    expect(bucketDe('2026-07-17', 'mes')).toBe('2026-07');
    expect(bucketDe('2026-07-17', 'trimestre')).toBe('2026-T3');
    expect(bucketDe('2026-07-17', 'año')).toBe('2026');
  });

  it('los bordes de trimestre caen del lado correcto', () => {
    expect(bucketDe('2026-03-31', 'trimestre')).toBe('2026-T1');
    expect(bucketDe('2026-04-01', 'trimestre')).toBe('2026-T2');
    expect(bucketDe('2026-12-31', 'trimestre')).toBe('2026-T4');
  });

  it('las claves ordenan alfabéticamente igual que cronológicamente', () => {
    const fechas = ['2026-01-05', '2025-12-30', '2026-11-02', '2026-02-01'];
    for (const g of ['mes', 'trimestre', 'año'] as const) {
      const claves = fechas.map((f) => bucketDe(f, g));
      const porClave = [...claves].sort();
      const porFecha = [...fechas].sort().map((f) => bucketDe(f, g));
      expect(porClave, g).toEqual(porFecha);
    }
  });

  it('la semana ISO usa el año del JUEVES, no el del día', () => {
    // El 2026-01-01 es jueves, así que abre la semana 1 de 2026.
    expect(bucketDe('2026-01-01', 'semana')).toBe('2026-S01');
    // El 2027-01-01 es viernes: su semana empezó el lunes 2026-12-28 y su jueves
    // cae en 2026, así que es la última semana de 2026. Contarla como S01 de
    // 2027 movería esas piezas de año.
    expect(bucketDe('2027-01-01', 'semana')).toBe('2026-S53');
    expect(bucketDe('2026-12-28', 'semana')).toBe('2026-S53');
  });

  it('la semana va de lunes a domingo', () => {
    // 2026-07-13 es lunes; 2026-07-19, el domingo siguiente.
    expect(bucketDe('2026-07-13', 'semana')).toBe(bucketDe('2026-07-19', 'semana'));
    // Y el domingo anterior NO comparte semana con ese lunes.
    expect(bucketDe('2026-07-12', 'semana')).not.toBe(bucketDe('2026-07-13', 'semana'));
  });

  it('NO se corre de día por zona horaria', () => {
    // Las fechas del vault no tienen hora. Parseadas en local, un 2026-01-01 en
    // UTC-3 se vuelve el 31 de diciembre y cambia de año. Es el bug clásico de
    // agrupar por fecha.
    expect(bucketDe('2026-01-01', 'año')).toBe('2026');
    expect(bucketDe('2026-01-01', 'mes')).toBe('2026-01');
  });
});

describe('mesesDe', () => {
  it('el objetivo mensual se multiplica exacto a trimestre y año', () => {
    expect(mesesDe('mes')).toBe(1);
    expect(mesesDe('trimestre')).toBe(3);
    expect(mesesDe('año')).toBe(12);
  });

  it('a semana devuelve null, y no un número con decimales', () => {
    // Una semana no es una fracción limpia de un mes —son 4,33— así que un
    // objetivo semanal sería una meta que nadie declaró. La vista no la dibuja.
    expect(mesesDe('semana')).toBeNull();
  });
});
