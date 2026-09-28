import fg from 'fast-glob';
import { cache } from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import type { ContentSource } from './sources';
import { listSources } from './sources';
import { tokenizeFooter } from './footer';

// UN CREATIVO NO ES UNA PIEZA, y el modelo tiene que decirlo.
//
// El framework del vault (`Create/Ads/Framework de Ads.md`) lo pone en una tabla:
//
//              Posts                          Ads
//   organiza   fórmula A-K                    persona × dolor × formato × ángulo
//   KPI        saves/shares/follows/reach     hook-rate/CTR/CPA/costo por resultado
//   vida útil  evergreen                      POR RONDA, se itera con data
//
// Meterlos en la misma colección haría dos cosas malas a la vez: los creativos
// entrarían a las cuatro vistas orgánicas como piezas sin fórmula, y rankearlos
// por alcance sería rankearlos por cuánto se gastó.
//
// Este módulo NO los suma a `loadPieces`: las raíces de ads ya están en el
// `ignore` de la fuente (config/sources.json → notion.ads), y hay un test que lo
// verifica.

export type Creative = {
  /** Nombre del archivo sin .md. */
  title: string;
  /** Ruta absoluta. Vacía cuando vino del índice — ver `Piece.path`. */
  path?: string;
  relPath: string;
  slug: string;
  /** Marca a la que pertenece. */
  source: string;

  // Las cuatro dimensiones de organización, más ronda y CTA.
  persona?: string;
  /** `Cliente` | `Profesional` — el lado del marketplace al que le habla. */
  publico?: string;
  dolor?: string;
  formato?: string;
  angulo?: string;
  /** El ángulo tal cual lo escribió el vault, con su calificativo. */
  anguloRaw?: string;
  ronda?: string;
  cta?: string;
  estado?: string;

  /**
   * Qué dimensiones se dedujeron de la ubicación en vez de declararse.
   *
   * REGLA DURA 2: derivar está permitido —negarse dejaría la mitad de las filas
   * vacías, que es peor— pero SHALL quedar registrado cuáles se derivaron. Una
   * dimensión declarada y una deducida no valen lo mismo: la deducida se rompe
   * en cuanto el archivo se mueve.
   */
  derivadas: string[];
};

/** Una evaluación acompaña a un creativo y no genera entrada propia. */
const ES_EVALUACION = /\s-\s*evaluaci[oó]n\.md$/i;
/** El framework y el mapa de rondas son doctrina, no creativos. */
const ES_DOCTRINA = /(^|\/)(Framework de Ads|Rondas)(\/|\.md$)/i;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Saca el calificativo entre paréntesis y deja el término base.
 *
 * El vault escribe `Educativo`, `Educativo (marco general)` y
 * `Educativo (pregunta)` para el mismo ángulo, y `Sofía` junto a
 * `Sofía (Cliente)` para la misma persona. Sin esto la matriz de cobertura
 * tiene 8 ángulos donde hay 4, y la mitad de las columnas quedan con una sola
 * celda ocupada: una cuadrícula que parece vacía porque está mal agrupada
 * esconde exactamente el hueco que existe para mostrar.
 *
 * NO es adivinar: el término base es el que el humano escribió, y el
 * calificativo se conserva en el crudo.
 */
function base(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const v = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return v || raw.trim() || undefined;
}

/** `Sofía (Cliente)` -> `Cliente`, cuando el paréntesis nombra el público. */
function publicoDelParentesis(raw: string | undefined): string | undefined {
  const m = raw?.match(/\(([^)]+)\)\s*$/);
  const v = m?.[1]?.trim();
  return v && /^(cliente|profesional)$/i.test(v) ? v : undefined;
}

/** `Dolor 3 - Urgencia sin saber a quién llamar` -> `3`. `1 (texto)` -> `1`. */
function numeroDeDolor(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)/);
  return m ? m[1] : raw.trim() || undefined;
}

