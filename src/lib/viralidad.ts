// QUÉ CUENTA COMO VIRAL, Y POR QUÉ ES UNA DECLARACIÓN Y NO UN CÁLCULO.
//
// El umbral va POR CANAL porque las distribuciones no se parecen: en el corpus
// medido de Tegu el p90 de X es 79.608 y el de Instagram 11.061 — siete veces. Un
// umbral único llamaría viral a media Twitter y a casi nada de Instagram, y la
// palabra dejaría de significar algo.
//
// Y ES POR ALCANCE Y NO POR ENGAGEMENT. No por preferencia: el eng-rate es
// computable en CERO piezas del corpus, porque el contrato del footer no escribe
// los dos campos que hacen falta en la misma pieza. Un filtro de viralidad por
// engagement estaría siempre vacío, y un filtro que nunca devuelve nada se lee
// como que no hay piezas virales.
//
// ESTE MÓDULO NO LEE DISCO: lo consumen componentes de cliente. El cargador vive
// en `viralidad-server.ts`, por la misma razón que `unidades` / `unidades-server`.

export type Umbral = {
  /** Desde dónde se destaca sobre la base de su canal. Opcional. */
  destacado?: number;
  /** Desde dónde es un outlier. */
  viral: number;
};

/** Por canal normalizado. Un canal ausente NO tiene umbral. */
export type Umbrales = Record<string, Umbral>;

export type Nivel = 'viral' | 'destacado' | 'normal' | 'sin-umbral' | 'sin-medir';

/**
 * En qué nivel cae una pieza.
 *
 * Los dos niveles que NO son juicios sobre la pieza importan tanto como los otros
 * tres, y por eso son valores y no `null`:
 *
 *   `sin-medir`   la pieza no tiene alcance. No se puede decir nada de ella.
 *   `sin-umbral`  el canal no declara umbral. Tampoco.
 *
 * Decir "no viral" en cualquiera de los dos casos sería afirmar algo que no se
 * sabe — es la regla dura de no inferir sin señal. Un post de blog no es "no
 * viral": es que ningún post de blog se midió nunca.
 *
 * El orden importa: `sin-medir` primero, porque es un hecho de la pieza y vale
 * aunque después se declare el umbral del canal.
 */
export function nivelDe(alcance: number | null, canal: string, umbrales: Umbrales): Nivel {
  if (alcance === null) return 'sin-medir';
  const u = umbrales[canal];
  if (!u) return 'sin-umbral';
  if (alcance >= u.viral) return 'viral';
  if (u.destacado !== undefined && alcance >= u.destacado) return 'destacado';
  return 'normal';
}

export const NIVELES: { value: Nivel; label: string }[] = [
  { value: 'viral', label: 'Virales' },
  { value: 'destacado', label: 'Destacadas' },
  { value: 'normal', label: 'En la base' },
  { value: 'sin-medir', label: 'Sin medir' },
  { value: 'sin-umbral', label: 'Sin umbral' },
];

/** Para poder decir en la vista con qué criterio se está filtrando. */
export function describir(umbrales: Umbrales): string {
  const partes = Object.entries(umbrales)
    .sort()
    .map(([canal, u]) => `${canal} ≥ ${u.viral.toLocaleString('es-AR')}`);
  return partes.length ? partes.join(' · ') : 'ningún canal declara umbral';
}
