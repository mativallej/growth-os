import { describe, expect, it } from 'vitest';
import { distribucionDe, umbralesActuales, validarUmbral } from './config-viralidad';

describe('validarUmbral', () => {
  const base = { canal: 'x', viral: '80000', destacado: '20000' };

  it('acepta un umbral coherente', () => {
    expect(validarUmbral(base)).toBeNull();
  });

  it('vaciar el viral es quitar el criterio, no un error', () => {
    // Es la única forma de volver a "este canal no tiene umbral declarado", que
    // es un estado legítimo y distinto de cero.
    expect(validarUmbral({ ...base, viral: '' })).toBeNull();
  });

  it('rechaza un umbral que no es un número mayor que cero', () => {
    // Un NaN comparado con `>=` da siempre false: ninguna pieza sería viral
    // nunca, y sin ningún aviso de por qué.
    expect(validarUmbral({ ...base, viral: 'muchas' })).toMatch(/número mayor que cero/);
    expect(validarUmbral({ ...base, viral: '0' })).toMatch(/número mayor que cero/);
    expect(validarUmbral({ ...base, viral: '-5' })).toMatch(/número mayor que cero/);
  });

  it('rechaza un destacado que no sea MENOR que el viral', () => {
    // Si fuera mayor o igual, nada caería nunca en "destacada": la pieza saltaría
    // de la base a viral y el nivel del medio existiría sin poder ocuparse.
    expect(validarUmbral({ ...base, destacado: '80000' })).toMatch(/MENOR/);
    expect(validarUmbral({ ...base, destacado: '90000' })).toMatch(/MENOR/);
    expect(validarUmbral({ ...base, destacado: '79999' })).toBeNull();
  });

  it('el destacado vacío es válido: deja dos niveles en vez de tres', () => {
    expect(validarUmbral({ ...base, destacado: '' })).toBeNull();
  });

  it('el mensaje nombra el canal, para saber cuál fila arreglar', () => {
    expect(validarUmbral({ canal: 'instagram', viral: '-1', destacado: '' })).toContain(
      'instagram',
    );
  });
});

describe('distribucionDe', () => {
  it('un canal sin piezas medidas no devuelve percentiles', () => {
    // Devolver ceros diría que el alcance es cero, que es distinto de que nadie
    // lo haya medido. blog, linkedin y reddit están exactamente así.
    const d = distribucionDe('blog', [], 10);
    expect(d.hay).toBe(false);
    if (d.hay) return;
    expect(d.total).toBe(10);
  });

  it('los percentiles salen de los valores ordenados, no del orden de entrada', () => {
    const desordenado = distribucionDe('x', [50, 10, 100, 30, 20], 5);
    const ordenado = distribucionDe('x', [10, 20, 30, 50, 100], 5);
    expect(desordenado).toEqual(ordenado);
    if (!desordenado.hay) throw new Error('debería haber medidas');
    expect(desordenado.max).toBe(100);
    expect(desordenado.mediana).toBe(30);
  });

  it('con una sola pieza medida no se rompe ni inventa un rango', () => {
    const d = distribucionDe('reddit', [1234], 2);
    if (!d.hay) throw new Error('debería haber medidas');
    expect(d.mediana).toBe(1234);
    expect(d.p90).toBe(1234);
    expect(d.max).toBe(1234);
    expect(d.medidas).toBe(1);
    // La UI usa `medidas` para avisar que la muestra es chica.
    expect(d.total).toBe(2);
  });
});

describe('umbralesActuales', () => {
  it('lee lo declarado en config/viralidad.json', () => {
    const u = umbralesActuales();
    expect(u.x?.viral).toBeGreaterThan(0);
    // Los canales sin una sola pieza medida no tienen umbral inventado.
    expect(u.blog).toBeUndefined();
  });
});
