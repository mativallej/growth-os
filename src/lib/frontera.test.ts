import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from './repo';

// La frontera que define el alcance de esta plataforma:
// LA OPERACIÓN CREATIVA ES OBSIDIAN; LA DE GROWTH ES LA PLATAFORMA.
//
// Acá se capta una idea, se sube un lote de creativos, se sincroniza un post, se
// exporta y se ingesta. Acá NO se escribe ni se edita el cuerpo de una pieza. Sin
// esta frontera la plataforma termina siendo un editor peor que el que ya hay.
//
// Este test la chequea contra el árbol de código, no contra la buena voluntad.

const SRC = join(repoRoot(), 'src');

function archivos(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) archivos(p, out);
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

const FUENTES = archivos(SRC).map((p) => ({ rel: relative(SRC, p), txt: readFileSync(p, 'utf8') }));

// Las dos únicas cosas que la plataforma escribe: la cola local de ideas (material
// de entrada, lo aportó la persona) y el contexto que recibe una sesión.
const PUEDEN_ESCRIBIR = new Set(['lib/ideas-queue.ts', 'lib/handoff.ts']);

const ESCRITURAS = /\b(writeFileSync|appendFileSync|createWriteStream|writeFile|unlinkSync|rmSync|cpSync|copyFileSync)\b/;

describe('la plataforma no es donde se hace el trabajo creativo', () => {
  it('solo dos módulos escriben en disco, y ninguno toca un vault', () => {
    const escriben = FUENTES.filter((f) => ESCRITURAS.test(f.txt)).map((f) => f.rel);
    expect(new Set(escriben)).toEqual(PUEDEN_ESCRIBIR);
  });

  it('ningún módulo que escribe conoce la ubicación de los vaults', () => {
    for (const rel of PUEDEN_ESCRIBIR) {
      const f = FUENTES.find((x) => x.rel === rel)!;
      // Si un módulo que escribe importara el registro de fuentes, tendría a mano
      // la ruta de cada vault. No la tiene: escribe en .state y nada más.
      expect(f.txt, rel).not.toMatch(/from '\.\/sources'/);
      expect(f.txt, rel).not.toMatch(/vaults/);
    }
  });

  it('nada en la app escribe un .md', () => {
    for (const f of FUENTES) {
      if (!ESCRITURAS.test(f.txt)) continue;
      // Los únicos archivos que la app crea: la cola .json y el contexto .md de la
      // entrega, que es documentación de una operación, no una pieza.
      const sospechosas = f.txt.match(/\.md['"`]/g) ?? [];
      for (const s of sospechosas) {
        expect(f.txt, `${f.rel} escribe ${s}`).toContain('handoff-');
      }
    }
  });

  it('el único campo de texto libre de la plataforma es el de captar una idea', () => {
    const conTextarea = FUENTES.filter((f) => /<textarea/.test(f.txt)).map((f) => f.rel);
    expect(conTextarea).toEqual(['app/operar/Consola.local.tsx']);

    const consola = FUENTES.find((f) => f.rel === 'app/operar/Consola.local.tsx')!;
    // Y ese campo se llama `texto` y va a la captura de ideas: no hay un segundo
    // textarea que edite el cuerpo de nada.
    expect(consola.txt.match(/<textarea/g)).toHaveLength(1);
    expect(consola.txt).toContain('name="texto"');
  });

  it('la vista de una pieza la muestra, no la edita', () => {
    const detalle = FUENTES.find((f) => f.rel === 'app/piezas/[slug]/page.tsx')!;
    expect(detalle.txt).not.toMatch(/<textarea|<form|contentEditable/);
  });
});
