import { describe, expect, it } from 'vitest';
import { esHttp, hostDe, redDeUrl } from './enlaces';

describe('esHttp', () => {
  it('acepta http y https', () => {
    expect(esHttp('https://drive.google.com/file/d/abc/view')).toBe(true);
    expect(esHttp('http://ejemplo.com')).toBe(true);
    expect(esHttp('  https://x.com/tegu_app/status/1  ')).toBe(true);
  });

  it('RECHAZA los esquemas que ejecutan', () => {
    // El valor sale de un .md que escribe una persona y termina en un `href`.
    // Un `javascript:` ahí ejecuta al hacer click, y un `data:` sirve una página
    // entera. La lista es BLANCA a propósito: una de prohibidos se queda corta
    // con el próximo esquema que aparezca.
    expect(esHttp('javascript:alert(1)')).toBe(false);
    expect(esHttp('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(esHttp('vbscript:msgbox(1)')).toBe(false);
    expect(esHttp('file:///etc/passwd')).toBe(false);
  });

  it('rechaza lo que no es una URL absoluta', () => {
    expect(esHttp('')).toBe(false);
    expect(esHttp(undefined)).toBe(false);
    expect(esHttp('pendiente')).toBe(false);
    expect(esHttp('/ruta/relativa')).toBe(false);
    expect(esHttp('drive.google.com/abc')).toBe(false);
  });
});

describe('hostDe', () => {
  it('saca el host sin www, para decir de dónde es sin repetir la URL', () => {
    expect(hostDe('https://www.notion.so/abc')).toBe('notion.so');
    expect(hostDe('https://drive.google.com/file/d/x')).toBe('drive.google.com');
    expect(hostDe('https://x.com/tegu_app/status/1')).toBe('x.com');
  });

  it('devuelve vacío en vez de romper con algo que no parsea', () => {
    expect(hostDe('no es una url')).toBe('');
  });
});

describe('redDeUrl', () => {
  it('nombra la red por el host, incluidas las que `Channel` no conoce', () => {
    // `Channel` es x · instagram · linkedin · blog · reddit. Una pieza publicada
    // en TikTok o YouTube cae en `unknown` ahí, pero su url no miente.
    expect(redDeUrl('https://www.tiktok.com/@tegu/video/123')).toBe('TikTok');
    expect(redDeUrl('https://youtu.be/abc')).toBe('YouTube');
    expect(redDeUrl('https://www.youtube.com/shorts/abc')).toBe('YouTube');
  });

  it('x.com y twitter.com son la misma red', () => {
    expect(redDeUrl('https://x.com/tegu_app/status/1')).toBe('X');
    expect(redDeUrl('https://twitter.com/tegu_app/status/1')).toBe('X');
  });

  it('un host desconocido se muestra tal cual, sin inventarle una etiqueta', () => {
    // "Ver en substack.com" es honesto; "Ver en Blog" sería una etiqueta que
    // nadie declaró.
    expect(redDeUrl('https://tegu.substack.com/p/x')).toBe('tegu.substack.com');
  });

  it('no confunde un dominio que solo CONTIENE el nombre', () => {
    expect(redDeUrl('https://notx.com/a')).toBe('notx.com');
    expect(redDeUrl('https://tiktok.com.phishing.net/a')).toBe('tiktok.com.phishing.net');
  });

  it('sin url válida devuelve vacío en vez de romper', () => {
    expect(redDeUrl('no es una url')).toBe('');
  });
});
