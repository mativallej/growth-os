import { describe, expect, it } from 'vitest';
import {
  channelFromPath,
  normalizeChannel,
  normalizeStatus,
  parseDate,
  parseNum,
} from './normalize';

describe('parseNum — la regla de miles es estrecha a propósito', () => {
  it('quita los puntos solo cuando el string entero es un número con miles', () => {
    expect(parseNum('13.301')).toBe(13301);
    expect(parseNum('1.234.567')).toBe(1234567);
  });

  it('NO toca un decimal: 2.4 es 2,4 y no 24', () => {
    expect(parseNum('2.4')).toBe(2.4);
    expect(parseNum('19.6')).toBe(19.6);
  });

  it('lee un número pelado y uno con porcentaje', () => {
    expect(parseNum('374094')).toBe(374094);
    expect(parseNum('27%')).toBe(27);
  });

  it('devuelve undefined —no 0— para lo que no es número', () => {
    // Un 0 acá haría ver una pieza sin medir como una pieza medida en cero.
    expect(parseNum('')).toBeUndefined();
    expect(parseNum(undefined)).toBeUndefined();
    expect(parseNum('30.448 (followers 10% · non-followers 90%)')).toBeUndefined();
    expect(parseNum('pendiente')).toBeUndefined();
  });
});

describe('parseDate', () => {
  it('extrae la fecha de adentro de un estado', () => {
    // Tegu escribe `estado: Publicado 2026-07-08`; sin esto reportaba 0 fechas.
    expect(parseDate('Publicado 2026-07-08')).toBe('2026-07-08');
    expect(parseDate('Publicado 2026-09-23 21:46 ART')).toBe('2026-09-23');
  });

  it('no inventa fecha cuando no la hay', () => {
    expect(parseDate('Publicado (fecha pendiente, ~marzo)')).toBeUndefined();
    expect(parseDate('Draft')).toBeUndefined();
    expect(parseDate(undefined)).toBeUndefined();
  });

  it('rechaza una fecha imposible en vez de aceptarla', () => {
    expect(parseDate('2026-13-45')).toBeUndefined();
  });
});

describe('normalizeChannel — dos nombres para el mismo canal', () => {
  it('Twitter y X normalizan al mismo canal', () => {
    // El vault personal escribe `X`, el de Tegu escribe `Twitter`.
    expect(normalizeChannel('Twitter')).toBe('x');
    expect(normalizeChannel('X')).toBe('x');
    expect(normalizeChannel('Twitter')).toBe(normalizeChannel('X'));
  });

  it('reconoce los canales del vault, sin importar mayúsculas ni sufijos', () => {
    expect(normalizeChannel('Instagram')).toBe('instagram');
    expect(normalizeChannel('instagram')).toBe('instagram');
    expect(normalizeChannel('LinkedIn')).toBe('linkedin');
    expect(normalizeChannel('Blog')).toBe('blog');
    expect(normalizeChannel('Reddit')).toBe('reddit');
    expect(normalizeChannel('Twitter (thread)')).toBe('x');
  });

  it('cae en unknown ante lo que no reconoce, sin adivinar', () => {
    expect(normalizeChannel('TikTok')).toBe('unknown');
    expect(normalizeChannel('')).toBe('unknown');
    expect(normalizeChannel(undefined)).toBe('unknown');
  });
});

describe('channelFromPath — el canal se deduce de la ubicación', () => {
  it('lo saca del segmento de ruta que lo identifica', () => {
    expect(channelFromPath('Personal Brand/Content/Create/Instagram/E - Origin/x.md')).toBe('instagram');
    expect(channelFromPath('Create/Organic/X/X1 - Storytelling/tweet-040.md')).toBe('x');
    expect(channelFromPath('Create/Organic/Linkedin/post.md')).toBe('linkedin');
  });

  it('devuelve unknown si la ruta no dice nada', () => {
    expect(channelFromPath('Drafts/una idea suelta.md')).toBe('unknown');
  });
});

describe('normalizeStatus — ante la duda, unknown', () => {
  it('reconoce publicado', () => {
    expect(normalizeStatus('publicado')).toBe('published');
    expect(normalizeStatus('Publicado 2026-09-10')).toBe('published');
    expect(normalizeStatus('Publicado y MEDIDO — murió (989 views)')).toBe('published');
  });

  it('NO lee "publicar" como publicado', () => {
    // `draft — NO publicar aún` contiene "publicar": la raíz tiene que ser
    // `publicad`, o esta pieza aparece en la vista de deuda como publicada.
    expect(normalizeStatus('draft — NO publicar aún (esperando la anécdota)')).toBe('draft');
    expect(normalizeStatus('grabado, pendiente publicar')).toBe('in-progress');
  });

  it('un "Publicado (fecha pendiente)" es publicado, no en curso', () => {
    // Contiene "pendiente", que también es señal de in-progress: el orden de
    // los tests importa y este caso lo fija.
    expect(normalizeStatus('Publicado (fecha pendiente, ~marzo 2026)')).toBe('published');
  });

  it('reconoce los demás carriles', () => {
    expect(normalizeStatus('Draft')).toBe('draft');
    expect(normalizeStatus('Draft (guion de trabajo)')).toBe('draft');
    expect(normalizeStatus('Idea')).toBe('idea');
    expect(normalizeStatus('Backlog (post 3 de la serie)')).toBe('backlog');
    expect(normalizeStatus('listo — solo falta grabar')).toBe('in-progress');
  });

  it('un estado ambiguo cae en unknown y NO en published', () => {
    expect(normalizeStatus('en revisión con el equipo')).toBe('unknown');
    expect(normalizeStatus('?')).toBe('unknown');
    expect(normalizeStatus('')).toBe('unknown');
    expect(normalizeStatus(undefined)).toBe('unknown');
  });
});
