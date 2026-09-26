import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo';
import type { Umbral, Umbrales } from './viralidad';

// El cargador de umbrales, separado del tipo por la misma razón que
// `unidades-server`: `viralidad.ts` lo importan componentes de cliente, y
// arrastrar `node:fs` al bundle del navegador voltea el build con un error de
// Turbopack que no nombra la causa.

type Config = { por_canal?: Record<string, Umbral> };

// `NodeJS.ProcessEnv` exige NODE_ENV, y los tests pasan objetos parciales a
// propósito: lo único que este cargador necesita es leer claves por nombre.
type Env = Record<string, string | undefined>;

/**
 * Los umbrales declarados, con override por env.
 *
 * `VIRALIDAD_<CANAL>_VIRAL` y `_DESTACADO` permiten probar un criterio sin editar
 * el JSON ni ensuciar el repo — igual que `CADENCIA_<MARCA>_PISO`. El canal va en
 * mayúsculas: `VIRALIDAD_X_VIRAL=50000`.
 *
 * Si el archivo no está, se devuelve vacío y NO se inventan umbrales: sin
 * criterio declarado, la vista dice "sin umbral" en vez de fingir uno.
 */
export function cargarUmbrales(env: Env = process.env): Umbrales {
  let config: Config = {};
  try {
    config = JSON.parse(readFileSync(join(repoRoot(), 'config/viralidad.json'), 'utf8')) as Config;
  } catch {
    return {};
  }

  const out: Umbrales = {};
  for (const [canal, u] of Object.entries(config.por_canal ?? {})) {
    const clave = canal.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const viral = Number(env[`VIRALIDAD_${clave}_VIRAL`] ?? u.viral);
    const destacadoRaw = env[`VIRALIDAD_${clave}_DESTACADO`] ?? u.destacado;
    const destacado = destacadoRaw === undefined ? undefined : Number(destacadoRaw);

    // Un umbral que no es un número positivo se DESCARTA con el canal entero. Un
    // NaN comparado con `>=` da siempre false, así que dejarlo pasar haría que
    // ninguna pieza de ese canal fuera nunca viral, sin decir por qué.
    if (!Number.isFinite(viral) || viral <= 0) continue;
    if (destacado !== undefined && (!Number.isFinite(destacado) || destacado <= 0)) {
      out[canal] = { viral };
      continue;
    }
    // Un `destacado` por encima del `viral` invierte los niveles: nada caería en
    // destacado y la pieza saltaría de la base a viral. Se ignora el destacado.
    out[canal] = destacado !== undefined && destacado < viral ? { destacado, viral } : { viral };
  }
  return out;
}
