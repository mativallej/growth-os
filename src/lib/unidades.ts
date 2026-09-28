
// ORGÁNICO Y ADS EN LA MISMA VISTA, SIN MEZCLARLOS.
//
// El framework del vault los separa por todo, y `ads-model` lo fijó: un creativo
// no tiene fórmula, y rankearlo por alcance es rankearlo por cuánto se gastó.
// Meterlos en una lista común los volvería comparables, que es justo lo que no
// son.
//
// Lo que sí comparten es que se listan, se filtran y se buscan. Por eso hay una
// fila común con lo que las dos cosas tienen —título, red, estado, fecha— y un
// bloque propio por tipo, que la vista muestra en columnas distintas. El filtro
// de materia CAMBIA EL CONJUNTO, no filtra uno mezclado.
//
// ESTE MÓDULO NO PUEDE IMPORTAR NADA QUE LEA DISCO. Lo consumen componentes de
// cliente, y la cadena `unidades → formulas → node:fs` volteaba el build entero
// con un error de Turbopack que no nombraba la causa. Los constructores
// —`dePieza`, `deCreativo`— viven en `unidades-server.ts`.

import type { Nivel } from './viralidad';

export type Materia = 'organico' | 'ads';

/** Un corte de métricas, listo para dibujar. Todo string: ya pasó por `num`/`pct`. */
export type Corte = {
  /** El horizonte: `+1h`, `+24h`, `+7d`. Libre, el vault no usa una escalera fija. */
  t: string;
  fecha: string;
  /** La cuenta, cuando el corte la declara. Una pieza cross-posteada tiene varias. */
  cuenta: string;
  alcance: string;
  engagements: string;
  engRate: string;
  likes: string;
  guardados: string;
  follows: string;
};

export type Unidad = {
  tipo: Materia;
  /**
   * La llave de identidad de la fila, y es lo que guardan los favoritos.
   *
   * Es el `id` del footer cuando existe, y el slug como respaldo. La diferencia
   * importa justo para los favoritos: el slug sale de la ruta, así que mover un
   * .md de carpeta le cambia el slug y el favorito se perdería en silencio. El
   * `id` sobrevive a la mudanza — es para lo que se hizo el backfill.
   */
  llave: string;
  title: string;
  href: string;
  canal: string;

  /**
   * LA CARPETA QUE LA CONTIENE, que es la campaña.
   *
   * El vault ya organiza así y el inventario no lo veía: las piezas de una misma
   * carpeta son la misma tanda —los reels de un lanzamiento, los carruseles de
   * una serie— y se publican juntas. Comparar dos de ellas dice algo; comparar
   * dos piezas de carpetas distintas es comparar temas distintos.
   *
   * Es la ruta completa y no solo el último tramo, porque dos campañas de redes
   * distintas pueden llamarse igual (`A - Storytelling de tercero` existe en
   * Story y en Carrusel). El nombre corto se saca para mostrar; la llave de
   * agrupación tiene que ser única.
   *
   * `variantes.ts` ya usaba esta noción para el detalle de una pieza. Acá es la
   * misma carpeta, un nivel más arriba: allá compara el MISMO post contado de
   * dos formas, acá agrupa la tanda entera.
   */
  carpeta: string;
  publishedAt: string;
  search: string;

  // --- Solo orgánico. Un creativo no tiene ninguno de estos. ---
  formulaCode: string;
  coverage: string;
  cortes: number;
  estado: string;
  status: string;
  alcance: number | null;
  /** En qué nivel de viralidad cae, según los umbrales declarados por canal. */
  nivel: Nivel;
  engagements: number | null;
  bookmarks: number | null;
  likes: number | null;
  follows: number | null;

  // --- Lo que la vista de métricas muestra, ya formateado en el servidor. ---
  // Se formatea allá y no acá porque `num`/`pct` deciden qué se ve cuando el dato
  // FALTA, y esa decisión —una raya, nunca un cero— es la que distingue "no se
  // midió" de "midió cero". Repetirla en cada vista es repetir el lugar donde se
  // puede equivocar.
  /** Nombre largo de la fórmula, del catálogo. Para el `title` del código. */
  formula: string;
  cuenta: string;
  verdict: string;
  /** Sparkline ya renderizado. `null` con menos de dos cortes: un punto no es una serie. */
  sparkHtml: string | null;

  /**
   * LOS CORTES, uno por uno, ya formateados.
   *
   * La columna decía `4` y no había forma de ver cuáles cuatro sin abrir la
   * pieza. El número solo no deja comparar dos mediciones de la misma pieza, que
   * es para lo que se toman cortes: `+1h` contra `+24h` contra `+7d`.
   *
   * Formateados acá por lo mismo que el resto: `num` y `pct` deciden qué se ve
   * cuando el dato FALTA —una raya, nunca un cero— y esa decisión se toma en un
   * solo lugar. Un `0` y un `—` en esta tabla significan cosas distintas.
   */
  cortesDetalle: Corte[];
  alcanceFmt: string;
  engRate: string;
  saveLike: string;
  followsFmt: string;

  /**
   * Los enlaces EXTERNOS de la fila, y son dos cosas distintas.
   *
   * `url` es dónde se publicó —la llave del ingest y de la atribución— y
   * `driveUrl` dónde está el archivo con el que se publicó. Vacíos cuando el
   * .md no los declara: la vista no dibuja un enlace que no lleva a ningún lado.
   */
  url: string;
  driveUrl: string;

  // --- Solo ads. Una pieza no tiene ninguno de estos. ---
  persona: string;
  publico: string;
  dolor: string;
  angulo: string;
  ronda: string;
  formato: string;
  /** Dimensiones que se dedujeron de la ruta en vez de declararse. */
  derivadas: string;
};


/** Opciones de un campo, con su conteo, para alimentar un filtro por faceta. */
export function facetas(filas: Unidad[], campo: keyof Unidad) {
  const m = new Map<string, number>();
  for (const f of filas) {
    const v = f[campo];
    if (typeof v === 'string' && v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
}
