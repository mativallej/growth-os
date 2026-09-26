import { describe, expect, it } from 'vitest';
import { NIVELES, describir, nivelDe, type Umbrales } from './viralidad';
import { cargarUmbrales } from './viralidad-server';

const U: Umbrales = {
  x: { destacado: 20000, viral: 80000 },
  instagram: { destacado: 3500, viral: 11000 },
};

describe('nivelDe', () => {
  it('el umbral es por canal: el mismo alcance cae distinto en X y en Instagram', () => {
    // 15.000 está en la base de X y es viral en Instagram. Es el punto entero de
    // que el umbral no sea único: el p90 de X es siete veces el de Instagram.
    expect(nivelDe(15000, 'x', U)).toBe('normal');
    expect(nivelDe(15000, 'instagram', U)).toBe('viral');
  });

  it('el borde del umbral cuenta como alcanzado', () => {
    expect(nivelDe(80000, 'x', U)).toBe('viral');
    expect(nivelDe(79999, 'x', U)).toBe('destacado');
    expect(nivelDe(20000, 'x', U)).toBe('destacado');
    expect(nivelDe(19999, 'x', U)).toBe('normal');
  });

  it('una pieza sin alcance es "sin medir", NUNCA "no viral"', () => {
    // Afirmar que no es viral sería inferir sin señal: no se midió.
    expect(nivelDe(null, 'x', U)).toBe('sin-medir');
    expect(nivelDe(null, 'blog', U)).toBe('sin-medir');
  });

  it('un canal sin umbral declarado es "sin umbral", NUNCA "no viral"', () => {
    // Al 2026-09-26 blog, linkedin y reddit no tienen una sola pieza medida, así
    // que no hay de dónde sacarles un umbral. Decir que no son virales sería
    // afirmar algo que nadie midió.
    expect(nivelDe(500, 'blog', U)).toBe('sin-umbral');
    expect(nivelDe(999999, 'linkedin', U)).toBe('sin-umbral');
  });

  it('sin `destacado` hay dos niveles y no tres', () => {
    const solo: Umbrales = { x: { viral: 80000 } };
    expect(nivelDe(79999, 'x', solo)).toBe('normal');
    expect(nivelDe(80000, 'x', solo)).toBe('viral');
  });

  it('cero es un alcance medido, no un alcance ausente', () => {
    // La diferencia importa: 0 impresiones es un dato (la pieza no llegó a
    // nadie), y `null` es que nadie lo midió. Colapsarlos perdería el hallazgo.
    expect(nivelDe(0, 'x', U)).toBe('normal');
  });
});

describe('cargarUmbrales', () => {
  it('lee los umbrales declarados en config/viralidad.json', () => {
    const u = cargarUmbrales({});
    expect(u.x?.viral).toBeGreaterThan(0);
    expect(u.instagram?.viral).toBeGreaterThan(0);
    // Los canales sin una sola pieza medida NO tienen umbral inventado.
    expect(u.blog).toBeUndefined();
    expect(u.linkedin).toBeUndefined();
  });

  it('el env reapunta un umbral sin tocar el repo', () => {
    const u = cargarUmbrales({ VIRALIDAD_X_VIRAL: '50000' });
    expect(u.x?.viral).toBe(50000);
    expect(u.instagram?.viral).toBe(cargarUmbrales({}).instagram?.viral);
  });

  it('un umbral que no es número descarta el canal en vez de volverlo inalcanzable', () => {
    // `NaN >= x` es siempre false: dejarlo pasar haría que ninguna pieza de ese
    // canal fuera nunca viral, y sin ningún aviso de por qué.
    expect(cargarUmbrales({ VIRALIDAD_X_VIRAL: 'muchas' }).x).toBeUndefined();
    expect(cargarUmbrales({ VIRALIDAD_X_VIRAL: '0' }).x).toBeUndefined();
    expect(cargarUmbrales({ VIRALIDAD_X_VIRAL: '-5' }).x).toBeUndefined();
  });

  it('un `destacado` por encima del `viral` se ignora en vez de invertir los niveles', () => {
    const u = cargarUmbrales({ VIRALIDAD_X_DESTACADO: '90000' });
    expect(u.x?.viral).toBe(80000);
    expect(u.x?.destacado).toBeUndefined();
    // Sin esto nada caería en destacado y la pieza saltaría de la base a viral.
    expect(nivelDe(85000, 'x', u)).toBe('viral');
    expect(nivelDe(50000, 'x', u)).toBe('normal');
  });
});

describe('describir', () => {
  it('dice con qué criterio se está filtrando', () => {
    expect(describir(U)).toContain('x ≥');
    expect(describir({})).toMatch(/ningún canal/);
  });

  it('los niveles que la UI ofrece son exactamente los que `nivelDe` devuelve', () => {
    const delTipo = new Set(NIVELES.map((n) => n.value));
    const posibles = new Set([
      nivelDe(null, 'x', U),
      nivelDe(0, 'x', U),
      nivelDe(25000, 'x', U),
      nivelDe(999999, 'x', U),
      nivelDe(1, 'blog', U),
    ]);
    for (const p of posibles) expect(delTipo.has(p), p).toBe(true);
    expect(delTipo.size).toBe(posibles.size);
  });
});
