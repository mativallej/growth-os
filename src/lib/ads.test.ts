// Un creativo de campaña NO es una pieza, y este archivo lo fija.
//
// El framework del vault los separa por todo: por qué los organiza (fórmula vs
// persona × dolor × ángulo), por qué KPI (saves/shares vs hook-rate/CPA) y por
// vida útil (evergreen vs por ronda). Mezclarlos metería 17 creativos sin
// fórmula en las cuatro vistas orgánicas, y rankearlos por alcance sería
// rankearlos por cuánto se gastó.

import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { adCoverage, adUniverse, loadAdsBySource, loadCreatives } from './ads';
import { loadPieces } from './parse';
import type { ContentSource } from './sources';
import { listSources } from './sources';

const temps: string[] = [];
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

/** Una fuente con su raíz de contenido y su raíz de ads, como las reales. */
function fuente(): { source: ContentSource; contenido: string; ads: string } {
  const vault = mkdtempSync(join(tmpdir(), 'growth-loop-ads-'));
  temps.push(vault);
  const contenido = join(vault, 'Create', 'Organic');
  const ads = join(vault, 'Create', 'Ads');
  mkdirSync(contenido, { recursive: true });
  mkdirSync(ads, { recursive: true });
  return {
    source: {
      id: 'tegu', label: 'Fixture', brand: 'tegu',
      vault, roots: [contenido], ignore: [ads], envVar: 'VAULT_TEGU_DIR',
    },
    contenido,
    ads,
  };
}

function creativo(ads: string, ruta: string[], footer: string): string {
  const dir = join(ads, ...ruta.slice(0, -1));
  mkdirSync(dir, { recursive: true });
  const p = join(dir, ruta[ruta.length - 1]);
  writeFileSync(p, ['Copy del creativo.', '', '---', footer].join('\n'), 'utf8');
  return p;
}

const FOOTER =
  'canal: Meta Ads (Instagram/Facebook) · cuenta: metaads_tegu · buyer persona: Sofía (Cliente) · ' +
  'dolor: 3 (Urgencia) · creativo: 1 · ronda: Ronda 1 - Jul 2026 · formato: UGC · ' +
  'ángulo: Problema-solución (rubro: cocina) · CTA: "Pedí ahora" · estado: Draft';

describe('un creativo no es una pieza', () => {
  it('no entra en ninguna colección de piezas', () => {
    const { source, contenido, ads } = fuente();
    writeFileSync(join(contenido, 'post.md'), ['Cuerpo.', '', '---', '- platform: X'].join('\n'), 'utf8');
    creativo(ads, ['Cliente', 'Sofía', 'Dolor 3 - Urgencia', 'creativo-1.md'], FOOTER);

    const piezas = loadPieces([source]);
    expect(piezas).toHaveLength(1);
    expect(piezas[0].title).toBe('post');
    expect(piezas.some((p) => p.relPath.includes('/Ads/'))).toBe(false);

    expect(loadCreatives([source])).toHaveLength(1);
  });

  it('en los vaults reales tampoco se cuela ninguno', () => {
    expect(loadPieces(listSources()).filter((p) => /[\\/]Ads[\\/]/.test(p.relPath))).toEqual([]);
  });
});

describe('las dimensiones se leen de lo declarado', () => {
  it('lee las seis del footer, sin derivar ninguna', () => {
    const { source, ads } = fuente();
    creativo(ads, ['Cliente', 'Sofía', 'Dolor 3 - Urgencia', 'creativo-1.md'], FOOTER);
    const [c] = loadCreatives([source]);
    expect(c).toMatchObject({
      persona: 'Sofía',
      publico: 'Cliente', // del paréntesis de la persona, no de la carpeta
      dolor: '3',
      formato: 'UGC',
      angulo: 'Problema-solución', // el calificativo se agrupa
      ronda: 'Ronda 1 - Jul 2026',
      cta: '"Pedí ahora"',
    });
    expect(c.derivadas).toEqual([]);
    // El crudo sigue disponible: el calificativo no se pierde, se agrupa.
    expect(c.anguloRaw).toBe('Problema-solución (rubro: cocina)');
  });

  it('deriva de la ruta lo que el footer no declara, Y LO REGISTRA', () => {
    const { source, ads } = fuente();
    creativo(
      ads,
      ['Profesional', 'Diego', 'Dolor 1 - Invisible', 'creativo-9.md'],
      'canal: Meta Ads · formato: Imagen · ángulo: Educativo',
    );
    const [c] = loadCreatives([source]);
    expect(c.persona).toBe('Diego');
    expect(c.publico).toBe('Profesional');
    expect(c.dolor).toBe('1');
    // Derivar está permitido —negarse dejaría las filas vacías— pero queda
    // anotado: una dimensión deducida se rompe si el archivo se mueve.
    expect(c.derivadas.sort()).toEqual(['dolor', 'persona', 'público']);
  });

  it('el creativo que se mueve de carpeta conserva lo que declara', () => {
    const { source, ads } = fuente();
    const antes = creativo(ads, ['Cliente', 'Sofía', 'Dolor 3 - Urgencia', 'creativo-1.md'], FOOTER);
    const a = loadCreatives([source])[0];

    const destino = join(ads, 'Profesional', 'Otra', 'Dolor 9 - Otro');
    mkdirSync(destino, { recursive: true });
    renameSync(antes, join(destino, 'creativo-1.md'));

    const b = loadCreatives([source])[0];
    expect(b.persona).toBe(a.persona);
    expect(b.dolor).toBe(a.dolor);
    expect(b.angulo).toBe(a.angulo);
    expect(b.ronda).toBe(a.ronda);
  });
});

