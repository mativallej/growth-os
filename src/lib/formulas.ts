import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getSource, brandsConfig } from './sources';
import type { Channel } from './normalize';

// EL CATÁLOGO DE FÓRMULAS. Es lo único que cruza la frontera entre marcas, y se
// declara acá con su motivo.
//
// El catálogo vive en el vault personal (`Brand Identity/Catalog`) y sirve a las
// DOS marcas: es doctrina —qué formas de pieza existen y qué evidencia tiene cada
// una— no contenido. Lo que se lee son códigos y nombres. NUNCA cuerpo de piezas,
// y el test de aislamiento lo verifica.
//
// Sin esto no se puede responder la única pregunta que Notion no puede responder
// ni en principio: qué fórmula NUNCA se estrenó. Una fórmula sin estrenar no
// tiene fila en ninguna base — solo aparece cruzando el catálogo contra las piezas.
//
// A DIFERENCIA de los vaults de contenido, el catálogo PUEDE FALTAR. No pasa por
// `assertRoots`: si no está, se usa el fallback y se dice que se usó. Un catálogo
// ausente degrada una vista; un vault ausente invalida todas.

export type Formula = {
  /** `X1`, `A`… — lo que agrupa. */
  code: string;
  /** Nombre largo del catálogo. Cambia; por eso no se agrupa por él. */
  name: string;
  channel: Channel;
};

/**
 * Fallback: los códigos, sin los nombres largos.
 *
 * Existe para que la vista de uso de fórmulas siga mostrando los ceros —que son
 * el hallazgo— cuando el catálogo no está montado. Los nombres se pierden; los
 * códigos no, porque son los que el footer de las piezas escribe.
 */
const FALLBACK: Formula[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    code: `X${i + 1}`,
    name: `X${i + 1}`,
    channel: 'x' as Channel,
  })),
  ...'ABCDEFGHIJ'.split('').map((c) => ({ code: c, name: c, channel: 'instagram' as Channel })),
];

/**
 * Las dos tablas del catálogo ponen el código en la primera celda, pero el
 * NOMBRE en lugares distintos:
 *
 *   X   `| **X1** | **Storytelling-de-tercero** — … |`   nombre en la 2ª celda
 *   IG  `| **A · Storytelling-de-tercero** | … |`        nombre en la 1ª, tras `·`
 *
 * El lookahead negativo después del código es lo que descarta la cabecera:
 * `| Fórmula |` matchearía `F` seguido de `ó`, y entraría una fórmula llamada
 * "órmula" que después aparece como sin estrenar para siempre.
 */
const CELDA_CODIGO = /^\*{0,2}([A-Z]\d{0,2})\*{0,2}(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])\s*(?:·\s*)?(.*)$/;

const limpio = (s: string) => s.replace(/\*\*/g, '').replace(/—.*$/, '').trim();

function parseCatalogo(texto: string, channel: Channel): Formula[] {
  const out: Formula[] = [];
  const vistos = new Set<string>();
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trimStart().startsWith('|')) continue;
    const celdas = linea.split('|').slice(1, -1).map((c) => c.trim());
    if (celdas.length < 2) continue;

    const m = celdas[0].match(CELDA_CODIGO);
    if (!m) continue;
    const code = m[1].toUpperCase();
    if (vistos.has(code)) continue;

    // Una fila de X empieza con Xn; una de IG, con una sola letra.
    const esX = /^X\d{1,2}$/.test(code);
    const esIG = /^[A-Z]$/.test(code);
    if (channel === 'x' ? !esX : !esIG) continue;

    vistos.add(code);
    // El nombre está en la misma celda (IG) o en la siguiente (X).
    const nombre = limpio(m[2]) || limpio(celdas[1]) || code;
    out.push({ code, name: nombre, channel });
  }
  return out;
}

export type CatalogLoad = {
  formulas: Formula[];
  /** De dónde salió, para poder decirlo en la vista en vez de fingir. */
  origin: 'catalogo' | 'fallback';
  dir?: string;
};

/**
 * Dónde está el catálogo, DECLARADO en la config y no adivinado.
 *
 * Cada marca puede tener el suyo (`growth.catalogo`) o apuntar al de otra
 * (`growth.catalogo_de`), porque es doctrina compartida. Antes esto asumía que
 * existía una marca llamada `personal` con el catálogo en una ruta fija: con
 * una tercera marca eso dejaba de tener sentido.
 */
