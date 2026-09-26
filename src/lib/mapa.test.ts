import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAPAS, DUENOS, marcasDelMapa, operacionesDelMapa } from './mapa';
import { listSources } from './sources';
import { OPERACIONES } from './operations';

describe('el mapa se deriva, no se escribe a mano', () => {
  it('las marcas salen del registro de fuentes', () => {
    expect(marcasDelMapa().map((m) => m.id)).toEqual(listSources().map((s) => s.id));
  });

  it('las operaciones salen del catálogo, todas', () => {
    const enElMapa = operacionesDelMapa().flatMap((g) => g.operaciones.map((o) => o.id));
    expect(enElMapa.sort()).toEqual(OPERACIONES.map((o) => o.id).sort());
  });

  it('la vista no escribe a mano una lista que ya está declarada', () => {
    const vista = readFileSync(
      join(process.cwd(), 'src/app/[account]/mapa/page.tsx'),
      'utf8',
    );
    // Si el nombre de una marca o de una operación estuviera hardcodeado acá,
    // sería lo primero en quedar viejo — y un mapa viejo manda a la capa
    // equivocada con confianza.
    for (const s of listSources()) {
      expect(vista, `la vista nombra la marca ${s.label}`).not.toContain(s.label);
      expect(vista, `la vista nombra el vault de ${s.id}`).not.toContain(s.vault);
    }
    for (const op of OPERACIONES) {
      expect(vista, `la vista nombra la operación ${op.id}`).not.toContain(op.nombre);
    }
  });
});

describe('la tabla de dueños', () => {
  it('cada campo tiene UN dueño', () => {
    const campos = DUENOS.map((d) => d.campo);
    expect(new Set(campos).size).toBe(campos.length);
  });

  it('cada campo dice qué pasa si se toca del lado que no manda', () => {
    for (const d of DUENOS) {
      expect(d.siSeTocaDelOtroLado.length, d.campo).toBeGreaterThan(10);
    }
  });

  it('el estado del kanban es el único que viaja en los dos sentidos', () => {
    const doble = DUENOS.filter((d) => /dos sentidos/.test(d.siSeTocaDelOtroLado));
    expect(doble.map((d) => d.campo)).toEqual(['estado del kanban']);
  });
});

describe('las capas', () => {
  it('cada una tiene un verbo, y no se repiten', () => {
    const verbos = CAPAS.map((c) => c.verbo);
    expect(new Set(verbos).size).toBe(verbos.length);
  });

  it('cada una declara lo que NO le corresponde', () => {
    for (const c of CAPAS) expect(c.noHace.length, c.id).toBeGreaterThan(0);
  });

  it('la plataforma declara explícitamente que no edita contenido', () => {
    const plataforma = CAPAS.find((c) => c.id === 'plataforma')!;
    expect(plataforma.noHace.join(' ')).toMatch(/ESCRIBIR O EDITAR EL CUERPO/);
  });
});

describe('la vista del mapa no contiene contenido', () => {
  it('no muestra piezas ni creativos', () => {
    const vista = readFileSync(
      join(process.cwd(), 'src/app/[account]/mapa/page.tsx'),
      'utf8',
    );
    // Es un mapa del sistema, no una vista de datos: si importara el parser,
    // podría terminar mostrando el cuerpo de una pieza en una página que se
    // piensa como documentación.
    expect(vista).not.toMatch(/from "@\/lib\/parse"/);
    expect(vista).not.toMatch(/from "@\/lib\/ads"/);
    expect(vista).not.toMatch(/loadPieces|loadCreatives/);
  });
});