describe('lo que no es un creativo', () => {
  it('una evaluación no genera entrada propia', () => {
    const { source, ads } = fuente();
    creativo(ads, ['Cliente', 'Sofía', 'Dolor 3 - Urgencia', 'creativo-1.md'], FOOTER);
    creativo(
      ads,
      ['Cliente', 'Sofía', 'Dolor 3 - Urgencia', 'creativo-1 - evaluacion.md'],
      '- status: revisado',
    );
    const { creatives, excluidos } = loadAdsBySource([source]);
    expect(creatives).toHaveLength(1);
    expect(excluidos.map((e) => e.motivo)).toContain('evaluación de un creativo');
  });

  it('el framework y las rondas son doctrina, no creativos', () => {
    const { source, ads } = fuente();
    writeFileSync(join(ads, 'Framework de Ads.md'), '# Framework\n\n---\ncanal: Meta Ads', 'utf8');
    mkdirSync(join(ads, 'Rondas'), { recursive: true });
    writeFileSync(join(ads, 'Rondas', 'Ronda 1.md'), '# Ronda\n\n---\ncanal: Meta Ads', 'utf8');
    expect(loadCreatives([source])).toEqual([]);
  });

  it('lo excluido se reporta, nunca se saltea en silencio', () => {
    const { source, ads } = fuente();
    writeFileSync(join(ads, 'Framework de Ads.md'), '# F', 'utf8');
    expect(loadAdsBySource([source]).excluidos).toHaveLength(1);
  });
});

describe('el universo sale de la fuente, no del código', () => {
  it('una persona SIN creativos igual aparece', () => {
    const { source, ads } = fuente();
    creativo(ads, ['Cliente', 'Sofía', 'Dolor 1 - X', 'c1.md'], FOOTER);
    // Marcos existe como carpeta y no produjo nada. Ese es el hallazgo.
    mkdirSync(join(ads, 'Cliente', 'Marcos', 'Dolor 1 - Y'), { recursive: true });

    const universo = adUniverse([source]).personas;
    expect(universo.map((u) => u.persona).sort()).toEqual(['Marcos', 'Sofía']);

    const cov = adCoverage(loadCreatives([source]), universo);
    expect(cov.personas).toContain('Marcos');
    // Y todas sus celdas están en cero: el hueco tiene fila.
    expect(cov.celdas.filter((c) => c.persona === 'Marcos').every((c) => c.count === 0)).toBe(true);
  });

  it('agregar una carpeta de persona la hace aparecer sin tocar código', () => {
    const { source, ads } = fuente();
    creativo(ads, ['Cliente', 'Sofía', 'Dolor 1 - X', 'c1.md'], FOOTER);
    expect(adUniverse([source]).personas).toHaveLength(1);

    mkdirSync(join(ads, 'Profesional', 'Nati'), { recursive: true });
    expect(adUniverse([source]).personas.map((u) => u.persona).sort()).toEqual(['Nati', 'Sofía']);
  });

  it('la cobertura incluye las combinaciones en cero', () => {
    const { source, ads } = fuente();
    creativo(ads, ['Cliente', 'Sofía', 'Dolor 1 - X', 'c1.md'],
      'canal: Meta Ads · buyer persona: Sofía · dolor: 1 · ángulo: Educativo');
    creativo(ads, ['Cliente', 'Sofía', 'Dolor 2 - Y', 'c2.md'],
      'canal: Meta Ads · buyer persona: Sofía · dolor: 2 · ángulo: Testimonial');

    const cov = adCoverage(loadCreatives([source]), adUniverse([source]).personas);
    // 1 persona × 2 dolores × 2 ángulos = 4 celdas, 2 con creativo y 2 en cero.
    expect(cov.celdas).toHaveLength(4);
    expect(cov.celdas.filter((c) => c.count === 0)).toHaveLength(2);
  });
});