function parseCreativo(path: string, source: ContentSource, adsRoot: string): Creative | null {
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/);

  let sep = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '---') { sep = i; break; }
  }
  const { fields } = tokenizeFooter(sep === -1 ? [] : lines.slice(sep + 1));

  // Un creativo declara su canal. Una evaluación no: es prosa sobre el creativo.
  // El nombre del archivo ya las excluye; esto es el segundo cerrojo, por si
  // alguien renombra.
  if (!fields.platform) return null;

  const rel = relative(adsRoot, path);
  const segs = rel.split(/[\\/]/);
  const derivadas: string[] = [];

  // Declarado gana. La ruta es el respaldo, y se anota que lo fue.
  const declarada = (k: string, deRuta: string | undefined, nombre: string) => {
    const v = fields[k]?.trim();
    if (v) return v;
    if (deRuta) derivadas.push(nombre);
    return deRuta;
  };

  const personaCruda = declarada('persona', segs[1], 'persona');
  // `buyer persona: Sofía (Cliente)` trae el público adentro del paréntesis.
  const publico = fields.publico?.trim()
    || publicoDelParentesis(personaCruda)
    || (segs[0] ? (derivadas.push('público'), segs[0]) : undefined);
  const persona = base(personaCruda);
  const dolorCrudo = fields.dolor?.trim() || (segs[2]?.startsWith('Dolor') ? segs[2] : undefined);
  if (!fields.dolor?.trim() && dolorCrudo) derivadas.push('dolor');

  return {
    title: basename(path).replace(/\.md$/i, ''),
    path,
    relPath: relative(source.vault, path),
    slug: slugify(rel.replace(/\.md$/i, '')),
    source: source.id,
    publico,
    persona,
    dolor: numeroDeDolor(dolorCrudo),
    formato: fields.formato?.trim() || undefined,
    angulo: base(fields.angulo),
    anguloRaw: fields.angulo?.trim() || undefined,
    ronda: fields.ronda?.trim() || undefined,
    cta: fields.cta?.trim() || undefined,
    estado: fields.status?.trim() || undefined,
    derivadas,
  };
}

export type AdsLoad = {
  creatives: Creative[];
  /** Archivos que se saltearon a propósito, con el motivo. Nunca en silencio. */
  excluidos: { path: string; motivo: string }[];
};

function loadUncached(sources: ContentSource[]): AdsLoad {
  const creatives: Creative[] = [];
  const excluidos: { path: string; motivo: string }[] = [];

  for (const source of sources) {
    // Las raíces de ads son las mismas que la fuente declara en su `ignore`:
    // están fuera de las piezas justamente porque son otra entidad.
    for (const adsRoot of source.ignore) {
      let archivos: string[];
      try {
        archivos = fg.sync('**/*.md', { cwd: adsRoot, absolute: true });
      } catch {
        continue; // una marca sin ads no es un error
      }
      for (const file of archivos) {
        const rel = relative(adsRoot, file);
        if (ES_EVALUACION.test(file)) {
          excluidos.push({ path: file, motivo: 'evaluación de un creativo' });
          continue;
        }
        if (ES_DOCTRINA.test(rel)) {
          excluidos.push({ path: file, motivo: 'framework o mapa de rondas' });
          continue;
        }
        const c = parseCreativo(file, source, adsRoot);
        if (c) creatives.push(c);
        else excluidos.push({ path: file, motivo: 'sin canal declarado en el footer' });
      }
    }
  }

  return { creatives, excluidos };
}

/**
 * El universo declarado: qué personas y qué dolores EXISTEN, tengan creativo o no.
 *
 * Sale de las carpetas del vault (`<público>/<persona>/<Dolor N - …>/`) y no de
 * los creativos, porque si saliera de los creativos una persona sin producir
 * simplemente no aparecería — y esa persona es el hallazgo. Al 2026-09-26 hay
 * 6 personas en disco y solo 2 con creativos.
 *
 * Agregar una carpeta de persona la hace aparecer sin tocar una línea de código.
 */
