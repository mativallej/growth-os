import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { repoRoot } from './repo';

// De dónde salen las piezas.
//
// El pecado que este módulo existe para no repetir: `parse.ts` resolvía el
// contenido con `resolve(process.cwd(), '../tegu-docs/Brand/Content')`. Dos cosas
// rompieron ese path sin que nadie se enterara — el repo se mudó, y `Brand/` se
// fue de tegu-docs el 2026-09-23 — y `fg.sync` sobre un directorio que no existe
// devuelve `[]`, así que el dashboard buildeaba vacío. Acá las raíces son
// ABSOLUTAS, salen de config/sources.json (el mismo archivo que leen los scripts
// de Python, para que no haya dos listas de rutas que se separen), y si una falta
// se rompe. Preferimos un build roto a un dashboard que muestra cero.

export type SourceId = 'tegu' | 'personal';

export type ContentSource = {
  /** Lo que se nombra en GROWTH_SOURCES. */
  id: SourceId;
  /** Para la UI. Sale de config/sources.json. */
  label: string;
  /** id de la marca en config/sources.json. */
  brand: string;
  /** Raíz del vault, absoluta. Las rutas relativas de las piezas cuelgan de acá. */
  vault: string;
  /** Raíces de contenido, absolutas. Una fuente puede declarar más de una. */
  roots: string[];
  /** Subárboles que no son piezas, absolutos (los creativos de ads). */
  ignore: string[];
  /** La env var que reapunta el vault de esta fuente. Va en los mensajes de error. */
  envVar: string;
};

type Env = Record<string, string | undefined>;

type BrandConfig = {
  id: string;
  label: string;
  vault: string;
  content: string | string[];
  notion?: { ads?: string[] };
};

// El registro: qué fuentes existen y contra qué marca de config/sources.json va
// cada una. Las RUTAS no viven acá — vienen de la config. Agregar una fuente es
// agregar una marca allá y una línea acá.
const REGISTRY: { id: SourceId; brand: string; envVar: string }[] = [
  { id: 'tegu', brand: 'tegu', envVar: 'VAULT_TEGU_DIR' },
  { id: 'personal', brand: 'mativallej', envVar: 'VAULT_PERSONAL_DIR' },
];

export const ALL_SOURCE_IDS: SourceId[] = REGISTRY.map((e) => e.id);

/**
 * La config se LEE en runtime, no se importa.
 *
 * Un `import ... from '../../config/sources.json'` inlinea el archivo entero en
 * el bundle de servidor, así que un build recortado a Tegu igual se llevaba
 * adentro la ruta del vault personal y su etiqueta. No es contenido —eso ya no
 * viaja— pero sigue siendo información de la otra marca dentro de un artefacto
 * que se comparte, y la regla dura 4 pide que la separación sea estructural.
 *
 * Leerlo con `fs` deja el JSON afuera del bundle: solo entra a memoria lo que
 * la fuente pedida necesita. Si el archivo falta, rompe — nunca devuelve una
 * lista vacía de marcas (regla dura 1).
 */
let brandsCache: BrandConfig[] | null = null;

function brands(): BrandConfig[] {
  if (brandsCache) return brandsCache;
  const ruta = join(repoRoot(), 'config/sources.json');
  let parsed: { brands?: BrandConfig[] };
  try {
    parsed = JSON.parse(readFileSync(ruta, 'utf8')) as { brands?: BrandConfig[] };
  } catch (err) {
    throw new Error(
      `No se pudo leer ${ruta}: ${err instanceof Error ? err.message : String(err)}. ` +
        'Es el archivo que declara las marcas y sus vaults; sin él no hay de dónde leer.',
    );
  }
  if (!Array.isArray(parsed.brands) || parsed.brands.length === 0) {
    throw new Error(`${ruta} no declara ninguna marca en "brands".`);
  }
  brandsCache = parsed.brands;
  return brandsCache;
}

function expandHome(p: string): string {
  return p === '~' || p.startsWith('~/') ? join(homedir(), p.slice(1)) : p;
}

function absolute(p: string): string {
  const expanded = expandHome(p.trim());
  // `resolve` caería de vuelta en process.cwd() para una ruta relativa, que es
  // exactamente el bug que este módulo sacó del repo.
  if (!isAbsolute(expanded)) {
    throw new Error(
      `Ruta de fuente relativa: "${p}". Las raíces tienen que ser absolutas o ` +
        'empezar con ~/ — una ruta relativa depende de desde dónde se corrió el build.',
    );
  }
  return resolve(expanded);
}

