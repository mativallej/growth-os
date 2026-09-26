import type { Piece } from './types';
import { primaryReach, latest } from './metrics';

// VARIANTES DE UNA MISMA PIEZA.
//
// El vault ya las escribe, y el modelo no las veía. Medido el 2026-09-26 en
// `Instagram/E - Origin story/carousel-001-origin-story-mi-historia-del-futbol/`:
//
//   carousel-001-origin-story-mi-historia-del-futbol   ← la carpeta se llama como esta
//   carousel-002-camino-del-guerrero-la-soledad
//   carousel-002b-camino-del-guerrero-fiel-al-tweet    ← variante de la 002
//   carousel-002c-camino-del-guerrero-foto-narrativo   ← otra variante de la 002
//   carousel-003-el-margen-fino
//   reel-003-origin-story-mi-historia-del-futbol       ← gemelo cross-format
//
// Dos agrupaciones distintas conviven ahí, y confundirlas arruina las dos:
//
//   GRUPO     la carpeta entera — una serie o campaña. Sus piezas son distintas
//             entre sí y se publican por separado.
//   VARIANTE  `002`, `002b` y `002c` — el MISMO post intentado de tres formas.
//             Compiten: idealmente se publica una, y comparar sus números es
//             comparar las formas, no el contenido.
//
// La comparación que importa es la segunda. Comparar dos piezas distintas de una
// serie no dice nada: son temas distintos. Comparar 002 contra 002b sí, porque
// la única diferencia es cómo se contó.

export type Variante = {
  /** `002` — lo que comparten las que compiten entre sí. */
  base: string;
  /** `` para la original, `b`, `c`… para las alternativas. */
  sufijo: string;
  piece: Piece;
};

export type GrupoVariantes = {
  /** La clave del grupo: prefijo + número. `carousel-002`. */
  clave: string;
  variantes: Variante[];
};

export type Grupo = {
  /** La carpeta que las contiene. */
  carpeta: string;
  /** Nombre legible del grupo — el de la carpeta. */
  nombre: string;
  piezas: Piece[];
  /** Solo los conjuntos con MÁS DE UNA variante: los que se pueden comparar. */
  comparables: GrupoVariantes[];
};

/**
 * `carousel-002b-camino-del-guerrero` → base `carousel-002`, sufijo `b`.
 *
 * El sufijo es UNA letra pegada al número. No se acepta cualquier cosa después
 * del número, porque `tweet-022-thread-recap` tiene un guión y no es una
 * variante de `tweet-022`: es el mismo post.
 */
export function partirVariante(titulo: string): { base: string; sufijo: string } | null {
  // El número es de 1 a 3 dígitos, y lo que sigue NO puede ser otro número:
  // `carousel-2026-01-01-…` es una fecha, no la pieza 2026 con variantes. El
  // vault personal tiene 10 archivos retroactivos con ese nombre, y sin este
  // corte los diez entraban como variantes de una misma pieza inexistente.
  const m = titulo.match(/^(.*?[-_](\d{1,3}))([a-z])?(?=[-_]|$)/i);
  if (!m) return null;
  const resto = titulo.slice(m[0].length);
  if (/^[-_]\d/.test(resto)) return null;
  return { base: m[1].toLowerCase(), sufijo: (m[3] ?? '').toLowerCase() };
}

function carpetaDe(p: Piece): string {
  const segs = p.relPath.split(/[\\/]/);
  return segs.slice(0, -1).join('/');
}

/**
 * Agrupa las piezas por carpeta y, dentro, por conjunto de variantes.
 *
 * Solo devuelve carpetas con más de una pieza: una carpeta con una sola no es
 * un grupo, es una pieza que vive en su carpeta.
 */
export function agruparVariantes(pieces: Piece[]): Grupo[] {
  const porCarpeta = new Map<string, Piece[]>();
  for (const p of pieces) {
    const c = carpetaDe(p);
    porCarpeta.set(c, [...(porCarpeta.get(c) ?? []), p]);
  }

  const grupos: Grupo[] = [];
  for (const [carpeta, piezas] of porCarpeta) {
    if (piezas.length < 2) continue;

    const porBase = new Map<string, Variante[]>();
    for (const p of piezas) {
      const v = partirVariante(p.title);
      if (!v) continue;
      porBase.set(v.base, [...(porBase.get(v.base) ?? []), { ...v, piece: p }]);
    }

    const comparables = [...porBase.entries()]
      .filter(([, vs]) => vs.length > 1)
      .map(([clave, vs]) => ({
        clave,
        // La original primero, después b, c…
        variantes: vs.sort((a, b) => a.sufijo.localeCompare(b.sufijo)),
      }))
      .sort((a, b) => a.clave.localeCompare(b.clave));

    grupos.push({
      carpeta,
      nombre: carpeta.split('/').pop() ?? carpeta,
      piezas: [...piezas].sort((a, b) => a.title.localeCompare(b.title)),
      comparables,
    });
  }

  return grupos.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Las variantes de UNA pieza, dentro de su carpeta. Vacío si no compite con nadie. */
export function variantesDe(piece: Piece, pieces: Piece[]): Variante[] {
  const v = partirVariante(piece.title);
  if (!v) return [];
  const carpeta = carpetaDe(piece);
  const hermanas = pieces
    .filter((p) => carpetaDe(p) === carpeta)
    .map((p) => ({ p, v: partirVariante(p.title) }))
    .filter((x) => x.v && x.v.base === v.base)
    .map((x) => ({ base: x.v!.base, sufijo: x.v!.sufijo, piece: x.p }));
  return hermanas.length > 1
    ? hermanas.sort((a, b) => a.sufijo.localeCompare(b.sufijo))
    : [];
}

export type ComparacionVariante = {
  variante: Variante;
  alcance: number | null;
  engagements: number | null;
  bookmarks: number | null;
  follows: number | null;
  /** true si es la de mayor alcance MEDIDO del conjunto. `false` si nadie midió. */
  gana: boolean;
};

/**
 * Compara las variantes de un conjunto.
 *
 * `gana` se decide por alcance primario y SOLO entre las medidas: una variante
 * sin números no pierde, simplemente no compite todavía. Marcarla como perdedora
 * sería leer "no medido" como "midió poco", que es el error que la regla dura 5
 * existe para no cometer.
 */
export function compararVariantes(variantes: Variante[]): ComparacionVariante[] {
  const filas = variantes.map((v) => {
    const l = latest(v.piece);
    return {
      variante: v,
      alcance: primaryReach(v.piece),
      engagements: l?.engagements ?? null,
      bookmarks: l?.bookmarks ?? null,
      follows: l?.follows ?? null,
      gana: false,
    };
  });

  const medidas = filas.filter((f) => f.alcance !== null);
  if (medidas.length > 1) {
    const mejor = medidas.reduce((a, b) => ((b.alcance ?? 0) > (a.alcance ?? 0) ? b : a));
    mejor.gana = true;
  }
  return filas;
}
