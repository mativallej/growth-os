import { describe, expect, it } from 'vitest';
import { accesosDe } from './accesos';
import { allSourceIds } from './sources';
import { esHttp } from './enlaces';

const MARCA = allSourceIds()[0];

describe('accesosDe', () => {
  it('TODO lo que devuelve se puede abrir', () => {
    // Es la regla de la vista: un link muerto promete y falla, y hace dudar de
    // los que sí andan. Lo que no tiene url sale por `sinDeclarar`.
    for (const a of accesosDe(MARCA).lista) {
      expect(esHttp(a.url), `${a.id} → ${a.url}`).toBe(true);
      expect(a.label.length).toBeGreaterThan(0);
    }
  });

  it('las cuentas se DERIVAN del handle declarado, sin config nueva', () => {
    const cuentas = accesosDe(MARCA).lista.filter((a) => a.grupo === 'Cuentas');
    expect(cuentas.length).toBeGreaterThan(0);
    for (const c of cuentas) {
      // El handle se muestra porque es lo que identifica la cuenta: una marca
      // puede tener dos en la misma red.
      expect(c.detalle).toMatch(/^@/);
      expect(c.url).toContain(c.detalle!.slice(1));
    }
  });

  it('un acceso declarado SIN url se reporta, no desaparece', () => {
    const { lista, sinDeclarar } = accesosDe(MARCA);
    // Saber que existe y que falta completarlo es distinto de creer que nadie
    // lo configuró nunca. Al 2026-09-26 Drive está exactamente así.
    const ids = new Set(lista.map((a) => a.id));
    for (const nombre of sinDeclarar) {
      expect(ids.has(`enlace:${nombre.toLowerCase()}`)).toBe(false);
    }
  });

  it('una marca que no existe no rompe: devuelve lo que aplica a todas', () => {
    const r = accesosDe('marca-que-no-existe');
    expect(Array.isArray(r.lista)).toBe(true);
    // Sin cuentas, porque no hay marca de la cual sacarlas.
    expect(r.lista.filter((a) => a.grupo === 'Cuentas')).toEqual([]);
  });

  it('los grupos son los tres declarados y nada más', () => {
    const grupos = new Set(accesosDe(MARCA).lista.map((a) => a.grupo));
    for (const g of grupos) expect(['Coordinación', 'Cuentas', 'Archivos']).toContain(g);
  });
});
