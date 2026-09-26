import { describe, expect, it } from 'vitest';
import { splitInline, tokenizeFooter } from './footer';

describe('splitInline — el delimitador que a veces es contenido', () => {
  it('parte donde lo que sigue abre una clave conocida', () => {
    expect(splitInline('canal: Twitter · cuenta: x_mati · formato: tweet')).toEqual([
      'canal: Twitter',
      'cuenta: x_mati',
      'formato: tweet',
    ]);
  });

  it('NO parte cuando el · está adentro de un valor', () => {
    // Este es el caso que rompía el parser: `fórmula: X2 · Antagonista (...)`
    // quedaba en `X2` y el resto del valor se perdía sin dejar rastro.
    expect(
      splitInline('fórmula: X2 · Antagonista (el footer decía: antagonista (citas→hechos))'),
    ).toEqual(['fórmula: X2 · Antagonista (el footer decía: antagonista (citas→hechos))']);
  });

  it('combina los dos casos en la misma línea', () => {
    const segs = splitInline(
      'canal: Twitter · cuenta: x_mati · estado: Publicado 2026-07-08 · fórmula: X2 · Antagonista (A)',
    );
    expect(segs).toHaveLength(4);
    expect(segs[3]).toBe('fórmula: X2 · Antagonista (A)');
  });
});

describe('tokenizeFooter — las dos gramáticas', () => {
  it('lee metadatos con una clave por línea (bullets)', () => {
    const { fields } = tokenizeFooter([
      '- platform: Instagram',
      '- account: mativallej_ig',
      '- date: 2026-08-12',
      '- url: https://www.instagram.com/reel/Db8_VO3x1S7/',
      '- status: publicado',
    ]);
    expect(fields.platform).toBe('Instagram');
    expect(fields.account).toBe('mativallej_ig');
    expect(fields.date).toBe('2026-08-12');
    expect(fields.status).toBe('publicado');
    expect(fields.url).toContain('instagram.com');
  });

  it('lee metadatos con varias claves en una línea (inline)', () => {
    const { fields } = tokenizeFooter([
      'canal: Twitter · cuenta: x_mati · formato: thread (11 tweets) · estado: Publicado 2026-07-08',
    ]);
    expect(fields.platform).toBe('Twitter');
    expect(fields.account).toBe('x_mati');
    expect(fields.formato).toBe('thread (11 tweets)');
    expect(fields.status).toBe('Publicado 2026-07-08');
  });

  it('conserva completo un valor que contiene el delimitador', () => {
    const { fields } = tokenizeFooter([
      'canal: Twitter · fórmula: X2 · Antagonista (el footer decía: antagonista)',
    ]);
    expect(fields.formula).toBe('X2 · Antagonista (el footer decía: antagonista)');
  });

  it('NO interpreta como metadato una línea de prosa con clave desconocida', () => {
    const { fields, unknownKeys } = tokenizeFooter([
      'Detrás de todo esto: +150 builds',
      '- platform: X',
    ]);
    expect(fields).not.toHaveProperty('detrás de todo esto');
    expect(Object.keys(fields)).toEqual(['platform']);
    expect(unknownKeys).toContain('detrás de todo esto');
  });

  it('ignora el contenido de un bloque de código', () => {
    // 10 archivos del vault personal cierran con un prompt de Claude Design
    // cuyas líneas tienen forma de clave: valor.
    const { fields } = tokenizeFooter([
      '- platform: Instagram',
      '```',
      'Slide 1 (texto, hook) — eyebrow: MENTALIDAD',
      'status: esto es parte del prompt, no del footer',
      '```',
      '- date: 2026-07-14',
    ]);
    expect(fields.platform).toBe('Instagram');
    expect(fields.date).toBe('2026-07-14');
    expect(fields.status).toBeUndefined();
  });

  it('separa los cortes de los campos', () => {
    const { fields, snapshotLines } = tokenizeFooter([
      '- platform: X',
      '- snapshot 2026-09-23 (+42d): views=933 reach=503',
      '- t=+70d imp=10768 eng=2496',
    ]);
    expect(fields.platform).toBe('X');
    expect(snapshotLines).toHaveLength(2);
  });

  it('reconoce un corte en prosa fechada sin bloque analytics que lo contenga', () => {
    // `- 2026-07-17 +3min: 13 imp · 11 eng` caía al parseo genérico de claves,
    // donde `2026-07-17 +3min` no matchea, y la medición se perdía entera.
    const { snapshotLines } = tokenizeFooter([
      '- platform: X',
      '- 2026-07-17 +3min: 13 imp · 11 eng · 1 like',
    ]);
    expect(snapshotLines).toEqual(['2026-07-17 +3min: 13 imp · 11 eng · 1 like']);
  });

  it('captura `analytics: pendiente` como nota, no como bloque', () => {
    const { analyticsNote, snapshotLines } = tokenizeFooter([
      'canal: Blog · estado: Draft',
      'analytics: pendiente',
    ]);
    expect(analyticsNote).toBe('pendiente');
    expect(snapshotLines).toHaveLength(0);
  });

  it('registra una clave de métrica presente y vacía, que es señal de pendiente', () => {
    const { fields } = tokenizeFooter(['- impressions:', '- likes:']);
    expect(fields.impressions).toBe('');
    expect(fields.likes).toBe('');
  });
});
