// AGRUPAR FECHAS POR PERÍODO.
//
// La misma lista de piezas contesta preguntas distintas según cómo se corte: por
// semana se ve el ritmo de trabajo, por mes la dieta, por trimestre si una racha
// mala fue una racha o una tendencia.
//
// SIN DEPENDENCIAS Y EN UTC. Las fechas del vault son `AAAA-MM-DD` sin hora: si
// se parsean en la zona local, un `2026-01-01` en UTC-3 se vuelve el 31 de
// diciembre y cae en el año anterior. Es el bug clásico de agrupar por fecha, y
// se evita parseando todo con la `Z` puesta.

export type Granularidad = 'semana' | 'mes' | 'trimestre' | 'año';

// "Por trimestre" se leía como "mostrame UN trimestre", y esto AGRUPA: parte
// todo el historial en trimestres y dibuja uno por barra. Elegir cuál es el rango
// de fechas, que tiene su propio atajo de calendario.
export const GRANULARIDADES: { value: Granularidad; label: string }[] = [
  { value: 'semana', label: 'Agrupar: semana' },
  { value: 'mes', label: 'Agrupar: mes' },
  { value: 'trimestre', label: 'Agrupar: trimestre' },
  { value: 'año', label: 'Agrupar: año' },
];

/**
 * Cuántos MESES cubre un período, para escalar la dieta declarada.
 *
 * La dieta es mensual, así que a trimestre y a año se multiplica exacto. A
 * SEMANA devuelve `null`, y eso es una decisión: una semana no es una fracción
 * limpia de un mes —son 4,33— así que un objetivo semanal sería un número
 * inventado con dos decimales. La vista no dibuja la banda en ese corte y lo
 * dice, en vez de mostrar una meta que nadie declaró.
 */
export function mesesDe(g: Granularidad): number | null {
  switch (g) {
    case 'mes':
      return 1;
    case 'trimestre':
      return 3;
    case 'año':
      return 12;
    case 'semana':
      return null;
  }
}

/** La semana ISO de una fecha: `2026-S03`. Semanas de lunes a domingo. */
function semanaISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  // Al jueves de esa semana. La regla ISO es que el año de una semana es el del
  // jueves que contiene — por eso el 2026-01-01 puede caer en la semana 53 de
  // 2025, y contarlo como semana 1 de 2026 movería una pieza de año.
  const dia = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dia + 3);
  const jueves = d.getTime();
  const año = d.getUTCFullYear();

  // El primer jueves del año es, por definición, el de la semana 1.
  const primero = new Date(Date.UTC(año, 0, 4));
  const diaPrimero = (primero.getUTCDay() + 6) % 7;
  primero.setUTCDate(primero.getUTCDate() - diaPrimero + 3);

  const semana = 1 + Math.round((jueves - primero.getTime()) / (7 * 86_400_000));
  return `${año}-S${String(semana).padStart(2, '0')}`;
}

/**
 * La clave del período al que pertenece una fecha `AAAA-MM-DD`.
 *
 * Las claves ordenan alfabéticamente igual que cronológicamente, a propósito:
 * así el gráfico se ordena con un `localeCompare` y no con un parseo por bucket.
 */
export function bucketDe(iso: string, g: Granularidad): string {
  switch (g) {
    case 'año':
      return iso.slice(0, 4);
    case 'trimestre': {
      const mes = Number(iso.slice(5, 7));
      return `${iso.slice(0, 4)}-T${Math.floor((mes - 1) / 3) + 1}`;
    }
    case 'semana':
      return semanaISO(iso);
    case 'mes':
    default:
      return iso.slice(0, 7);
  }
}

/** Qué período contiene HOY, para poder marcarlo como incompleto. */
export function bucketActual(g: Granularidad, hoy: string): string {
  return bucketDe(hoy, g);
}
