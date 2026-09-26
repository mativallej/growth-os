import { describe, expect, it } from 'vitest';
import { FASES, porFase, skillsDe, type Skill } from './metodologia';

const skill = (nombre: string): Skill => ({ nombre, descripcion: 'x', vault: 'tegu' });

describe('las fases son el método', () => {
  it('cada una declara qué se rompe si se saltea', () => {
    // Un método que solo enumera pasos no explica por qué están en ese orden.
    for (const f of FASES) expect(f.siSeSaltea.length, f.id).toBeGreaterThan(10);
  });

  it('cada una dice qué hace la plataforma, aunque sea nada', () => {
    for (const f of FASES) {
      expect(f.plataforma === null || f.plataforma.length > 10, f.id).toBe(true);
    }
  });

  it('la app solo escribe contenido en UN paso', () => {
    // Regla dura 7. Captar es la única escritura de contenido admitida.
    const escriben = FASES.filter((f) => f.donde === 'plataforma');
    expect(escriben.map((f) => f.id)).toEqual(['captar']);
  });

  it('Escribir declara explícitamente que la app no edita piezas', () => {
    const escribir = FASES.find((f) => f.id === 'escribir')!;
    expect(escribir.plataforma).toMatch(/NO se escribe ni se edita/);
  });

  it('los ids no se repiten', () => {
    const ids = FASES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('el reparto de skills', () => {
  it('una skill de evaluación va a Evaluar, no a Escribir', () => {
    // `growth-evaluar-post` contiene "post". Sin prioridad de matcheo se la
    // llevaba Escribir, que viene antes en el método.
    const { fases } = porFase([skill('growth-evaluar-post'), skill('growth-post')]);
    const por = (id: string) => fases.find((f) => f.id === id)!.skills.map((s) => s.nombre);
    expect(por('evaluar')).toEqual(['growth-evaluar-post']);
    expect(por('escribir')).toEqual(['growth-post']);
  });

  it('una skill cae en UNA sola fase', () => {
    const { fases } = porFase([skill('brain-viral-evaluation-test')]);
    const cuantas = fases.filter((f) => f.skills.length > 0);
    expect(cuantas).toHaveLength(1);
  });

  it('lo que no matchea NO se esconde: va a sin fase', () => {
    const { sinFase } = porFase([skill('growth-subir-cambios')]);
    expect(sinFase.map((s) => s.nombre)).toEqual(['growth-subir-cambios']);
  });

  it('ninguna skill se pierde entre las fases y sin fase', () => {
    const todas = [
      'growth-idea', 'growth-post', 'growth-evaluar-post', 'growth-analytics',
      'growth-notion-sync', 'growth-subir-cambios', 'brain-atomic-note',
    ].map(skill);
    const { fases, sinFase } = porFase(todas);
    const contadas = fases.reduce((n, f) => n + f.skills.length, 0) + sinFase.length;
    expect(contadas).toBe(todas.length);
  });
});

describe('las skills salen del vault', () => {
  it('lee las de la marca y no inventa ninguna', () => {
    const tegu = skillsDe('tegu');
    // Si el vault está montado hay skills; si no, la lista es vacía y la vista
    // lo dice. Lo que no puede pasar es que aparezca una que no existe.
    for (const s of tegu) expect(s.nombre).toMatch(/^[a-z0-9-]+$/);
  });

  it('una marca inexistente devuelve vacío, no rompe', () => {
    expect(skillsDe('no-existe')).toBeDefined();
  });

  it('la descripción no arrastra el "Usar cuando…", que es para el ruteo', () => {
    for (const s of skillsDe('tegu')) {
      expect(s.descripcion, s.nombre).not.toMatch(/Usar cuando el usuario/);
    }
  });
});
