import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fg from 'fast-glob';

/**
 * LAS CREDENCIALES DE SUPABASE NO LLEGAN AL NAVEGADOR.
 *
 * Verificado a mano el 2026-09-28 sobre `.next/static`: cero ocurrencias de la
 * URL del proyecto, del prefijo de la clave y del `ref`. Pero eso fue una
 * observación de un build, y lo que hace falta es que siga siendo cierto — dos
 * cambios chicos lo romperían sin que nadie lo note:
 *
 *   1. Renombrar una variable a `NEXT_PUBLIC_SUPABASE_*`. Next inlinea ese
 *      prefijo en el bundle de cliente: la clave quedaría escrita en un `.js`
 *      público, sin ningún error ni advertencia.
 *
 *   2. Importar `@/lib/supabase` desde un componente `"use client"`. El bundler
 *      lo sigue, `process.env.SUPABASE_URL` queda como `undefined` en el cliente
 *      —así que ni siquiera falla ruidoso— y el módulo viaja igual.
 *
 * Se prueba sobre el CÓDIGO y no sobre el build a propósito: un test que
 * necesita `npm run build` no se corre, y este tiene que correr en cada commit.
 */

// Los tests quedan afuera: no se bundlean, y este mismo archivo nombra el
// prefijo prohibido para explicar por qué lo está.
const FUENTES = fg.sync('src/**/*.{ts,tsx}', {
  absolute: false,
  ignore: ['**/*.test.ts', '**/*.test.tsx'],
});

function leer(f: string) {
  return readFileSync(f, 'utf8');
}

/** Los archivos que el bundler manda al navegador: los que declaran "use client". */
function esCliente(contenido: string): boolean {
  return /^\s*['"]use client['"]/.test(contenido);
}

describe('las credenciales de Supabase se quedan en el servidor', () => {
  it('ninguna variable de Supabase lleva el prefijo NEXT_PUBLIC_', () => {
    const culpables = FUENTES.filter((f) => /NEXT_PUBLIC_SUPABASE/.test(leer(f)));
    // Estuvieron así hasta el 2026-09-28: `NEXT_PUBLIC_SUPABASE_URL` y
    // `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. La RLS aguantaba que la clave
    // viajara —no le da nada a `anon`— pero publicaba contra qué proyecto corre
    // esta instalación, y eso no hace falta que se sepa.
    expect(culpables).toEqual([]);
  });

  it('ningún componente de cliente importa el módulo de Supabase', () => {
    const culpables = FUENTES.filter((f) => {
      const c = leer(f);
      return esCliente(c) && /from\s+['"](@\/lib\/supabase|\.\.?\/.*\/supabase|\.\/supabase)['"]/.test(c);
    });
    expect(culpables).toEqual([]);
  });

  it('ningún componente de cliente importa el lector del índice', () => {
    // `index-read.ts` ya tiene `server-only`, que lo haría fallar en el build.
    // Esto lo dice antes y con un mensaje que se entiende, en vez de un error del
    // bundler sobre un módulo que "cannot be imported from a Client Component".
    const culpables = FUENTES.filter((f) => {
      const c = leer(f);
      return esCliente(c) && /from\s+['"].*index-read['"]/.test(c);
    });
    expect(culpables).toEqual([]);
  });

  it('el único que habla con PostgREST desde el cliente es el endpoint propio', () => {
    // Un `fetch` a `*.supabase.co` desde un archivo de cliente significa que
    // alguien volvió a saltearse `/api`. La forma correcta es pegarle al propio
    // origen; ahí no hay credenciales que mandar.
    const culpables = FUENTES.filter((f) => {
      const c = leer(f);
      return esCliente(c) && /supabase\.co|\/rest\/v1\//.test(c);
    });
    expect(culpables).toEqual([]);
  });

  it('las sondas SÍ existen — si no, este test no prueba nada', () => {
    // El modo de falla de los cuatro de arriba es pasar sobre una lista vacía.
    expect(FUENTES.length).toBeGreaterThan(30);
    expect(FUENTES.filter((f) => esCliente(leer(f))).length).toBeGreaterThan(5);
    // Y el módulo que se está protegiendo tiene que existir y leer las variables.
    expect(leer('src/lib/supabase.ts')).toMatch(/process\.env\.SUPABASE_URL/);
  });
});
