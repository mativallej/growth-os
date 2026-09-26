import { describe, expect, it } from 'vitest';
import { parseSnapshotLine, parseSnapshots, snapshotFromFields } from './snapshots';

describe('formato vigente del contrato', () => {
  it('lee un corte con fecha, horizonte y tokens', () => {
    const s = parseSnapshotLine('- snapshot 2026-09-23 (+42d): views=933 reach=503 likes=14 saves=1 comments=2');
    expect(s).toMatchObject({
      t: '+42d',
      date: '2026-09-23',
      views: 933,
      reach: 503,
      likes: 14,
      bookmarks: 1, // saves e IG -> bookmarks, mismo concepto que en X
      replies: 2,   // comments -> replies
    });
  });

  it('conserva el horizonte declarado en la línea', () => {
    expect(parseSnapshotLine('snapshot 2026-09-25 (+197d): views=3992')?.t).toBe('+197d');
  });

  it('lee la cuenta cuando el corte la declara', () => {
    // Tegu escribe `@ig_tegu` entre el horizonte y los dos puntos. Exigir el `:`
    // pegado al paréntesis dejaba 25 archivos sin un solo corte.
    const s = parseSnapshotLine('- snapshot 2026-09-25 (+197d) @ig_tegu: views=3992 reach=2741');
    expect(s?.account).toBe('ig_tegu');
    expect(s?.views).toBe(3992);
  });

  it('lee un cuerpo en prosa bajo una cabecera de contrato', () => {
    const s = parseSnapshotLine('- snapshot 2026-07-16 (+2d): 943 views · 296 reach · 18 likes · 1 save');
    expect(s).toMatchObject({ t: '+2d', date: '2026-07-16', views: 943, reach: 296, likes: 18, bookmarks: 1 });
  });
});

describe('formatos históricos — conviven con el vigente', () => {
  it('lee el formato de tokens con t=', () => {
    const s = parseSnapshotLine('- t=+70d imp=10768 eng=2496 detail=276 pv=154 likes=66 rt=8 bmk=25');
    expect(s).toMatchObject({
      t: '+70d', impressions: 10768, engagements: 2496,
      detailExpands: 276, profileVisits: 154, likes: 66, reposts: 8, bookmarks: 25,
    });
  });

  it('acepta un horizonte sin signo, como t=final', () => {
    expect(parseSnapshotLine('- t=final imp=152000 detail=33520')?.t).toBe('final');
  });

  it('lee prosa con el número adelante', () => {
    const s = parseSnapshotLine('- 2026-07-08 +1h30: 2.206 imp · 603 eng (27%) · 69 expands · 48 profile visits');
    expect(s).toMatchObject({ t: '+1h30', date: '2026-07-08', impressions: 2206, engagements: 603, detailExpands: 69, profileVisits: 48 });
  });

  it('lee prosa con el nombre adelante', () => {
    const s = parseSnapshotLine('- snapshot 1 hora completa (21:54): impressions 744 · engagements 146 (19,6%) · likes 12 · replies 2');
    expect(s).toMatchObject({ impressions: 744, engagements: 146, likes: 12, replies: 2 });
  });

  it('descarta el porcentaje entre paréntesis, que es una derivada', () => {
    const s = parseSnapshotLine('- 2026-07-08 +2h: 2.580 imp · 713 eng (27%)');
    expect(s?.engagements).toBe(713); // no 27
  });

  it('los dos formatos conviven en la misma pieza', () => {
    const snaps = parseSnapshots([
      '2026-07-08 +1h30: 2.206 imp · 603 eng',
      't=+70d imp=10768 eng=2496',
    ]);
    expect(snaps).toHaveLength(2);
    expect(snaps[0].impressions).toBe(2206);
    expect(snaps[1].impressions).toBe(10768);
  });
});

describe('lo que NO es un corte', () => {
  it('devuelve null en vez de un corte vacío', () => {
    // Un corte sin métricas se vería como una medición de cero.
    expect(parseSnapshotLine('- notas: pasó brain-voice-critic')).toBeNull();
    expect(parseSnapshotLine('analytics: pendiente')).toBeNull();
    expect(parseSnapshotLine('')).toBeNull();
  });

  it('no cuenta un corte sin ninguna métrica reconocible', () => {
    expect(parseSnapshots(['snapshot 2026-09-23 (+1d): foo=1 bar=2'])).toHaveLength(0);
  });
});

describe('snapshotFromFields — métricas escritas como bullets sueltos', () => {
  it('colapsa los bullets con número en un corte implícito', () => {
    const s = snapshotFromFields({ impressions: '1.788', likes: '47', bookmarks: '12' });
    expect(s).toMatchObject({ t: 'lifetime', impressions: 1788, likes: 47, bookmarks: 12 });
  });

  it('una clave presente y vacía es pendiente, no cero', () => {
    expect(snapshotFromFields({ impressions: '', likes: '', bookmarks: '' })).toBeNull();
  });

  it('no inventa fecha de medición a partir de la de publicación', () => {
    // La fecha del campo `date` es cuándo se publicó, no cuándo se midió.
    expect(snapshotFromFields({ likes: '47', date: '2026-08-12' })?.date).toBeUndefined();
  });
});

describe('ida y vuelta con la ingesta', () => {
  it('relee con los mismos valores un corte escrito por la herramienta', () => {
    // Formato exacto que escribe scripts/ingest-analytics.py.
    const escrito = '- snapshot 2026-09-23 (+1d): views=1592 reach=858 likes=47 shares=14';
    const s = parseSnapshotLine(escrito);
    expect(s).toMatchObject({ date: '2026-09-23', t: '+1d', views: 1592, reach: 858, likes: 47, shares: 14 });
  });
});