function buildSource(entry: (typeof REGISTRY)[number], env: Env): ContentSource {
  const brand = brands().find((b) => b.id === entry.brand);
  if (!brand) {
    throw new Error(
      `config/sources.json no declara la marca "${entry.brand}", que la fuente ` +
        `"${entry.id}" necesita. Marcas configuradas: ${brands().map((b) => b.id).join(', ')}.`,
    );
  }

  const vault = absolute(env[entry.envVar] ?? brand.vault);
  const declared = Array.isArray(brand.content) ? brand.content : [brand.content];
  let roots = declared.map((r) => join(vault, r));

  // Alias retrocompatible: VAULT_CONTENT_DIR era el ÚNICO path que entendía el
  // parser viejo, y apuntaba a un content root de Tegu (no al vault). Se sigue
  // respetando con esa semántica, y pisa las raíces declaradas.
  const legacy = entry.id === 'tegu' ? env.VAULT_CONTENT_DIR : undefined;
  if (legacy) roots = [absolute(legacy)];

  return {
    id: entry.id,
    label: brand.label,
    brand: brand.id,
    vault,
    roots,
    ignore: (brand.notion?.ads ?? []).map((p) => join(vault, p)),
    envVar: entry.envVar,
  };
}

/**
 * Las fuentes que entran a este build. `GROWTH_SOURCES` es un CSV de ids; vacío
 * o ausente = todas. Nombrar una fuente que no existe rompe, con la lista de las
 * válidas al lado.
 *
 * Es la palanca que `account-scoped-routes` va a usar para que el contenido
 * personal no viaje dentro de un deploy de Tegu. Hasta ese change el aislamiento
 * NO está garantizado.
 */
export function listSources(
  spec: string | undefined = process.env.GROWTH_SOURCES,
  env: Env = process.env,
): ContentSource[] {
  const named = (spec ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const ids = named.length ? [...new Set(named)] : [...ALL_SOURCE_IDS];

  const unknown = ids.filter((id) => !ALL_SOURCE_IDS.includes(id as SourceId));
  if (unknown.length) {
    throw new Error(
      `GROWTH_SOURCES nombra fuentes que no existen: ${unknown.join(', ')}. ` +
        `Las fuentes válidas son: ${ALL_SOURCE_IDS.join(', ')}.`,
    );
  }

  return REGISTRY.filter((e) => ids.includes(e.id)).map((e) => buildSource(e, env));
}

export function getSource(id: SourceId, env: Env = process.env): ContentSource {
  const entry = REGISTRY.find((e) => e.id === id);
  if (!entry) {
    throw new Error(`Fuente desconocida: ${id}. Las válidas son: ${ALL_SOURCE_IDS.join(', ')}.`);
  }
  return buildSource(entry, env);
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Toda raíz declarada tiene que existir ANTES de leer. Una raíz ausente no puede
 * terminar siendo un conjunto vacío de piezas: eso parece información. Es la
 * regla dura 1, y el costo aceptado es que un vault desmontado voltea el build.
 */
export function assertRoots(sources: ContentSource[] = listSources()): void {
  const missing: string[] = [];
  for (const source of sources) {
    for (const root of source.roots) {
      if (!isDir(root)) missing.push(`  ${source.id} → ${root}  (reapuntar con ${source.envVar})`);
    }
  }
  if (missing.length) {
    throw new Error(
      `No existen ${missing.length} raíz/raíces de contenido declaradas:\n${missing.join('\n')}\n` +
        'Las rutas salen de config/sources.json vía ~/vaults/. Si el vault se movió, ' +
        'arreglá el symlink o la config — no las hardcodees.',
    );
  }
}

/**
 * Busca una fuente ENTRE LAS QUE ENTRARON A ESTE BUILD.
 *
 * La diferencia con `getSource` es la que sostiene el aislamiento: `getSource`
 * resuelve cualquier fuente del registro, mientras que esta solo ve las que
 * `GROWTH_SOURCES` dejó entrar. Una ruta `/personal/...` en un build recortado a
 * Tegu tiene que no existir, no estar escondida.
 */
export function findSource(
  id: string,
  sources: ContentSource[] = listSources(),
): ContentSource | undefined {
  return sources.find((s) => s.id === id);
}