function catalogDir(brand?: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (env.CATALOG_DIR) return env.CATALOG_DIR;
  try {
    const marcas = brandsConfig();
    const m = brand ? marcas.find((b) => b.id === brand) : undefined;
    const dueño = m?.growth?.catalogo_de
      ? marcas.find((b) => b.id === m.growth!.catalogo_de)
      : m ?? marcas.find((b) => b.growth?.catalogo);
    const rel = dueño?.growth?.catalogo;
    if (!dueño || !rel) return undefined;
    // `getSource` y no `findSource`: el catálogo se lee aunque esa marca no haya
    // entrado al build. Lo que se extrae son códigos y nombres, nunca piezas.
    return join(getSource(dueño.id, env).vault, rel);
  } catch {
    return undefined;
  }
}

let cache: CatalogLoad | null = null;

export function loadFormulas(brand?: string, env: NodeJS.ProcessEnv = process.env): CatalogLoad {
  if (cache) return cache;
  const dir = catalogDir(brand, env);
  if (!dir || !existsSync(dir)) {
    cache = { formulas: FALLBACK, origin: 'fallback' };
    return cache;
  }

  const formulas: Formula[] = [];
  try {
    for (const archivo of readdirSync(dir)) {
      if (!archivo.toLowerCase().endsWith('.md')) continue;
      const lower = archivo.toLowerCase();
      const channel: Channel | undefined = lower.includes(' x') || lower.includes('_x')
        ? 'x'
        : lower.includes('ig') || lower.includes('instagram')
          ? 'instagram'
          : undefined;
      if (!channel) continue;
      formulas.push(...parseCatalogo(readFileSync(join(dir, archivo), 'utf8'), channel));
    }
  } catch {
    cache = { formulas: FALLBACK, origin: 'fallback' };
    return cache;
  }

  cache = formulas.length
    ? { formulas, origin: 'catalogo', dir }
    : { formulas: FALLBACK, origin: 'fallback', dir };
  return cache;
}

/** Solo para tests: el catálogo se cachea por proceso. */
export function resetFormulaCache(): void {
  cache = null;
}

const CODIGO = /^([A-Z]\d{1,2}|[A-Z])(?=[\s·:.\-]|$)/;

/**
 * Código de fórmula de una pieza, EN CASCADA Y SIN FORZAR.
 *
 *   1. el campo `formula` del footer, si su primer token es un código del catálogo
 *   2. la carpeta, si nombra un código (`X1 - Storytelling de tercero/`)
 *   3. sin clasificar
 *
 * El paso que NO existe a propósito es "adivinar por el parecido del nombre".
 * Una pieza mal clasificada contamina la vista de uso de fórmulas justo donde
 * esa vista tiene que ser exacta: los ceros. Una fórmula que figura usada porque
 * alguien forzó una clasificación deja de aparecer como sin estrenar, que es el
 * único hallazgo que esta vista existe para dar.
 */
export function formulaCodeOf(
  piece: { formula?: string; formulaCode?: string; relPath: string },
  catalogo: Formula[] = loadFormulas().formulas,
): string | null {
  const validos = new Set(catalogo.map((f) => f.code));

  // 1. El campo del footer. Un código que el catálogo no declara SE ACEPTA
  //    igual: Tegu usa B1-B6 para Blog, que son una familia entera que el
  //    catálogo del vault personal no conoce. Tirarlas a "sin clasificar" no
  //    era prudencia, era descartar lo que el humano escribió explícitamente.
  //    `formulaUsage` las muestra marcadas como fuera del catálogo, que es el
  //    hallazgo real: hay familias de fórmulas sin documentar.
  const delCampo = piece.formula?.trim().match(CODIGO)?.[1]?.toUpperCase();
  if (delCampo) return delCampo;

  // 2. La carpeta, solo si nombra un código que el catálogo SÍ declara. Acá el
  //    criterio es más estricto a propósito: una carpeta puede llamarse "B" por
  //    cualquier motivo, y el campo del footer es una afirmación del humano
  //    mientras que la carpeta es una coincidencia de nombre.
  for (const seg of piece.relPath.split(/[\\/]/)) {
    const c = seg.trim().match(CODIGO)?.[1]?.toUpperCase();
    if (c && validos.has(c)) return c;
  }

  // 3. Sin clasificar. NO se adivina por el parecido del nombre: una pieza mal
  //    clasificada haría figurar como usada una fórmula sin estrenar, que es el
  //    único hallazgo que la vista de fórmulas existe para dar.
  return null;
}