export function adUniverse(sources: ContentSource[] = listSources()): {
  personas: { publico: string; persona: string; dolores: string[] }[];
} {
  const personas: { publico: string; persona: string; dolores: string[] }[] = [];
  const dirs = (p: string) => {
    try {
      return readdirSync(p, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => e.name)
        .sort();
    } catch {
      return [];
    }
  };
  for (const source of sources) {
    for (const adsRoot of source.ignore) {
      for (const publico of dirs(adsRoot)) {
        // `Rondas/` es doctrina, no un público.
        if (/^rondas$/i.test(publico)) continue;
        for (const persona of dirs(join(adsRoot, publico))) {
          const dolores = dirs(join(adsRoot, publico, persona))
            .filter((d) => /^dolor\s*\d/i.test(d))
            .map((d) => numeroDeDolor(d) ?? d);
          personas.push({ publico, persona, dolores });
        }
      }
    }
  }
  return { personas };
}

export const loadAdsBySource = cache(
  (sources: ContentSource[] = listSources()): AdsLoad => loadUncached(sources),
);

export function loadCreatives(sources: ContentSource[] = listSources()): Creative[] {
  return loadAdsBySource(sources).creatives;
}

// ── Cobertura ─────────────────────────────────────────────────────────────────

export type CoverageCell = {
  persona: string;
  dolor: string;
  angulo: string;
  count: number;
};
export type CoverageReport = {
  personas: string[];
  angulos: string[];
  /** Todas las combinaciones persona × dolor, INCLUIDAS las que están en cero. */
  celdas: CoverageCell[];
  /** Dimensiones que se dedujeron de la ruta en al menos un creativo. */
  derivadas: Record<string, number>;
  total: number;
};

/**
 * Cobertura por persona × dolor × ángulo, con los ceros incluidos.
 *
 * El hueco ES el hallazgo, igual que la fórmula sin estrenar del lado orgánico:
 * una combinación sin creativo no tiene fila en ningún tablero, así que solo
 * aparece si se la construye a propósito.
 *
 * El universo de personas y dolores sale DE LA FUENTE, no de una lista en el
 * código: agregar una carpeta de persona la hace aparecer sin tocar nada.
 */
export function adCoverage(
  creatives: Creative[],
  universo: { publico: string; persona: string; dolores: string[] }[] = [],
): CoverageReport {
  // Las personas salen del universo DECLARADO, más las que algún creativo
  // nombre y la carpeta no tenga. Una persona sin creativos tiene que aparecer
  // con su fila en cero: es el hueco, y el hueco es el hallazgo.
  const personas = [...new Set([
    ...universo.map((u) => u.persona),
    ...creatives.map((c) => c.persona).filter(Boolean) as string[],
  ])].sort();
  const angulos = [...new Set(creatives.map((c) => c.angulo).filter(Boolean))].sort() as string[];
  const dolores = [...new Set([
    ...universo.flatMap((u) => u.dolores),
    ...creatives.map((c) => c.dolor).filter(Boolean) as string[],
  ])].sort();

  const conteo = new Map<string, number>();
  const derivadas: Record<string, number> = {};
  for (const c of creatives) {
    if (c.persona && c.dolor) {
      const k = `${c.persona}\u0000${c.dolor}\u0000${c.angulo ?? ''}`;
      conteo.set(k, (conteo.get(k) ?? 0) + 1);
    }
    for (const d of c.derivadas) derivadas[d] = (derivadas[d] ?? 0) + 1;
  }

  const celdas: CoverageCell[] = [];
  for (const persona of personas) {
    for (const dolor of dolores) {
      for (const angulo of angulos) {
        celdas.push({
          persona,
          dolor,
          angulo,
          count: conteo.get(`${persona}\u0000${dolor}\u0000${angulo}`) ?? 0,
        });
      }
    }
  }

  return { personas, angulos, celdas, derivadas, total: creatives.length };
}
