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

// Las TRES únicas cosas que la plataforma escribe, y ninguna es contenido:
//
//   ideas-queue  la cola local de ideas — material de entrada que aportó la
//                persona, no trabajo creativo
//   handoff      el contexto que recibe una sesión local
//   config-env   `.env.local`, y solo desde la pantalla de configuración, que no
//                existe fuera del entorno local
//
// Ninguna escribe un `.md`, y ninguna conoce la ubicación de un vault: eso lo
// verifican los dos tests de abajo. Sumar un cuarto escritor tiene que ser una
// decisión, no un descuido — por eso este test compara el conjunto exacto.
const PUEDEN_ESCRIBIR = new Set([
  'lib/ideas-queue.ts',
  'lib/handoff.ts',
  'lib/config-env.ts',
]);

// `config-env` sí resuelve la raíz del REPO (para `.env.local`), que es distinto
// de conocer la de un vault. Los otros dos no resuelven ninguna.
const SIN_VAULTS = new Set(['lib/ideas-queue.ts', 'lib/handoff.ts', 'lib/config-env.ts']);

const ESCRITURAS = /\b(writeFileSync|appendFileSync|createWriteStream|writeFile|unlinkSync|rmSync|cpSync|copyFileSync)\b/;

describe('la plataforma no es donde se hace el trabajo creativo', () => {
  it('solo tres módulos escriben en disco, y ninguno toca un vault', () => {
    const escriben = FUENTES.filter((f) => ESCRITURAS.test(f.txt)).map((f) => f.rel);
    expect(new Set(escriben)).toEqual(PUEDEN_ESCRIBIR);
  });

  it('ningún módulo que escribe conoce la ubicación de los vaults', () => {
    for (const rel of SIN_VAULTS) {
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
    // Se busca por forma de ruta y no por una ruta literal: la vista se mudó a
    // `[account]/piezas/[slug]` con account-scoped-routes, y un `find` literal
    // que no encuentra nada haría pasar el assert sobre `undefined`.
    const detalles = FUENTES.filter((f) => /piezas\/\[slug\]\/page\.tsx$/.test(f.rel));
    expect(detalles.length).toBeGreaterThan(0);
    for (const d of detalles) {
      expect({ rel: d.rel, editable: /<textarea|<form|contentEditable/.test(d.txt) }).toEqual({
        rel: d.rel,
        editable: false,
      });
    }
  });
});
