import { describe, expect, it } from 'vitest';
import type { Operation, Precondicion } from './operations';
import {
  CANALES,
  MARCAS,
  MATERIAS,
  OPERACIONES,
  PARAM_MARCA,
  evaluar,
  getOperation,
  operacionesDeMarca,
  validarParams,
} from './operations';

function opDePrueba(extra: Partial<Operation> = {}): Operation {
  return {
    id: 'prueba',
    nombre: 'Prueba',
    descripcion: 'Una operación de prueba.',
    forma: 'sesion',
    marcas: null,
    alcances: ['lote'],
    params: [PARAM_MARCA],
    precondiciones: [],
    periodoDias: null,
    etapa: 1,
    ...extra,
  };
}

const PRE_ROTA: Precondicion = {
  id: 'insumo',
  falta: 'No está el export de Meta.',
  comoObtenerlo: 'Bajarlo de Meta Business Suite y dejarlo en ~/Downloads.',
  cumple: () => false,
};

describe('el catálogo', () => {
  it('declara las operaciones que el sistema ya tiene', () => {
    const ids = OPERACIONES.map((o) => o.id);
    expect(ids).toContain('ingest-analytics');
    expect(ids).toContain('sync-contenido');
    expect(ids).toContain('sync-documentacion');
    expect(ids).toContain('digest');
    expect(ids).toContain('export-piezas');
  });

  it('cada operación declara descripción, forma, precondiciones y período', () => {
    for (const op of OPERACIONES) {
      expect(op.descripcion.length).toBeGreaterThan(10);
      expect(['captura', 'export', 'sesion']).toContain(op.forma);
      expect(Array.isArray(op.precondiciones)).toBe(true);
      expect(op.periodoDias === null || op.periodoDias > 0).toBe(true);
      expect(op.alcances.length).toBeGreaterThan(0);
    }
  });

  it('una operación desconocida rompe listando las declaradas', () => {
    expect(() => getOperation('no-existe')).toThrow(/sync-contenido/);
  });

  it('una operación declarada para una marca no se ofrece desde las otras', () => {
    const deTegu = operacionesDeMarca('tegu').map((o) => o.id);
    const dePersonal = operacionesDeMarca('mativallej').map((o) => o.id);
    expect(deTegu).toContain('sync-documentacion');
    expect(dePersonal).not.toContain('sync-documentacion');
    expect(dePersonal).toContain('digest');
    expect(deTegu).not.toContain('digest');
  });

  it('ads/orgánico es una dimensión propia y no un canal', () => {
    for (const canal of CANALES) {
      expect(MATERIAS).not.toContain(canal as never);
    }
    expect(MATERIAS).toEqual(['organico', 'ads', 'ambos']);
  });

  it('las marcas salen de config/sources.json', () => {
    expect(MARCAS).toEqual(['mativallej', 'tegu']);
  });
});

describe('validarParams', () => {
  it('rechaza un valor fuera de lo declarado, nombrando el parámetro', () => {
    const r = validarParams(opDePrueba(), { marca: 'otra-marca' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores[0].param).toBe('marca');
    expect(r.errores[0].motivo).toMatch(/mativallej, tegu/);
  });

  it('rechaza un parámetro que la operación no declara', () => {
    const r = validarParams(opDePrueba(), { marca: 'tegu', apply: 'true' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores.map((e) => e.param)).toContain('apply');
  });

  it('exige los obligatorios', () => {
    const r = validarParams(opDePrueba(), {});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores[0].motivo).toMatch(/obligatorio/);
  });

  it('aplica el default declarado cuando no se elige valor', () => {
    const op = getOperation('sync-contenido');
    const r = validarParams(op, { marca: 'tegu' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // El default es explícito: nunca "ambos" por omisión.
    expect(r.valores.materia).toBe('organico');
  });

  it('valida el formato de fecha', () => {
    const op = getOperation('ingest-analytics');
    const mal = validarParams(op, { marca: 'tegu', csv: 'x.csv', 'as-of': '12/03/2026' });
    expect(mal.ok).toBe(false);
    const bien = validarParams(op, { marca: 'tegu', csv: 'x.csv', 'as-of': '2026-03-12' });
    expect(bien.ok).toBe(true);
  });

  it('una ruta no puede ser absoluta ni escaparse hacia arriba', () => {
    const op = getOperation('sync-contenido');
    for (const objetivo of ['/etc/passwd', '../../../secreto.md', 'a/../../b.md']) {
      const r = validarParams(op, { marca: 'tegu', objetivo });
      expect(r.ok, objetivo).toBe(false);
    }
    expect(validarParams(op, { marca: 'tegu', objetivo: 'Create/Organic/X/uno.md' }).ok).toBe(true);
  });

  it('una operación de una sola marca se rechaza desde otra', () => {
    const r = validarParams(getOperation('digest'), { marca: 'tegu' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores.some((e) => e.motivo.includes('mativallej'))).toBe(true);
  });
});

describe('evaluar precondiciones', () => {
  it('con un insumo ausente la operación no se puede disparar y dice qué falta', () => {
    const d = evaluar(opDePrueba({ precondiciones: [PRE_ROTA] }));
    expect(d.disparable).toBe(false);
    expect(d.faltantes).toHaveLength(1);
    expect(d.faltantes[0].falta).toMatch(/export de Meta/);
    expect(d.faltantes[0].comoObtenerlo).toMatch(/Meta Business Suite/);
  });

  it('con todo cumplido se puede disparar', () => {
    expect(evaluar(opDePrueba()).disparable).toBe(true);
    expect(evaluar(getOperation('ideas-capturar')).disparable).toBe(true);
  });

  it('las de etapa 2 se declaran pero no se ofrecen', () => {
    const d = evaluar(getOperation('export-piezas'));
    expect(d.disparable).toBe(false);
    expect(d.bloqueo).toMatch(/account-scoped-routes/);
  });

  it('captar una idea no tiene precondiciones: no puede depender de la red', () => {
    expect(getOperation('ideas-capturar').precondiciones).toEqual([]);
  });
});
